import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkUrlSafety } from "./safe-browsing";

beforeEach(() => {
  vi.stubEnv("SAFE_BROWSING_API_KEY", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("checkUrlSafety — no-op path", () => {
  it("never calls fetch and returns unconfigured when the key is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkUrlSafety("https://example.com");

    expect(result).toEqual({ checked: false, reason: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("checkUrlSafety — configured", () => {
  it("POSTs to the v4 threatMatches:find endpoint with the key and url in threatEntries", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await checkUrlSafety("https://example.com/landing");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://safebrowsing.googleapis.com/v4/threatMatches:find?key=test-key");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    const body = JSON.parse(init.body as string);
    expect(body.threatInfo.threatEntries).toEqual([{ url: "https://example.com/landing" }]);
    expect(body.threatInfo.threatTypes).toEqual(["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]);
    expect(body.threatInfo.platformTypes).toEqual(["ANY_PLATFORM"]);
    expect(body.threatInfo.threatEntryTypes).toEqual(["URL"]);
  });

  it("returns safe:true for a clean URL (no matches key in the response body)", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const result = await checkUrlSafety("https://example.com");

    expect(result).toEqual({ checked: true, safe: true });
  });

  it("treats matches: [] (present but empty) as safe too", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ matches: [] }) }),
    );

    const result = await checkUrlSafety("https://example.com");

    expect(result).toEqual({ checked: true, safe: true });
  });

  it("returns safe:false for a URL Google reports a threat match for", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ matches: [{ threatType: "MALWARE" }] }),
      }),
    );

    const result = await checkUrlSafety("https://malicious.example.com");

    expect(result).toEqual({ checked: true, safe: false });
  });

  it("returns check_failed on a non-ok response", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await checkUrlSafety("https://example.com");

    expect(result).toEqual({ checked: false, reason: "check_failed" });
  });

  it("returns check_failed and never throws when fetch itself rejects (network error)", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(checkUrlSafety("https://example.com")).resolves.toEqual({
      checked: false,
      reason: "check_failed",
    });
  });

  it("returns check_failed and never throws when the response body is garbage JSON", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token in JSON");
        },
      }),
    );

    await expect(checkUrlSafety("https://example.com")).resolves.toEqual({
      checked: false,
      reason: "check_failed",
    });
  });
});
