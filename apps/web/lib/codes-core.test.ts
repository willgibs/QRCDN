import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";
import {
  createDynamicCodeCore,
  getCodeAnalyticsCore,
  getCodeBySlugCore,
  getDynamicCodeStyleCore,
  listDynamicCodesCore,
  retargetCodeCore,
  setCodeAccessCore,
  setCodePausedCore,
  type CodesCoreCtx,
} from "./codes-core";
import type { RangeDays } from "./analytics";

// Hand-rolled chain-mock Supabase client, mirroring apps/web/lib/purge.test.ts's
// style but generalized with a `.then()` on every builder (real supabase-js
// query builders are themselves thenable at any point in the chain) so it
// doesn't matter which method codes-core.ts happens to call last —
// `.single()`, `.order()`, `.limit()`, `.neq()`, whatever — awaiting the
// chain always resolves to the result queued for that `.from()` call.
//
// Each `.from(table)` call consumes the next entry in `plan`, in order —
// this mirrors the exact sequence of queries the function under test makes,
// which is exactly what the load-bearing-owner-filter assertions below need
// to inspect (`builders[i].calls.eq` etc.).

vi.mock("./kv-sync", () => ({
  writeSlugToKv: vi.fn(),
}));
import { writeSlugToKv } from "./kv-sync";
const writeSlugToKvMock = vi.mocked(writeSlugToKv);

// hashCodePassword is mocked (rather than run for real) so setCodeAccessCore
// tests stay fast/deterministic and can assert on a fixed, recognizable
// "scrypt$..." return value — passwords.ts's own suite already exercises the
// real scrypt round-trip; this file only needs to prove setCodeAccessCore
// calls it and stores what it returns, not that scrypt itself works.
// (The literal is duplicated below as FAKE_HASH for use in assertions —
// vi.mock factories are hoisted above top-level const declarations, so this
// factory can't reference an outer variable.)
vi.mock("./passwords", () => ({
  hashCodePassword: vi.fn().mockResolvedValue("scrypt$32768$8$1$c2FsdA==$aGFzaA=="),
}));
import { hashCodePassword } from "./passwords";
const hashCodePasswordMock = vi.mocked(hashCodePassword);
const FAKE_HASH = "scrypt$32768$8$1$c2FsdA==$aGFzaA==";

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
    neq: vi.fn(record("neq")),
    gte: vi.fn(record("gte")),
    lt: vi.fn(record("lt")),
    order: vi.fn(record("order")),
    limit: vi.fn(record("limit")),
    single: vi.fn(record("single")),
    then(
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return { builder, calls };
}

