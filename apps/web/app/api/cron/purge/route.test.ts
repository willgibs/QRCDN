import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// route.ts imports these via relative paths (not the "@/" alias — Vitest in
// this repo has no config teaching it about tsconfig paths, confirmed
// empirically; see the P6-U2 report for the deviation note). vi.mock's
// specifier must match route.ts's import specifier exactly since both files
// live in the same directory.
vi.mock("../../../../lib/purge", () => ({
  purgePlanScanEvents: vi.fn(),
}));
vi.mock("../../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ __fakeAdminClient: true })),
}));

import { purgePlanScanEvents } from "../../../../lib/purge";
import { GET } from "./route";

const purgeMock = vi.mocked(purgePlanScanEvents);

function requestWith(headers?: Record<string, string>): Request {
  return new Request("https://www.qrcdn.com/api/cron/purge", { headers });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", undefined);
  purgeMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/purge — unconfigured", () => {
  it("404s with not_configured when CRON_SECRET is unset, without calling purge", async () => {
    const response = await GET(requestWith({ authorization: "Bearer anything" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_configured" });
    expect(purgeMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/purge — authorization", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "the_real_secret");
  });

  it("401s with no Authorization header, without calling purge", async () => {
    const response = await GET(requestWith());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(purgeMock).not.toHaveBeenCalled();
  });

  it("401s on a mismatched bearer token, without calling purge", async () => {
    const response = await GET(requestWith({ authorization: "Bearer wrong_secret" }));

    expect(response.status).toBe(401);
    expect(purgeMock).not.toHaveBeenCalled();
  });

  it("401s on a non-Bearer Authorization header", async () => {
    const response = await GET(requestWith({ authorization: "Basic dXNlcjpwYXNz" }));

    expect(response.status).toBe(401);
    expect(purgeMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/purge — authorized run", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "the_real_secret");
  });

  it("200s with per-plan results on the correct bearer token", async () => {
    purgeMock.mockResolvedValueOnce(12).mockResolvedValueOnce(34);

    const response = await GET(requestWith({ authorization: "Bearer the_real_secret" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [
        { plan: "free", deleted: 12 },
        { plan: "pro", deleted: 34 },
      ],
    });
    expect(purgeMock).toHaveBeenCalledTimes(2);
    expect(purgeMock.mock.calls[0]![1]).toBe("free");
    expect(purgeMock.mock.calls[1]![1]).toBe("pro");
  });

  it("still 200s when one plan's purge throws, surfacing the error for that plan only", async () => {
    purgeMock
      .mockResolvedValueOnce(7)
      .mockRejectedValueOnce(new Error("delete boom"));

    const response = await GET(requestWith({ authorization: "Bearer the_real_secret" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [
        { plan: "free", deleted: 7 },
        { plan: "pro", error: "delete boom" },
      ],
    });
  });
});
