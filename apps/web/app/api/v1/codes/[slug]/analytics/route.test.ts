import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../../lib/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  isApiError: (x: unknown) => typeof x === "object" && x !== null && "status" in x,
}));
vi.mock("../../../../../../lib/codes-core", () => ({
  getCodeAnalyticsCore: vi.fn(),
}));

import { authenticateApiRequest } from "../../../../../../lib/api-auth";
import { getCodeAnalyticsCore } from "../../../../../../lib/codes-core";
import { GET } from "./route";

const authMock = vi.mocked(authenticateApiRequest);
const analyticsMock = vi.mocked(getCodeAnalyticsCore);

// Free never reaches this route — lib/api-auth.ts's plan gate 403s a free
// key before any /api/v1 handler runs (PLAN_LIMITS.free.apiMonthlyRequests
// is null). So every ctx this route ever sees is Pro; range-clamp behavior
// is exercised with a Pro ctx below, per the task spec's own note.
const AUTH_CTX = { db: {} as never, ownerId: "owner-1", apiKeyId: "key-1", plan: "pro" as const };

const CODE = {
  id: "code-1",
  slug: "ABCD234",
  name: "Menu",
  destination_url: "https://example.com",
  status: "active",
  scan_count: 42,
  created_at: "2026-01-01T00:00:00.000Z",
  brandKitId: null,
  expiresAt: null,
  passwordProtected: false,
};

function ctxFor(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function getRequest(slug: string, query = ""): Request {
  return new Request(`https://www.qrcdn.com/api/v1/codes/${slug}/analytics${query}`, {
    headers: { authorization: "Bearer irrelevant-mocked" },
  });
}

beforeEach(() => {
  authMock.mockReset();
  analyticsMock.mockReset();
  authMock.mockResolvedValue(AUTH_CTX);
});

describe("GET /api/v1/codes/[slug]/analytics", () => {
  it("404s not_found for an unowned or nonexistent slug", async () => {
    analyticsMock.mockResolvedValueOnce({ ok: false, error: "not_found" });

    const response = await GET(getRequest("NOPE000"), ctxFor("NOPE000"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found", message: "Code not found." });
  });

  it("500s internal_error for a non-not_found core failure", async () => {
    analyticsMock.mockResolvedValueOnce({ ok: false, error: "analytics_failed" });

    const response = await GET(getRequest("ABCD234"), ctxFor("ABCD234"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_error",
      message: "Something went wrong. Try again.",
    });
  });

  it("200s the full analytics shape with `code` mapped through toApiCode", async () => {
    analyticsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        code: CODE,
        series: [{ day: "2026-01-01", scans: 3, uniques: 2 }],
        totals: { scans: 3 },
        today: { scans: 1 },
        topCountries: [{ key: "US", count: 3 }],
        topDevices: [{ key: "mobile", count: 3 }],
        recentEvents: [
          { ts: "2026-01-01T12:00:00.000Z", country: "US", region: null, city: null, device: "mobile", referer: null },
        ],
      },
    });

    const response = await GET(getRequest("ABCD234", "?range=90"), ctxFor("ABCD234"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      range: 90,
      code: {
        slug: "ABCD234",
        name: "Menu",
        destination: "https://example.com",
        status: "active",
        scanCount: 42,
        brandKitId: null,
        expiresAt: null,
        passwordProtected: false,
        url: "https://qrcdn.com/ABCD234",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      series: [{ day: "2026-01-01", scans: 3, uniques: 2 }],
      totals: { scans: 3 },
      today: { scans: 1 },
      topCountries: [{ key: "US", count: 3 }],
      topDevices: [{ key: "mobile", count: 3 }],
      recentEvents: [
        { ts: "2026-01-01T12:00:00.000Z", country: "US", region: null, city: null, device: "mobile", referer: null },
      ],
    });
    expect(analyticsMock).toHaveBeenCalledWith({ db: AUTH_CTX.db, ownerId: "owner-1" }, "ABCD234", 90);
  });

  it("resolves ?range through resolveRangeDays using the authed plan — disallowed preset falls back to the 30-day default, not the raw query value", async () => {
    analyticsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        code: CODE,
        series: [],
        totals: { scans: 0 },
        today: { scans: 0 },
        topCountries: [],
        topDevices: [],
        recentEvents: [],
      },
    });

    // 45 isn't one of RANGE_OPTIONS (7/30/90/365) — resolveRangeDays falls
    // back to the 30-day default (still comfortably under Pro's 365 ceiling).
    const response = await GET(getRequest("ABCD234", "?range=45"), ctxFor("ABCD234"));
    const body = await response.json();

    expect(body.range).toBe(30);
    expect(analyticsMock).toHaveBeenCalledWith({ db: AUTH_CTX.db, ownerId: "owner-1" }, "ABCD234", 30);
  });
});