function createDb(plan: { table: string; result: unknown }[]) {
  const fromCalls: string[] = [];
  const builders: ReturnType<typeof makeBuilder>[] = [];
  let i = 0;

  const from = vi.fn((table: string) => {
    fromCalls.push(table);
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

  return { db: { from } as unknown as SupabaseClient<Database>, from, fromCalls, builders };
}

const OWNER_ID = "owner-abc-123";

function ctxWith(db: SupabaseClient<Database>): CodesCoreCtx {
  return { db, ownerId: OWNER_ID };
}

/** Every `.eq()` call the builder recorded, as [column, value] pairs. */
function eqCallsOf(b: ReturnType<typeof makeBuilder>): unknown[][] {
  return b.calls.eq ?? [];
}

describe("createDynamicCodeCore — owner scoping", () => {
  it("filters the plan/limit count query by owner_id and stamps owner_id on the insert payload", async () => {
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "qr_codes", result: { count: 0, error: null } },
      {
        table: "qr_codes",
        result: {
          data: { id: "code-1", slug: "ABCD234", owner_id: OWNER_ID },
          error: null,
        },
      },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result.ok).toBe(true);
    // builders[1] = the count check
    expect(eqCallsOf(builders[1]!)).toContainEqual(["owner_id", OWNER_ID]);
    // builders[2] = the insert
    expect(builders[2]!.calls.insert![0]![0]).toMatchObject({ owner_id: OWNER_ID });
  });

  it("refuses to insert once the plan's dynamic-code limit is reached", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: { plan: "free" }, error: null } },
      { table: "qr_codes", result: { count: 3, error: null } }, // free limit is 3
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: false, error: "code_limit" });
    // Only profiles + the count check — no insert attempt.
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("retries once on a slug collision (23505) and returns the second attempt's row", async () => {
    const { db } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      { table: "qr_codes", result: { count: 0, error: null } },
      { table: "qr_codes", result: { data: null, error: { code: "23505" } } },
      {
        table: "qr_codes",
        result: { data: { id: "code-2", slug: "EFGH567" }, error: null },
      },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: true, data: { id: "code-2", slug: "EFGH567" } });
  });

  it("returns profile_not_found and never queries the code count when the profile lookup fails", async () => {
    const { db, from } = createDb([
      { table: "profiles", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await createDynamicCodeCore(ctxWith(db), {
      name: "Menu",
      destination: "https://example.com",
      style: { v: 1 },
    });

    expect(result).toEqual({ ok: false, error: "profile_not_found" });
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe("listDynamicCodesCore — owner scoping", () => {
  it("filters by owner_id", async () => {
    const { db, builders } = createDb([{ table: "qr_codes", result: { data: [], error: null } }]);

    const result = await listDynamicCodesCore(ctxWith(db));

    expect(result).toEqual({ ok: true, data: [] });
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns list_failed on a query error", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "boom" } } },
    ]);

    const result = await listDynamicCodesCore(ctxWith(db));

    expect(result).toEqual({ ok: false, error: "list_failed" });
  });

  // Summary-mapping invariant (P7.5-U2, codes-core.ts's toSummary): the raw
  // password_hash column must never survive into a DynamicCodeSummary — only
  // the derived passwordProtected boolean does.
  it("maps rows through toSummary — derives expiresAt/passwordProtected and strips the raw hash", async () => {
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: [
            {
              id: "code-1",
              slug: "ABCD234",
              name: "Menu",
              destination_url: "https://example.com",
              status: "active",
              scan_count: 0,
              created_at: "2026-07-01T00:00:00.000Z",
              expires_at: "2026-08-01T00:00:00.000Z",
              password_hash: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
            },
          ],
          error: null,
        },
      },
    ]);

    const result = await listDynamicCodesCore(ctxWith(db));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0]).toEqual({
        id: "code-1",
        slug: "ABCD234",
        name: "Menu",
        destination_url: "https://example.com",
        status: "active",
        scan_count: 0,
        created_at: "2026-07-01T00:00:00.000Z",
        expiresAt: "2026-08-01T00:00:00.000Z",
        passwordProtected: true,
      });
      expect(result.data[0]).not.toHaveProperty("password_hash");
      expect(result.data[0]).not.toHaveProperty("expires_at");
    }
  });
});

