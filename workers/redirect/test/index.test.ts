import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

// Thin-shell integration test: no miniflare/@cloudflare/vitest-pool-workers
// needed — a plain object satisfying the KVNamespace/ExecutionContext shapes
// this handler actually calls is enough, since Response/Request/URL are
// standard Fetch API globals available under Node 22. Every branch below is
// already covered at the pure-function level (route.test.ts,
// redirect-decision.test.ts, responses.test.ts, etc.) — this file exists to
// prove the wiring in index.ts calls them correctly and in the right order.

function fakeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const puts: Array<{ key: string; value: unknown }> = [];
  return {
    kv: {
      async get(key: string) {
        const raw = store.get(key);
        return raw === undefined ? null : JSON.parse(raw);
      },
      async put(key: string, value: string) {
        store.set(key, value);
        puts.push({ key, value: JSON.parse(value) });
      },
    } as unknown as KVNamespace,
    puts,
  };
}

function fakeCtx() {
  const tasks: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        tasks.push(promise);
      },
    } as unknown as ExecutionContext,
    async flush() {
      await Promise.all(tasks);
    },
  };
}

function makeEnv(kv: KVNamespace): Env {
  return {
    KV: kv,
    SUPABASE_URL: "https://proj.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_x",
    SCAN_SALT: "test-salt",
  };
}

// Explicit generic args so this matches exactly what the fetch handler
// expects (Request<unknown, IncomingRequestCfProperties<unknown>>) — the
// bare `new Request(...)` constructor otherwise defaults its `Cf` type
// param to the wider `CfProperties<unknown>` union (which also covers the
// outbound RequestInit shape and doesn't structurally satisfy the inbound
// handler's narrower expectation).
function request(
  path: string,
  init?: { method?: string },
): Request<unknown, IncomingRequestCfProperties<unknown>> {
  return new Request<unknown, IncomingRequestCfProperties<unknown>>(`https://qrcdn.com${path}`, {
    headers: { "CF-Connecting-IP": "203.0.113.5", "User-Agent": "Mozilla/5.0 (real browser)" },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetch handler — KV hit", () => {
  it("redirects to the destination (302, no-store) and fires scan ingest, without touching Supabase for the lookup", async () => {
    const { kv } = fakeKv({ K7M2X9A: { destination: "https://example.com", paused: false, codeId: "code-1" } });
    const { ctx, flush } = fakeCtx();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(request("/k7m2x9a"), makeEnv(kv), ctx);
    await flush();

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBe("https://example.com");
    // No REST lookup call (KV was a hit) — the only fetch call is the
    // fire-and-forget scan_events POST.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/scan_events");
  });

  it("redirects a paused KV record to the unclaimed page, still 302 no-store", async () => {
    const { kv } = fakeKv({ K7M2X9A: { destination: "https://example.com", paused: true, codeId: "code-1" } });
    const { ctx, flush } = fakeCtx();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const response = await worker.fetch(request("/K7M2X9A"), makeEnv(kv), ctx);
    await flush();

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/u/K7M2X9A");
  });
});

describe("fetch handler — KV miss", () => {
  it("reads through to Supabase REST, backfills KV, and redirects to the destination for an active row", async () => {
    const { kv, puts } = fakeKv();
    const { ctx, flush } = fakeCtx();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/qr_codes")) {
        return { ok: true, json: async () => [{ id: "code-9", destination_url: "https://dest.example", status: "active" }] };
      }
      return { ok: true };
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(request("/NEWCODE1"), makeEnv(kv), ctx);
    await flush();

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://dest.example");
    expect(puts).toEqual([
      { key: "NEWCODE1", value: { destination: "https://dest.example", paused: false, codeId: "code-9" } },
    ]);
    // One REST lookup + one scan_events POST.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("degrades to the unclaimed page (still alive) when Supabase is unreachable, and never attempts ingest", async () => {
    const { kv, puts } = fakeKv();
    const { ctx, flush } = fakeCtx();
    const fetchMock = vi.fn().mockRejectedValue(new Error("supabase is down"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(request("/UNKNOWN1"), makeEnv(kv), ctx);
    await flush();

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/u/UNKNOWN1");
    expect(puts).toEqual([]);
    // No codeId resolved → ingest never fires → only the one failed lookup call.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to the unclaimed page for a genuinely nonexistent slug (REST 200, empty array)", async () => {
    const { kv } = fakeKv();
    const { ctx, flush } = fakeCtx();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    const response = await worker.fetch(request("/NOPE0000"), makeEnv(kv), ctx);
    await flush();

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/u/NOPE0000");
  });
});

describe("fetch handler — non-slug routing", () => {
  it("301s the root path to www", async () => {
    const { kv } = fakeKv();
    const { ctx } = fakeCtx();
    const response = await worker.fetch(request("/"), makeEnv(kv), ctx);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/");
  });

  it("serves robots.txt directly as a 200 disallow-all", async () => {
    const { kv } = fakeKv();
    const { ctx } = fakeCtx();
    const response = await worker.fetch(request("/robots.txt"), makeEnv(kv), ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("405s a non-GET/HEAD method", async () => {
    const { kv } = fakeKv();
    const { ctx } = fakeCtx();
    const response = await worker.fetch(request("/K7M2X9A", { method: "POST" }), makeEnv(kv), ctx);
    expect(response.status).toBe(405);
  });
});
