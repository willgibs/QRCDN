import { beforeEach, describe, expect, it, vi } from "vitest";

// actions.ts imports these via relative paths, not the "@/" alias — Vitest
// in this repo has no tsconfig-paths config (confirmed empirically across
// every prior P6/P7 unit; see lib/api-auth.test.ts's own header note).
// vi.mock's specifier must match actions.ts's import specifier exactly
// since both files live in the same directory.
vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "../../../lib/supabase/server";
import { formatValidateApiKey, hashApiKey } from "../../../lib/api-keys";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

const createClientMock = vi.mocked(createClient);

// Hand-rolled chain-mock Supabase client, same style as
// apps/web/lib/codes-core.test.ts's own harness: every builder method is
// `.then()`-able so it doesn't matter which method actions.ts calls last —
// awaiting the chain always resolves to the result queued for that
// `.from()` call. Each `.from(table)` call consumes the next entry in
// `plan`, in order.
type Calls = Record<string, unknown[][]>;

function makeBuilder(result: unknown) {
  const calls: Calls = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return builder;
    };

  const builder = {
    select: vi.fn(record("select")),
    insert: vi.fn(record("insert")),
    update: vi.fn(record("update")),
    eq: vi.fn(record("eq")),
    is: vi.fn(record("is")),
    single: vi.fn(record("single")),
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return { builder, calls };
}

const USER_ID = "user-abc-123";

function createDb(plan: { table: string; result: unknown }[], userId: string = USER_ID) {
  const builders: ReturnType<typeof makeBuilder>[] = [];
  let i = 0;

  const from = vi.fn((table: string) => {
    const entry = plan[i];
    if (!entry) {
      throw new Error(`unexpected .from("${table}") call — plan exhausted`);
    }
    if (entry.table !== table) {
      throw new Error(`expected .from("${entry.table}") but got .from("${table}")`);
    }
    const b = makeBuilder(entry.result);
    builders.push(b);
    i++;
    return b.builder;
  });

  const db = {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  };

  return { db, from, builders };
}

function unauthenticatedDb() {
  const from = vi.fn();
  const db = { from, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } };
  return { db, from };
}

const VALID_UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

beforeEach(() => {
  createClientMock.mockReset();
});

describe("createApiKeyAction — name validation", () => {
  it("rejects an empty/whitespace-only name and never calls createClient", async () => {
    const result = await createApiKeyAction("   ");
    expect(result).toEqual({ ok: false, error: "name_required" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects a name over 80 characters", async () => {
    const result = await createApiKeyAction("a".repeat(81));
    expect(result).toEqual({ ok: false, error: "name_too_long" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("trims the name before validating and inserting", async () => {
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "api_keys", result: { data: { id: "key-1", name: "Trimmed" }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("  Trimmed  ");

    expect(result.ok).toBe(true);
    const insertPayload = builders[1]!.calls.insert![0]![0] as { name: string };
    expect(insertPayload.name).toBe("Trimmed");
  });
});

describe("createApiKeyAction — auth and plan gate", () => {
  it("returns unauthenticated when getUser fails", async () => {
    const { db, from } = unauthenticatedDb();
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns profile_not_found when the profile lookup fails", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: null, error: { message: "no row" } } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result).toEqual({ ok: false, error: "profile_not_found" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns pro_required on the free plan and never attempts an insert (server-side re-check, never trusts the UI gate)", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: { plan: "free" }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result).toEqual({ ok: false, error: "pro_required" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("proceeds to mint a key on the pro plan", async () => {
    const { db } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "api_keys", result: { data: { id: "key-1", name: "My Key" }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("key-1");
      expect(result.data.name).toBe("My Key");
      expect(typeof result.data.fullKey).toBe("string");
      expect(typeof result.data.displayPrefix).toBe("string");
    }
  });
});

describe("createApiKeyAction — insert payload and returned key shape", () => {
  it("inserts owner_id, a sha256 hash (not the raw key), and key_prefix equal to the returned displayPrefix", async () => {
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "api_keys", result: { data: { id: "key-1", name: "My Key" }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const insertPayload = builders[1]!.calls.insert![0]![0] as {
      owner_id: string;
      name: string;
      key_prefix: string;
      key_hash: string;
    };
    expect(insertPayload.owner_id).toBe(USER_ID);
    expect(insertPayload.key_prefix).toBe(result.data.displayPrefix);
    // The hash, never the raw secret, is what's persisted.
    expect(insertPayload.key_hash).not.toBe(result.data.fullKey);
    expect(insertPayload.key_hash).toBe(await hashApiKey(result.data.fullKey));
  });

  it("returns a fullKey that passes formatValidateApiKey (the zero-DB-cost format gate api-auth.ts checks on every request)", async () => {
    const { db } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "api_keys", result: { data: { id: "key-1", name: "My Key" }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(formatValidateApiKey(result.data.fullKey)).toBe(true);
    }
  });

  it("returns insert_failed when the insert errors", async () => {
    const { db } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "api_keys", result: { data: null, error: { message: "boom" } } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await createApiKeyAction("My Key");

    expect(result).toEqual({ ok: false, error: "insert_failed" });
  });
});

describe("revokeApiKeyAction — id validation", () => {
  it("rejects a non-uuid id and never calls createClient", async () => {
    const result = await revokeApiKeyAction("not-a-uuid");
    expect(result).toEqual({ ok: false, error: "invalid_id" });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

describe("revokeApiKeyAction — auth", () => {
  it("returns unauthenticated when getUser fails", async () => {
    const { db, from } = unauthenticatedDb();
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await revokeApiKeyAction(VALID_UUID);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("revokeApiKeyAction — revoke semantics", () => {
  it("stamps revoked_at and asserts the .is(\"revoked_at\", null) idempotency guard", async () => {
    const { db, builders } = createDb([
      { table: "api_keys", result: { data: { id: VALID_UUID }, error: null } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await revokeApiKeyAction(VALID_UUID);

    expect(result).toEqual({ ok: true, data: { id: VALID_UUID } });
    expect(builders[0]!.calls.eq).toContainEqual(["id", VALID_UUID]);
    expect(builders[0]!.calls.is).toContainEqual(["revoked_at", null]);
    const updatePayload = builders[0]!.calls.update![0]![0] as { revoked_at: string };
    expect(typeof updatePayload.revoked_at).toBe("string");
    expect(() => new Date(updatePayload.revoked_at).toISOString()).not.toThrow();
  });

  it("returns not_found when the key is already revoked (the null guard matches zero rows)", async () => {
    const { db } = createDb([
      { table: "api_keys", result: { data: null, error: { code: "PGRST116" } } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await revokeApiKeyAction(VALID_UUID);

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns not_found for a nonexistent or not-owned id (RLS makes the two indistinguishable, same stance as code-actions.ts)", async () => {
    const { db } = createDb([
      { table: "api_keys", result: { data: null, error: { message: "no row" } } },
    ]);
    createClientMock.mockResolvedValueOnce(db as never);

    const result = await revokeApiKeyAction(VALID_UUID);

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