describe("getDynamicCodeStyleCore — owner scoping", () => {
  it("filters by owner_id and parses the frozen style snapshot", async () => {
    const { db, builders } = createDb([
      { table: "qr_codes", result: { data: { style: { v: 1 } }, error: null } },
    ]);

    const result = await getDynamicCodeStyleCore(ctxWith(db), "code-1");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns not_found when the row doesn't exist (or isn't the caller's)", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getDynamicCodeStyleCore(ctxWith(db), "code-1");

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("retargetCodeCore — owner scoping and KV propagation", () => {
  it("filters the update by owner_id", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://new.example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("propagates kvSynced: true from writeSlugToKv without failing the action", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://new.example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result).toEqual({
      ok: true,
      data: { id: "code-1", destinationUrl: "https://new.example.com", kvSynced: true },
    });
  });

  it("propagates kvSynced: false from writeSlugToKv without failing the action", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: false, reason: "kv_unconfigured" });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://new.example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kvSynced).toBe(false);
    }
  });

  // KV-wipe regression pin (P7.5-U2): before the toKvRecord fix, this call
  // built its KvSlugRecord literal inline with only destination/paused/
  // codeId set — retargeting a code with an expiry/password already set
  // would silently DROP both flags from KV even though Postgres still had
  // them. Asserting the exact writeSlugToKv payload (not just result.ok) is
  // the point of this test.
  it("carries expiresAt/passwordProtected into the KV write when the row has them set", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://new.example.com",
            status: "active",
            expires_at: "2026-08-01T00:00:00.000Z",
            password_hash: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
          },
          error: null,
        },
      },
    ]);

    await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    expect(writeSlugToKvMock).toHaveBeenCalledWith("ABCD234", {
      destination: "https://new.example.com",
      paused: false,
      codeId: "code-1",
      expiresAt: "2026-08-01T00:00:00.000Z",
      passwordProtected: true,
    });
  });

  // Omit-when-absent half of the same regression pin: a row with no
  // expiry/no password must produce a KV record with those keys OMITTED
  // entirely, not present-and-falsy — matching packages/shared/src/kv.ts's
  // additive-optional style so pre-P7.5 KV entries and post-P7.5
  // unprotected codes stay byte-identical.
  it("omits expiresAt/passwordProtected from the KV write when the row has neither", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://new.example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    await retargetCodeCore(ctxWith(db), "code-1", "https://new.example.com");

    const record = writeSlugToKvMock.mock.calls[0]![1];
    expect(record).toEqual({
      destination: "https://new.example.com",
      paused: false,
      codeId: "code-1",
    });
    expect(record).not.toHaveProperty("expiresAt");
    expect(record).not.toHaveProperty("passwordProtected");
  });
});

describe("setCodePausedCore — owner scoping and KV propagation", () => {
  it("filters the update by owner_id and propagates kvSynced", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "paused",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await setCodePausedCore(ctxWith(db), "code-1", true);

    expect(result).toEqual({
      ok: true,
      data: { id: "code-1", status: "paused", kvSynced: true },
    });
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  // Same KV-wipe regression pin as retargetCodeCore above, pinned here too
  // since setCodePausedCore had its own identical inline-literal bug before
  // the toKvRecord fix.
  it("carries expiresAt/passwordProtected into the KV write when the row has them set", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "paused",
            expires_at: "2026-08-01T00:00:00.000Z",
            password_hash: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
          },
          error: null,
        },
      },
    ]);

    await setCodePausedCore(ctxWith(db), "code-1", true);

    expect(writeSlugToKvMock).toHaveBeenCalledWith("ABCD234", {
      destination: "https://example.com",
      paused: true,
      codeId: "code-1",
      expiresAt: "2026-08-01T00:00:00.000Z",
      passwordProtected: true,
    });
  });

  it("returns update_failed when the row doesn't exist (or isn't the caller's)", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await setCodePausedCore(ctxWith(db), "code-1", false);

    expect(result).toEqual({ ok: false, error: "update_failed" });
  });
});

