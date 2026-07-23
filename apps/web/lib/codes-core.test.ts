import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";
import {
  createDynamicCodeCore,
  getCodeAnalyticsCore,
  getCodeBySlugCore,
  getDynamicCodeStyleCore,
  listDynamicCodesCore,
  retargetCodeCore,
  setCodePausedCore,
  type CodesCoreCtx,
} from "./codes-core";
import type { RangeDays } from "./analytics";

// Hand-rolled chain-mock Supabase client, mirroring apps/web/lib/purge.test.ts's
// style but generalized with a `.then()` on every builder (real supabase-js
// query builders are themselves thenable at any point in the chain) so it
// doesn't matter which method codes-core.ts happens to call last —
// `.single()`, `.order()`, `.limit()`, `.neq()`, whatever — awaiting the
// chain always resolves to the result queued for that `.from()` call.
//
// Each `.from(table)` call consumes the next entry in `plan`, in order —
// this mirrors the exact sequence of queries the function under test makes,
// which is exactly what the load-bearing-owner-filter assertions below need
// to inspect (`builders[i].calls.eq` etc.).

vi.mock("./kv-sync", () => ({
  writeSlugToKv: vi.fn(),
}));
import { writeSlugToKv } from "./kv-sync";
const writeSlugToKvMock = vi.mocked(writeSlugToKv);

type Calls = Record<string, unknown[][]>;

function makeBuilder(result: unknown) {
  const calls: Calls = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return builder;
    };

  const builder = {
    select: vi.fn(record("select")),
    insert: vi.fn(record("insert")),
    update: vi.fn(record("update")),
    eq: vi.fn(record("eq")),
    neq: vi.fn(record("neq")),
    gte: vi.fn(record("gte")),
    lt: vi.fn(record("lt")),
    order: vi.fn(record("order")),
    limit: vi.fn(record("limit")),
    single: vi.fn(record("single")),
    then(
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return { builder, calls };
}

function createDb(plan: { table: string; result: unknown }[]) {
  const fromCalls: string[] = [];
  const builders: ReturnType<typeof makeBuilder>[] = [];
  let i = 0;

  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const entry = plan[i];
    if (!entry) {
      throw new Error(`unexpected .from("${table}") call — plan exhausted`);
    }
    if (entry.table !== table) {
      throw new Error(`expected .from("${entry.table}") but got .from("${table}")`);
    }
    const b = makeBuilder(entry.result);
    builders.push(b);
    i++;
    return b.builder;
  });

  return { db: { from } as unknown as SupabaseClient<Database>, from, fromCalls, builders };
}

const OWNER_ID = "owner-abc-123";

function ctxWith(db: SupabaseClient<Database>): CodesCoreCtx {
  return { db, ownerId: OWNER_ID };
}

/** Every `.eq()` call the builder recorded, as [column, value] pairs. */
function eqCallsOf(b: ReturnType<typeof makeBuilder>): unknown[][] {
  return b.calls.eq ?? [];
}

describe("createDynamicCodeCore — owner scoping", () => {
  it("filters the plan/limit count query by owner_id and stamps owner_id on the insert payload", async () => {
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "qr_codes", result: { count: 0, error: null } },
      {
        table: "qr_codes",
        result: {
          data: { id: "code-1", slug: "ABCD234", owner_id: OWNER_ID },
          error: null,
        },
      },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result.ok).toBe(true);
    // builders[1] = the count check
    expect(eqCallsOf(builders[1]!)).toContainEqual(["owner_id", OWNER_ID]);
    // builders[2] = the insert
    expect(builders[2]!.calls.insert![0]![0]).toMatchObject({ owner_id: OWNER_ID });
  });

  it("refuses to insert once the plan's dynamic-code limit is reached", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: { plan: "free" }, error: null } },
      { table: "qr_codes", result: { count: 3, error: null } }, // free limit is 3
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: false, error: "code_limit" });
    // Only profiles + the count check — no insert attempt.
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("retries once on a slug collision (23505) and returns the second attempt's row", async () => {
    const { db } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "qr_codes", result: { count: 0, error: null } },
      { table: "qr_codes", result: { data: null, error: { code: "23505" } } },
      {
        table: "qr_codes",
        result: { data: { id: "code-2", slug: "EFGH567" }, error: null },
      },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: true, data: { id: "code-2", slug: "EFGH567" } });
  });

  it("returns profile_not_found and never queries the code count when the profile lookup fails", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: false, error: "profile_not_found" });
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe("listDynamicCodesCore — owner scoping", () => {
  it("filters by owner_id", async () => {
    const { db, builders } = createDb([{ table: "qr_codes", result: { data: [], error: null } }]);

    const result = await listDynamicCodesCore(ctxWith(db));

    expect(result).toEqual({ ok: true, data: [] });
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns list_failed on a query error", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "boom" } } },
    ]);

    const result = await listDynamicCodesCore(ctxWith(db));

    expect(result).toEqual({ ok: false, error: "list_failed" });
  });
});

