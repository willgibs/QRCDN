import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupSlugInSupabase, postScanEvent, type SupabaseRestEnv } from "../src/supabase";

const ENV: SupabaseRestEnv = { supabaseUrl: "https://proj.supabase.co", secretKey: "sb_secret_x" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupSlugInSupabase", () => {
  it("queries the qr_codes REST endpoint with id, destination_url, status selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "code-1", destination_url: "https://example.com", status: "active" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupSlugInSupabase(ENV, "K7M2X9A");

    expect(result).toEqual({
      status: "found",
      row: { id: "code-1", destination_url: "https://example.com", status: "active" },
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://proj.supabase.co/rest/v1/qr_codes?slug=eq.K7M2X9A&select=id,destination_url,status",
    );
    expect(init.headers).toMatchObject({ apikey: "sb_secret_x", Authorization: "Bearer sb_secret_x" });
  });

  it("returns not-found for an empty result array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    expect(await lookupSlugInSupabase(ENV, "NOPE1234")).toEqual({ status: "not-found" });
  });

  it("returns unreachable on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect(await lookupSlugInSupabase(ENV, "K7M2X9A")).toEqual({ status: "unreachable" });
  });

  it("returns unreachable when fetch throws (Supabase down/network error) — never throws itself", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(lookupSlugInSupabase(ENV, "K7M2X9A")).resolves.toEqual({ status: "unreachable" });
  });
});

describe("postScanEvent", () => {
  const PAYLOAD = {
    code_id: "code-1",
    country: "US",
    region: null,
    city: null,
    device: "mobile",
    ip_hash: "\\xdeadbeef",
    referer: null,
  };

  it("POSTs to the scan_events endpoint with secret-key auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postScanEvent(ENV, PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://proj.supabase.co/rest/v1/scan_events");
    expect(init).toMatchObject({
      method: "POST",
      headers: { apikey: "sb_secret_x", Authorization: "Bearer sb_secret_x" },
      body: JSON.stringify(PAYLOAD),
    });
  });

  it("retries exactly once on failure, then drops (D3: <0.5% loss accepted)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postScanEvent(ENV, PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never throws even when every attempt fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await expect(postScanEvent(ENV, PAYLOAD)).resolves.toBeUndefined();
  });

  it("gives up silently after the retry also fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    await postScanEvent(ENV, PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
