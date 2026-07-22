import { describe, expect, it, vi } from "vitest";
import { handleKvSync, parseSyncBody, secretsMatch } from "../src/kv-sync-endpoint";
import { decideRoute } from "../src/route";

const VALID_BODY = { destination: "https://example.com/x", paused: false };

function syncRequest(body: unknown, secret?: string): Request {
  return new Request("https://qrcdn.com/__kv-sync/ABCD234", {
    method: "PUT",
    headers: secret ? { "x-sync-secret": secret } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockKv() {
  return { put: vi.fn().mockResolvedValue(undefined) } as unknown as KVNamespace & {
    put: ReturnType<typeof vi.fn>;
  };
}

describe("route: /__kv-sync", () => {
  it("PUT with a slug-shaped remainder routes to kv-sync, uppercased", () => {
    expect(decideRoute("PUT", "/__kv-sync/abcd234", "")).toEqual({
      kind: "kv-sync",
      slugUpper: "ABCD234",
    });
  });

  it("GET on the sync path is method-not-allowed, never a redirect", () => {
    expect(decideRoute("GET", "/__kv-sync/ABCD234", "")).toEqual({
      kind: "method-not-allowed",
    });
  });

  it("PUT with a non-slug remainder is method-not-allowed, not canonicalize", () => {
    expect(decideRoute("PUT", "/__kv-sync/not a slug!", "")).toEqual({
      kind: "method-not-allowed",
    });
  });

  it("the prefix itself can never be a scan (underscores are outside the slug charset)", () => {
    const r = decideRoute("GET", "/__kv-sync", "");
    expect(r.kind).toBe("canonicalize");
  });
});

describe("parseSyncBody", () => {
  it("accepts a minimal valid record", () => {
    expect(parseSyncBody(VALID_BODY)).toEqual(VALID_BODY);
  });

  it("passes codeId through and drops unknown fields", () => {
    const parsed = parseSyncBody({ ...VALID_BODY, codeId: "abc-123", evil: "x" });
    expect(parsed).toEqual({ ...VALID_BODY, codeId: "abc-123" });
  });

  it.each([
    ["null", null],
    ["non-object", "str"],
    ["missing destination", { paused: false }],
    ["non-http destination", { destination: "ftp://x", paused: false }],
    ["javascript scheme", { destination: "javascript:alert(1)", paused: false }],
    ["oversize destination", { destination: `https://x/${"a".repeat(2050)}`, paused: false }],
    ["missing paused", { destination: "https://x.com" }],
    ["string paused", { destination: "https://x.com", paused: "false" }],
  ])("rejects %s", (_label, body) => {
    expect(parseSyncBody(body)).toBeNull();
  });
});

describe("secretsMatch", () => {
  it("matches equal secrets", async () => {
    await expect(secretsMatch("s3cret", "s3cret")).resolves.toBe(true);
  });
  it("rejects different secrets, including different lengths", async () => {
    await expect(secretsMatch("s3cret", "s3cret2")).resolves.toBe(false);
    await expect(secretsMatch("", "s3cret")).resolves.toBe(false);
  });
});

describe("handleKvSync", () => {
  it("404s when the endpoint is unconfigured (no SYNC_SECRET)", async () => {
    const kv = mockKv();
    const res = await handleKvSync(syncRequest(VALID_BODY, "any"), kv, undefined, "ABCD234");
    expect(res.status).toBe(404);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("401s on a missing or wrong secret", async () => {
    const kv = mockKv();
    expect((await handleKvSync(syncRequest(VALID_BODY), kv, "right", "ABCD234")).status).toBe(401);
    expect(
      (await handleKvSync(syncRequest(VALID_BODY, "wrong"), kv, "right", "ABCD234")).status,
    ).toBe(401);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("400s on unparseable or invalid bodies", async () => {
    const kv = mockKv();
    expect((await handleKvSync(syncRequest("{not json", "s"), kv, "s", "ABCD234")).status).toBe(
      400,
    );
    expect(
      (await handleKvSync(syncRequest({ paused: true }, "s"), kv, "s", "ABCD234")).status,
    ).toBe(400);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("writes the record with the 5-minute TTL and returns 204", async () => {
    const kv = mockKv();
    const res = await handleKvSync(
      syncRequest({ ...VALID_BODY, codeId: "id-1" }, "s"),
      kv,
      "s",
      "ABCD234",
    );
    expect(res.status).toBe(204);
    expect(kv.put).toHaveBeenCalledWith(
      "ABCD234",
      JSON.stringify({ ...VALID_BODY, codeId: "id-1" }),
      { expirationTtl: 300 },
    );
  });
});
