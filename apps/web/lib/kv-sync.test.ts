import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KvSlugRecord } from "@qrcdn/shared";
import { writeSlugToKv } from "./kv-sync";

const RECORD: KvSlugRecord = { destination: "https://example.com/landing", paused: false };

function stubConfiguredEnv() {
  vi.stubEnv("KV_SYNC_SECRET", "shared_secret");
}

beforeEach(() => {
  vi.stubEnv("KV_SYNC_SECRET", undefined);
  vi.stubEnv("KV_SYNC_URL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("writeSlugToKv — no-op path", () => {
  it("never calls fetch and returns kv_unconfigured when the secret is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: false, reason: "kv_unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a KV_SYNC_URL alone (no secret) is still a no-op", async () => {
    vi.stubEnv("KV_SYNC_URL", "https://staging.example");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: false, reason: "kv_unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("writeSlugToKv — URL construction", () => {
  it("PUTs to the Worker's first-party sync endpoint with the shared-secret header and JSON record", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://qrcdn.com/__kv-sync/ABCD234");
    expect(init).toMatchObject({
      method: "PUT",
      headers: {
        "x-sync-secret": "shared_secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(RECORD),
    });
  });

  it("honors KV_SYNC_URL as the base override", async () => {
    stubConfiguredEnv();
    vi.stubEnv("KV_SYNC_URL", "https://staging.qrcdn.dev");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await writeSlugToKv("ABCD234", RECORD);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://staging.qrcdn.dev/__kv-sync/ABCD234");
  });

  it("URL-encodes the slug segment", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await writeSlugToKv("A/B C", RECORD);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(`/__kv-sync/${encodeURIComponent("A/B C")}`);
  });

  it("passes an optional codeId (P5-U2 additive field) straight through in the PUT body", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const withCodeId: KvSlugRecord = { ...RECORD, codeId: "11111111-1111-1111-1111-111111111111" };
    await writeSlugToKv("ABCD234", withCodeId);

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({ body: JSON.stringify(withCodeId) });
  });

  it("omits codeId from the serialized body when the caller doesn't provide one", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await writeSlugToKv("ABCD234", RECORD);

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).not.toHaveProperty("codeId");
  });
});

describe("writeSlugToKv — retry behavior", () => {
  it("retries once on a non-ok response and succeeds if the retry is ok", async () => {
    stubConfiguredEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a thrown network error and succeeds if the retry is ok", async () => {
    stubConfiguredEnv();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry and returns kv_request_failed without throwing", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeSlugToKv("ABCD234", RECORD);

    expect(result).toEqual({ synced: false, reason: "kv_request_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never throws even when fetch rejects on every attempt", async () => {
    stubConfiguredEnv();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(writeSlugToKv("ABCD234", RECORD)).resolves.toEqual({
      synced: false,
      reason: "kv_request_failed",
    });
  });
});
