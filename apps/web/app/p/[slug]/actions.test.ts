import { beforeEach, describe, expect, it, vi } from "vitest";

// Relative-import convention for mock targets too, matching actions.ts's
// own header note (no tsconfig-paths plugin under vitest in this repo).
vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../../../lib/passwords", () => ({
  verifyCodePassword: vi.fn(),
}));
// next/headers has no real implementation under plain vitest (no request
// scope) — mocked the same way api-auth.test.ts mocks next/server's
// `after`. Only `checkRateLimit` is mocked from lib/rate-limits (via
// importOriginal): ipSubject/P_UNLOCK_LIMIT stay REAL so assertions below
// can build their expected subject with the actual function instead of
// duplicating its hashing logic.
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("../../../lib/rate-limits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/rate-limits")>();
  return { ...actual, checkRateLimit: vi.fn() };
});

import { headers } from "next/headers";
import { createAdminClient } from "../../../lib/supabase/admin";
import { verifyCodePassword } from "../../../lib/passwords";
import { checkRateLimit, ipSubject, P_UNLOCK_LIMIT } from "../../../lib/rate-limits";
import { verifyCodeAccess } from "./actions";

const createAdminClientMock = vi.mocked(createAdminClient);
const verifyCodePasswordMock = vi.mocked(verifyCodePassword);
const headersMock = vi.mocked(headers);
const checkRateLimitMock = vi.mocked(checkRateLimit);

interface RowResult {
  data: {
    destination_url: string | null;
    status: string;
    expires_at: string | null;
    password_hash: string | null;
  } | null;
  error: { message: string } | null;
}

/** Hand-rolled chain-mock, same style as lib/api-auth.test.ts/
 *  lib/purge.test.ts — each stage is a vi.fn() so the eq()/select() calls
 *  the code under test made are individually assertable. */
function mockDb(result: RowResult) {
  const eqCalls: [string, string][] = [];
  const selectCalls: string[] = [];

  const builder = {
    select: vi.fn((cols: string) => {
      selectCalls.push(cols);
      return builder;
    }),
    eq: vi.fn((col: string, value: string) => {
      eqCalls.push([col, value]);
      return builder;
    }),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };

  const from = vi.fn(() => builder);
  createAdminClientMock.mockReturnValue({ from } as never);
  return { from, eqCalls, selectCalls };
}

const ACTIVE_ROW = {
  destination_url: "https://example.com/secret-menu",
  status: "active",
  expires_at: null,
  password_hash: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
};

beforeEach(() => {
  createAdminClientMock.mockReset();
  verifyCodePasswordMock.mockReset();
  // Defaults every pre-existing test below relies on implicitly: no
  // forwarded-ip header, and the limiter allowing every call through — the
  // rate-limiting-specific describe block overrides these per case.
  headersMock.mockReset().mockResolvedValue(new Headers());
  checkRateLimitMock.mockReset().mockResolvedValue({ allowed: true, failedOpen: false });
});

