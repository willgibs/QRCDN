import { beforeEach, describe, expect, it, vi } from "vitest";

// Relative-import convention for mock targets too, matching actions.ts's
// own header note (no tsconfig-paths plugin under vitest in this repo).
vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../../../lib/passwords", () => ({
  verifyCodePassword: vi.fn(),
}));

import { createAdminClient } from "../../../lib/supabase/admin";
import { verifyCodePassword } from "../../../lib/passwords";
import { verifyCodeAccess } from "./actions";

const createAdminClientMock = vi.mocked(createAdminClient);
const verifyCodePasswordMock = vi.mocked(verifyCodePassword);

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
