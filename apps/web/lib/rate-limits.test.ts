import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { P_UNLOCK_LIMIT, STUDIO_MUTATE_LIMIT, checkRateLimit, ipSubject } from "./rate-limits";

/** Hand-rolled admin-client stub -- only `.rpc()` is exercised by this
 *  module, same minimal-mock style as api-auth.test.ts's `makeDb`. */
function makeAdmin(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(() => Promise.resolve(result)) };
}

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_IP_SALT", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("documented limit values", () => {
  it("P_UNLOCK_LIMIT is 8 calls per 300s", () => {
    expect(P_UNLOCK_LIMIT).toEqual({ windowSeconds: 300, limit: 8 });
  });

  it("STUDIO_MUTATE_LIMIT is 60 calls per 300s", () => {
    expect(STUDIO_MUTATE_LIMIT).toEqual({ windowSeconds: 300, limit: 60 });
  });
});

describe("checkRateLimit — normal operation", () => {
  it("allows a call under the limit and calls the RPC with the right args", async () => {
    const admin = makeAdmin({ data: [{ count: 1, allowed: true }], error: null });

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: true, failedOpen: false });
    expect(admin.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_subject: "subject-a",
      p_window_seconds: 300,
      p_limit: 8,
    });
  });

  it("denies a call over the limit, and this is NOT a failed-open result", async () => {
    const admin = makeAdmin({ data: [{ count: 9, allowed: false }], error: null });

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: false, failedOpen: false });
  });
});

describe("checkRateLimit — fail-open contract", () => {
  it("fails open when the RPC reports an error", async () => {
    const admin = makeAdmin({ data: null, error: { message: "connection reset" } });

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: true, failedOpen: true });
  });

  it("fails open when the RPC returns an empty row set", async () => {
    const admin = makeAdmin({ data: [], error: null });

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: true, failedOpen: true });
  });

  it("fails open when the RPC returns null data with no error", async () => {
    const admin = makeAdmin({ data: null, error: null });

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: true, failedOpen: true });
  });

  it("fails open when rpc() itself throws, never propagating the throw", async () => {
    const admin = {
      rpc: vi.fn(() => {
        throw new Error("boom");
      }),
    };

    const result = await checkRateLimit(admin as never, "subject-a", P_UNLOCK_LIMIT);

    expect(result).toEqual({ allowed: true, failedOpen: true });
  });
});

describe("ipSubject", () => {
  it("is stable for the same ip+scope across calls", () => {
    expect(ipSubject("1.2.3.4", "p_unlock:ABCD234")).toBe(ipSubject("1.2.3.4", "p_unlock:ABCD234"));
  });

  it("differs for a different ip", () => {
    expect(ipSubject("1.2.3.4", "p_unlock:ABCD234")).not.toBe(ipSubject("5.6.7.8", "p_unlock:ABCD234"));
  });

  it("differs for a different scope, even with the same ip", () => {
    expect(ipSubject("1.2.3.4", "p_unlock:ABCD234")).not.toBe(ipSubject("1.2.3.4", "p_unlock:WXYZ999"));
  });

  it("never contains the raw ip in its output", () => {
    expect(ipSubject("203.0.113.7", "p_unlock:ABCD234")).not.toContain("203.0.113.7");
  });

  it("is salted -- changes when RATE_LIMIT_IP_SALT changes, not a bare hash of ip+scope", () => {
    const unsalted = ipSubject("1.2.3.4", "scope");
    vi.stubEnv("RATE_LIMIT_IP_SALT", "a-real-secret-salt");
    const salted = ipSubject("1.2.3.4", "scope");

    expect(salted).not.toBe(unsalted);
  });

  it("is deterministic with no salt configured (documented fallback), not random per call", () => {
    vi.stubEnv("RATE_LIMIT_IP_SALT", undefined);

    expect(ipSubject("9.9.9.9", "x")).toBe(ipSubject("9.9.9.9", "x"));
  });
});