describe("verifyCodeAccess — input shape", () => {
  it("returns unavailable without touching the db for a non-string slug/password", async () => {
    const result = await verifyCodeAccess(42, "pw");
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns unavailable for an empty slug", async () => {
    const result = await verifyCodeAccess("", "pw");
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});

describe("verifyCodeAccess — TOCTOU re-fetch and generic failure branches", () => {
  it("returns unavailable for a slug that doesn't exist, never reaching verifyCodePassword", async () => {
    mockDb({ data: null, error: null });

    const result = await verifyCodeAccess("abcd234", "any");

    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(verifyCodePasswordMock).not.toHaveBeenCalled();
  });

  it("uppercases the slug before the Postgres lookup (D12 convention)", async () => {
    const { eqCalls } = mockDb({ data: null, error: null });

    await verifyCodeAccess("abcd234", "any");

    expect(eqCalls).toContainEqual(["slug", "ABCD234"]);
  });

  it("returns unavailable for a paused code, never reaching verifyCodePassword", async () => {
    mockDb({ data: { ...ACTIVE_ROW, status: "paused" }, error: null });

    const result = await verifyCodeAccess("ABCD234", "any");

    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(verifyCodePasswordMock).not.toHaveBeenCalled();
  });

  it("returns unavailable for an expired code, never reaching verifyCodePassword", async () => {
    mockDb({ data: { ...ACTIVE_ROW, expires_at: "2000-01-01T00:00:00.000Z" }, error: null });

    const result = await verifyCodeAccess("ABCD234", "any");

    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(verifyCodePasswordMock).not.toHaveBeenCalled();
  });
});

describe("verifyCodeAccess — fail-open on a null password_hash", () => {
  it("returns ok with the destination, never reaching verifyCodePassword", async () => {
    mockDb({ data: { ...ACTIVE_ROW, password_hash: null }, error: null });

    const result = await verifyCodeAccess("ABCD234", "whatever");

    expect(result).toEqual({ ok: true, data: { destination: "https://example.com/secret-menu" } });
    expect(verifyCodePasswordMock).not.toHaveBeenCalled();
  });
});

describe("verifyCodeAccess — password verification", () => {
  it("a wrong password awaits the injected delay, then returns a generic incorrect error", async () => {
    mockDb({ data: ACTIVE_ROW, error: null });
    verifyCodePasswordMock.mockResolvedValueOnce(false);
    const delay = vi.fn().mockResolvedValue(undefined);

    const result = await verifyCodeAccess("ABCD234", "wrong-guess", { delay });

    expect(result).toEqual({ ok: false, error: "incorrect" });
    expect(delay).toHaveBeenCalledTimes(1);
  });

  it("a right password returns ok with the destination and never awaits the delay", async () => {
    mockDb({ data: ACTIVE_ROW, error: null });
    verifyCodePasswordMock.mockResolvedValueOnce(true);
    const delay = vi.fn().mockResolvedValue(undefined);

    const result = await verifyCodeAccess("ABCD234", "correct-password", { delay });

    expect(result).toEqual({ ok: true, data: { destination: "https://example.com/secret-menu" } });
    expect(delay).not.toHaveBeenCalled();
  });
});

describe("verifyCodeAccess — rate limiting (P8-U4)", () => {
  it("calls the limiter with ipSubject(ip, 'p_unlock:' + the UPPERCASED slug) and P_UNLOCK_LIMIT", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    mockDb({ data: ACTIVE_ROW, error: null });

    await verifyCodeAccess("abcd234", "any");

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      ipSubject("203.0.113.7", "p_unlock:ABCD234"),
      P_UNLOCK_LIMIT,
    );
  });

  it("takes the first entry of a comma-separated x-forwarded-for", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    mockDb({ data: null, error: null });

    await verifyCodeAccess("abcd234", "any");

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      ipSubject("203.0.113.7", "p_unlock:ABCD234"),
      P_UNLOCK_LIMIT,
    );
  });

  it("falls back to a constant subject ip when x-forwarded-for is absent", async () => {
    headersMock.mockResolvedValue(new Headers());
    mockDb({ data: null, error: null });

    await verifyCodeAccess("abcd234", "any");

    // "unknown" mirrors actions.ts's own private UNKNOWN_IP constant — not
    // exported, so pinned here as a literal.
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      ipSubject("unknown", "p_unlock:ABCD234"),
      P_UNLOCK_LIMIT,
    );
  });

  it("an over-limit result returns rate_limited and never reaches the db or verifyCodePassword", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, failedOpen: false });
    const { from } = mockDb({ data: ACTIVE_ROW, error: null });

    const result = await verifyCodeAccess("ABCD234", "any");

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(from).not.toHaveBeenCalled();
    expect(verifyCodePasswordMock).not.toHaveBeenCalled();
  });

  it("a fail-open limiter result still allows the request through", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: true, failedOpen: true });
    mockDb({ data: { ...ACTIVE_ROW, password_hash: null }, error: null });

    const result = await verifyCodeAccess("ABCD234", "whatever");

    expect(result).toEqual({ ok: true, data: { destination: "https://example.com/secret-menu" } });
  });
});
