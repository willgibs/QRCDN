import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// route.ts (and this file) import via relative paths, not "@/" — Vitest has
// no tsconfig-paths plugin configured (confirmed empirically by every prior
// P6/P7 unit; see app/api/cron/purge/route.test.ts's header note).
//
// `after` (next/server) throws when called outside a real Next.js request
// scope (apps/web/node_modules/next/dist/server/after/after.js) — every
// path through authenticateApiRequest that reaches it would blow up under
// plain vitest, so it's replaced with a `vi.fn()` that just records the
// call. Everything else from "next/server" (NextResponse, used by the
// route tests that import this same mocked module) stays real via
// `importOriginal`.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});

vi.mock("./supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { after } from "next/server";
import { createAdminClient } from "./supabase/admin";
import { authenticateApiRequest, isApiError, type AuthedApiContext } from "./api-auth";
import { generateApiKey, hashApiKey } from "./api-keys";

const afterMock = vi.mocked(after);
const createAdminClientMock = vi.mocked(createAdminClient);

interface KeyRow {
  id: string;
  owner_id: string;
  revoked_at: string | null;
}

interface DbMockOptions {
  keyRow?: KeyRow | null;
  keyError?: { message: string } | null;
  profile?: { plan: string } | null;
  profileError?: { message: string } | null;
  rpcResult?: { count: number; over_cap: boolean }[] | null;
  rpcError?: { message: string } | null;
}

/** Hand-rolled chain-mock, mirroring apps/web/lib/purge.test.ts's style:
 *  each stage is a vi.fn() returning either the next stage or a settled
 *  `{data, error}`/`{data,error}`-shaped promise at the terminal call. */
function makeDb(opts: DbMockOptions) {
  const updateEqMock = vi.fn(() => Promise.resolve({ error: null }));
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));

  const apiKeysBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({ data: opts.keyRow ?? null, error: opts.keyError ?? null }),
        ),
      })),
    })),
    update: updateMock,
  };

  const profilesBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: opts.profile ?? null, error: opts.profileError ?? null }),
        ),
      })),
    })),
  };

  const from = vi.fn((table: string) => {
    if (table === "api_keys") return apiKeysBuilder;
    if (table === "profiles") return profilesBuilder;
    throw new Error(`unexpected table in mock: ${table}`);
  });

  const rpc = vi.fn(() =>
    Promise.resolve({ data: opts.rpcResult ?? null, error: opts.rpcError ?? null }),
  );

  return { from, rpc, updateMock, updateEqMock };
}

function requestWith(headers?: Record<string, string>): Request {
  return new Request("https://www.qrcdn.com/api/v1/codes", { headers });
}

let generatedKey: string;
let generatedHash: string;

beforeEach(async () => {
  generatedKey = generateApiKey().fullKey;
  generatedHash = await hashApiKey(generatedKey);
  afterMock.mockReset();
  createAdminClientMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("authenticateApiRequest — bearer parsing", () => {
  it("401s with no Authorization header, without ever touching the DB", async () => {
    const result = await authenticateApiRequest(requestWith());

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        error: "unauthorized",
        message: "Missing or malformed Authorization header.",
      });
    }
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("401s on a non-Bearer scheme, without touching the DB", async () => {
    const result = await authenticateApiRequest(requestWith({ authorization: "Basic dXNlcjpwYXNz" }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.body.message).toBe("Missing or malformed Authorization header.");
    }
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});

describe("authenticateApiRequest — malformed key", () => {
  it("401s a format-invalid key with zero DB cost", async () => {
    const db = makeDb({});
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(
      requestWith({ authorization: "Bearer not_even_close_to_a_real_key" }),
    );

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: "unauthorized", message: "Malformed API key." });
    }
    // formatValidateApiKey rejects before any query is even attempted.
    expect(createAdminClientMock).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("authenticateApiRequest — unknown vs revoked key", () => {
  it("401s a well-formed but unknown key with the standard invalid-key body", async () => {
    const db = makeDb({ keyRow: null });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: "unauthorized", message: "Invalid API key." });
    }
  });

  it("401s a revoked key with an IDENTICAL body to the unknown-key case", async () => {
    const db = makeDb({
      keyRow: { id: "key-1", owner_id: "owner-1", revoked_at: "2026-01-01T00:00:00.000Z" },
    });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: "unauthorized", message: "Invalid API key." });
    }
    // Never reaches the profile/quota steps for a revoked key.
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("looks up the key by its hashed form", async () => {
    const db = makeDb({ keyRow: null });
    createAdminClientMock.mockReturnValue(db as never);

    await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    const eqCall = db.from.mock.results[0]!.value.select.mock.results[0]!.value.eq;
    expect(eqCall).toHaveBeenCalledWith("key_hash", generatedHash);
  });
});

describe("authenticateApiRequest — plan gate", () => {
  it("403s api_not_available on a free-plan key", async () => {
    const db = makeDb({
      keyRow: { id: "key-1", owner_id: "owner-1", revoked_at: null },
      profile: { plan: "free" },
    });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(403);
      expect(result.body).toEqual({
        error: "api_not_available",
        message: "The API is available on the Pro plan.",
      });
    }
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("authenticateApiRequest — quota", () => {
  it("429s quota_exceeded when the RPC reports over_cap", async () => {
    const db = makeDb({
      keyRow: { id: "key-1", owner_id: "owner-1", revoked_at: null },
      profile: { plan: "pro" },
      rpcResult: [{ count: 10_001, over_cap: true }],
    });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(429);
      expect(result.body).toEqual({
        error: "quota_exceeded",
        message: "Monthly request quota exceeded.",
      });
    }
  });

  it("500s internal_error when the RPC itself errors", async () => {
    const db = makeDb({
      keyRow: { id: "key-1", owner_id: "owner-1", revoked_at: null },
      profile: { plan: "pro" },
      rpcError: { message: "connection reset" },
    });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(500);
      expect(result.body.error).toBe("internal_error");
    }
  });
});

describe("authenticateApiRequest — happy path", () => {
  it("returns an authed context shape and registers (without awaiting) the last_used_at after()", async () => {
    const db = makeDb({
      keyRow: { id: "key-1", owner_id: "owner-1", revoked_at: null },
      profile: { plan: "pro" },
      rpcResult: [{ count: 3, over_cap: false }],
    });
    createAdminClientMock.mockReturnValue(db as never);

    const result = await authenticateApiRequest(requestWith({ authorization: `Bearer ${generatedKey}` }));

    expect(isApiError(result)).toBe(false);
    const ctx = result as AuthedApiContext;
    expect(ctx.ownerId).toBe("owner-1");
    expect(ctx.apiKeyId).toBe("key-1");
    expect(ctx.plan).toBe("pro");
    expect(ctx.db).toBe(db);

    // `after` was called (a callback was registered) — but we never invoke
    // it ourselves, and the request already resolved above without waiting
    // on the update it schedules.
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(afterMock.mock.calls[0]![0]).toBeInstanceOf(Function);
    expect(db.updateMock).not.toHaveBeenCalled();
  });
});
