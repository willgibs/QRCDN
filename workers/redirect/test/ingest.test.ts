import { afterEach, describe, expect, it, vi } from "vitest";
import { ingestScan } from "../src/ingest";
import type { SupabaseRestEnv } from "../src/supabase";

const ENV: SupabaseRestEnv = { supabaseUrl: "https://proj.supabase.co", secretKey: "sb_secret_x" };
const NOW = new Date("2026-07-22T12:00:00.000Z");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ingestScan", () => {
  it("assembles and posts a scan_events payload with hashed ip, coarse device, geo, and referer host", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await ingestScan(
      ENV,
      "scan-salt",
      {
        codeId: "code-1",
        ip: "203.0.113.5",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        referer: "https://social.example/post/123?utm=abc",
        cf: { country: "US", region: "CA", city: "San Francisco" },
      },
      NOW,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);

    expect(body.code_id).toBe("code-1");
    expect(body.country).toBe("US");
    expect(body.region).toBe("CA");
    expect(body.city).toBe("San Francisco");
    expect(body.device).toBe("mobile");
    expect(body.referer).toBe("social.example");
    expect(body.ip_hash).toMatch(/^\\x[0-9a-f]{64}$/);
    // Never the raw IP anywhere in the payload.
    expect(JSON.stringify(body)).not.toContain("203.0.113.5");
  });

  it("never throws, even if the network call rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    await expect(
      ingestScan(
        ENV,
        "scan-salt",
        { codeId: "code-1", ip: "203.0.113.5", userAgent: "some-ua", referer: null, cf: undefined },
        NOW,
      ),
    ).resolves.toBeUndefined();
  });
});