describe("getDynamicCodeStyleCore — owner scoping", () => {
  it("filters by owner_id and parses the frozen style snapshot", async () => {
    const { db, builders } = createDb([
      { table: "qr_codes", result: { data: { style: { v: 1 } }, error: null } },
    ]);

    const result = await getDynamicCodeStyleCore(ctxWith(db), "code-1");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns not_found when the row doesn't exist (or isn't the caller's)", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getDynamicCodeStyleCore(ctxWith(db), "code-1");

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("retargetCodeCore — owner scoping and KV propagation", () => {
  it("filters the update by owner_id", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: { slug: "ABCD234", destination_url: "https://new.example.com", status: "active" },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("propagates kvSynced: true from writeSlugToKv without failing the action", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: { slug: "ABCD234", destination_url: "https://new.example.com", status: "active" },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result).toEqual({
      ok: true,
      data: { id: "code-1", destinationUrl: "https://new.example.com", kvSynced: true },
    });
  });

  it("propagates kvSynced: false from writeSlugToKv without failing the action", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: false, reason: "kv_unconfigured" });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: { slug: "ABCD234", destination_url: "https://new.example.com", status: "active" },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kvSynced).toBe(false);
    }
  });
});

describe("setCodePausedCore — owner scoping and KV propagation", () => {
  it("filters the update by owner_id and propagates kvSynced", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: { slug: "ABCD234", destination_url: "https://example.com", status: "paused" },
          error: null,
        },
      },
    ]);

    const result = await setCodePausedCore(ctxWith(db), "code-1", true);

    expect(result).toEqual({
      ok: true,
      data: { id: "code-1", status: "paused", kvSynced: true },
    });
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns update_failed when the row doesn't exist (or isn't the caller's)", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await setCodePausedCore(ctxWith(db), "code-1", false);

    expect(result).toEqual({ ok: false, error: "update_failed" });
  });
});

describe("getCodeBySlugCore — owner scoping", () => {
  it("filters by owner_id", async () => {
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            id: "code-1",
            slug: "ABCD234",
            name: "Menu",
            destination_url: "https://example.com",
            status: "active",
            scan_count: 0,
            created_at: "2026-07-01T00:00:00.000Z",
          },
          error: null,
        },
      },
    ]);

    const result = await getCodeBySlugCore(ctxWith(db), "ABCD234");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns not_found when no row matches", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getCodeBySlugCore(ctxWith(db), "ABCD234");

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

const CODE_ROW = {
  id: "code-1",
  slug: "ABCD234",
  name: "Menu",
  destination_url: "https://example.com",
  status: "active",
  scan_count: 12,
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("getCodeAnalyticsCore — IDOR guard and owner scoping", () => {
  it("short-circuits on not_found and never queries a scan table", async () => {
    const { db, fromCalls } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(fromCalls).toEqual(["qr_codes"]);
  });

  it("owner-scopes the ownership-gate lookup before ever reaching a scan table", async () => {
    const { db, builders } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: [], error: null } },
      { table: "scan_events", result: { count: 0, error: null } },
      { table: "scan_events", result: { data: [], error: null } },
    ]);

    await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("shapes an empty range into a zero-filled series with empty totals and buckets", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: [], error: null } },
      { table: "scan_events", result: { count: 0, error: null } },
      { table: "scan_events", result: { data: [], error: null } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.series).toHaveLength(7);
      expect(result.data.series.every((p) => p.scans === 0 && p.uniques === 0)).toBe(true);
      expect(result.data.totals).toEqual({ scans: 0 });
      expect(result.data.today).toEqual({ scans: 0 });
      expect(result.data.topCountries).toEqual([]);
      expect(result.data.topDevices).toEqual([]);
      expect(result.data.recentEvents).toEqual([]);
    }
  });

  it("sums scan_daily rows, reports today's live count, and buckets countries/devices", async () => {
    const dailyRows = [
      { day: "2026-07-01", scans: 3, uniques: 2, by_country: { US: 3 }, by_device: { mobile: 3 } },
      { day: "2026-07-02", scans: 5, uniques: 4, by_country: { US: 2, CA: 3 }, by_device: { desktop: 5 } },
    ];
    const recentEvent = {
      ts: "2026-07-02T10:00:00.000Z",
      country: "US",
      region: null,
      city: null,
      device: "mobile",
      referer: null,
    };
    const { db } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: dailyRows, error: null } },
      { table: "scan_events", result: { count: 4, error: null } },
      { table: "scan_events", result: { data: [recentEvent], error: null } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.code).toEqual(CODE_ROW);
      expect(result.data.totals).toEqual({ scans: 8 });
      expect(result.data.today).toEqual({ scans: 4 });
      expect(result.data.topCountries).toEqual(
        expect.arrayContaining([
          { key: "US", count: 5 },
          { key: "CA", count: 3 },
        ]),
      );
      expect(result.data.topDevices).toEqual(
        expect.arrayContaining([
          { key: "mobile", count: 3 },
          { key: "desktop", count: 5 },
        ]),
      );
      expect(result.data.recentEvents).toEqual([recentEvent]);
    }
  });
});