describe("getCodeBySlugCore — owner scoping", () => {
  it("filters by owner_id", async () => {
    const { db, builders } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            id: "code-1",
            slug: "ABCD234",
            name: "Menu",
            destination_url: "https://example.com",
            status: "active",
            scan_count: 0,
            created_at: "2026-07-01T00:00:00.000Z",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await getCodeBySlugCore(ctxWith(db), "ABCD234");

    expect(result.ok).toBe(true);
    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("returns not_found when no row matches", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getCodeBySlugCore(ctxWith(db), "ABCD234");

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  // Same summary-mapping invariant as listDynamicCodesCore's own test above.
  it("strips the raw password_hash and derives passwordProtected: true when a hash is set", async () => {
    const { db } = createDb([
      {
        table: "qr_codes",
        result: {
          data: {
            id: "code-1",
            slug: "ABCD234",
            name: "Menu",
            destination_url: "https://example.com",
            status: "active",
            scan_count: 0,
            created_at: "2026-07-01T00:00:00.000Z",
            expires_at: null,
            password_hash: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
          },
          error: null,
        },
      },
    ]);

    const result = await getCodeBySlugCore(ctxWith(db), "ABCD234");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.passwordProtected).toBe(true);
      expect(result.data).not.toHaveProperty("password_hash");
    }
  });
});

const CODE_ROW = {
  id: "code-1",
  slug: "ABCD234",
  name: "Menu",
  destination_url: "https://example.com",
  status: "active",
  scan_count: 12,
  created_at: "2026-07-01T00:00:00.000Z",
  expires_at: null,
  password_hash: null,
};

/** getCodeAnalyticsCore's `code` field is CODE_ROW mapped through
 *  getCodeBySlugCore -> toSummary — expiresAt/passwordProtected derived,
 *  expires_at/password_hash stripped. */
const CODE_SUMMARY = {
  id: CODE_ROW.id,
  slug: CODE_ROW.slug,
  name: CODE_ROW.name,
  destination_url: CODE_ROW.destination_url,
  status: CODE_ROW.status,
  scan_count: CODE_ROW.scan_count,
  created_at: CODE_ROW.created_at,
  expiresAt: null,
  passwordProtected: false,
};

describe("getCodeAnalyticsCore — IDOR guard and owner scoping", () => {
  it("short-circuits on not_found and never queries a scan table", async () => {
    const { db, fromCalls } = createDb([
      { table: "qr_codes", result: { data: null, error: { message: "no row" } } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(fromCalls).toEqual(["qr_codes"]);
  });

  it("owner-scopes the ownership-gate lookup before ever reaching a scan table", async () => {
    const { db, builders } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: [], error: null } },
      { table: "scan_events", result: { count: 0, error: null } },
      { table: "scan_events", result: { data: [], error: null } },
    ]);

    await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(eqCallsOf(builders[0]!)).toContainEqual(["owner_id", OWNER_ID]);
  });

  it("shapes an empty range into a zero-filled series with empty totals and buckets", async () => {
    const { db } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: [], error: null } },
      { table: "scan_events", result: { count: 0, error: null } },
      { table: "scan_events", result: { data: [], error: null } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.series).toHaveLength(7);
      expect(result.data.series.every((p) => p.scans === 0 && p.uniques === 0)).toBe(true);
      expect(result.data.totals).toEqual({ scans: 0 });
      expect(result.data.today).toEqual({ scans: 0 });
      expect(result.data.topCountries).toEqual([]);
      expect(result.data.topDevices).toEqual([]);
      expect(result.data.recentEvents).toEqual([]);
    }
  });

  it("sums scan_daily rows, reports today's live count, and buckets countries/devices", async () => {
    const dailyRows = [
      { day: "2026-07-01", scans: 3, uniques: 2, by_country: { US: 3 }, by_device: { mobile: 3 } },
      { day: "2026-07-02", scans: 5, uniques: 4, by_country: { US: 2, CA: 3 }, by_device: { desktop: 5 } },
    ];
    const recentEvent = {
      ts: "2026-07-02T10:00:00.000Z",
      country: "US",
      region: null,
      city: null,
      device: "mobile",
      referer: null,
    };
    const { db } = createDb([
      { table: "qr_codes", result: { data: CODE_ROW, error: null } },
      { table: "scan_daily", result: { data: dailyRows, error: null } },
      { table: "scan_events", result: { count: 4, error: null } },
      { table: "scan_events", result: { data: [recentEvent], error: null } },
    ]);

    const result = await getCodeAnalyticsCore(ctxWith(db), "ABCD234", 7 as RangeDays);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.code).toEqual(CODE_SUMMARY);
      expect(result.data.totals).toEqual({ scans: 8 });
      expect(result.data.today).toEqual({ scans: 4 });
      expect(result.data.topCountries).toEqual(
        expect.arrayContaining([
          { key: "US", count: 5 },
          { key: "CA", count: 3 },
        ]),
      );
      expect(result.data.topDevices).toEqual(
        expect.arrayContaining([
          { key: "mobile", count: 3 },
          { key: "desktop", count: 5 },
        ]),
      );
      expect(result.data.recentEvents).toEqual([recentEvent]);
    }
  });
});

describe("setCodeAccessCore — plan gate, sparse payload, password hashing", () => {
  beforeEach(() => {
    hashCodePasswordMock.mockClear();
  });

  it("returns empty_patch and never touches the db when neither field is supplied", async () => {
    const { db, from } = createDb([]);

    const result = await setCodeAccessCore(ctxWith(db), "code-1", {});

    expect(result).toEqual({ ok: false, error: "empty_patch" });
    expect(from).not.toHaveBeenCalled();
  });

  it("checks the plan BEFORE writing — a free plan returns plan_required with no qr_codes update", async () => {
    const { db, from } = createDb([{ table: "profiles", result: { data: { plan: "free" }, error: null } }]);

    const result = await setCodeAccessCore(ctxWith(db), "code-1", { expiresAt: null });

    expect(result).toEqual({ ok: false, error: "plan_required" });
    // Only the profile lookup — no qr_codes update attempted.
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("profiles");
  });

  it("builds a sparse update payload — expiresAt only sets expires_at, no password_hash key at all", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "active",
            expires_at: "2026-08-01T00:00:00.000Z",
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await setCodeAccessCore(ctxWith(db), "code-1", {
      expiresAt: "2026-08-01T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    const updatePayload = builders[1]!.calls.update![0]![0];
    expect(updatePayload).toEqual({ expires_at: "2026-08-01T00:00:00.000Z" });
    expect(hashCodePasswordMock).not.toHaveBeenCalled();
  });

  it("builds a sparse update payload — password only sets password_hash, no expires_at key at all", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "active",
            expires_at: null,
            password_hash: FAKE_HASH,
          },
          error: null,
        },
      },
    ]);

    const result = await setCodeAccessCore(ctxWith(db), "code-1", { password: "letmein1" });

    expect(result.ok).toBe(true);
    const updatePayload = builders[1]!.calls.update![0]![0] as { password_hash?: string };
    expect(Object.keys(updatePayload)).toEqual(["password_hash"]);
    // The plaintext is hashed BEFORE it ever reaches the update payload —
    // never stored/forwarded as-is.
    expect(updatePayload.password_hash).toBe(FAKE_HASH);
    expect(updatePayload.password_hash!.startsWith("scrypt$")).toBe(true);
    expect(hashCodePasswordMock).toHaveBeenCalledWith("letmein1");
  });

  it("password: null clears password protection — password_hash: null in the update payload", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    const result = await setCodeAccessCore(ctxWith(db), "code-1", { password: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.passwordProtected).toBe(false);
    }
    expect(builders[1]!.calls.update![0]![0]).toEqual({ password_hash: null });
    expect(hashCodePasswordMock).not.toHaveBeenCalled();
  });

  it("filters the update by owner_id and id, and scopes to kind=dynamic", async () => {
    writeSlugToKvMock.mockResolvedValueOnce({ synced: true });
    const { db, builders } = createDb([
      { table: "profiles", result: { data: { plan: "pro" }, error: null } },
      {
        table: "qr_codes",
        result: {
          data: {
            slug: "ABCD234",
            destination_url: "https://example.com",
            status: "active",
            expires_at: null,
            password_hash: null,
          },
          error: null,
        },
      },
    ]);

    await setCodeAccessCore(ctxWith(db), "code-1", { expiresAt: null });

    expect(eqCallsOf(builders[1]!)).toContainEqual(["owner_id", OWNER_ID]);
    expect(eqCallsOf(builders[1]!)).toContainEqual(["id", "code-1"]);
    expect(eqCallsOf(builders[1]!)).toContainEqual(["kind", "dynamic"]);
  });
});
