import type { SupabaseClient } from "@supabase/supabase-js";
import type { KvSlugRecord } from "@qrcdn/shared";
import {
  parseQrStyle,
  type Database,
  type QrStyle,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "@qrcdn/shared";
import { PLAN_LIMITS, type Plan } from "./entitlements";
import { generateSlug, validateVanitySlug } from "./slug";
import { writeSlugToKv } from "./kv-sync";
import { hashCodePassword } from "./passwords";
import {
  validateCodeAccessInput,
  validateDestination,
  validateDynamicCodeInput,
  validatePaused,
  type ActionResult,
} from "./validation";
import {
  rangeWindowUtc,
  sumBuckets,
  toChartSeries,
  type BucketCount,
  type ChartPoint,
  type RangeDays,
} from "./analytics";

// ---------------------------------------------------------------------------
// P7-U2: owner-scoped core extracted from
// apps/web/app/(app)/studio/code-actions.ts. This module exists so the exact
// same business logic can be invoked from TWO auth paths:
//   1. Studio server actions (code-actions.ts) — cookie session, RLS-scoped
//      client from lib/supabase/server.ts. Every filter below is redundant
//      defense-in-depth there (RLS already scopes rows to the caller).
//   2. The public API (P7, key-authenticated, no cookies) — admin client
//      from lib/supabase/admin.ts, which BYPASSES RLS entirely.
//
// THE LOAD-BEARING RULE: every single query in this file carries an explicit
// owner filter.
//   - Every `qr_codes` select/update carries `.eq("owner_id", ctx.ownerId)`.
//   - Every `qr_codes` insert sets `owner_id: ctx.ownerId` in the payload.
//   - scan_daily / scan_events have no owner_id column at all — they are
//     only ever queried with a `code_id` that was FIRST produced by an
//     owner-scoped `qr_codes` lookup in THIS file (getCodeBySlugCore, or a
//     `qr_codes` update's own `.eq("owner_id", ...)` — see
//     getCodeAnalyticsCore, which resolves ownership before it ever touches
//     a scan table: this is the IDOR guard).
// Under the API's admin client, the `.eq("owner_id", ...)` filter is the
// ONLY tenant boundary in the system — RLS is not there to catch a mistake.
// A missed filter here is a cross-tenant data leak reachable from the public
// internet. Every query chain below was re-checked against this rule before
// commit; check it again before changing any query in this file.
// ---------------------------------------------------------------------------

export interface CodesCoreCtx {
  db: SupabaseClient<Database>;
  ownerId: string;
}

export type QrCode = Tables<"qr_codes">;

/** Columns the codes-list UI needs — never the frozen `style` snapshot
 *  (large jsonb, including a possible logo data URI) and never a write path
 *  for `scan_count` (D8: rollup-only). `expiresAt`/`passwordProtected`
 *  (P7.5-U2) are DERIVED from `expires_at`/`password_hash`, not the raw
 *  columns themselves — see `toSummary` below for THE INVARIANT this
 *  exists to enforce: the raw `password_hash` string never crosses this
 *  boundary. */
export type DynamicCodeSummary = Pick<
  Tables<"qr_codes">,
  "id" | "slug" | "name" | "destination_url" | "status" | "scan_count" | "created_at"
> & {
  /** ISO-8601 UTC, or `null` when the code never expires. */
  expiresAt: string | null;
  /** Derived from `password_hash !== null` — never the hash itself. */
  passwordProtected: boolean;
};

/** Every column a summary-shaped query needs to select — one constant so
 *  every call site (listDynamicCodesCore, getCodeBySlugCore) stays in sync
 *  with `toSummary`'s destructuring below. */
const SUMMARY_SELECT =
  "id, slug, name, destination_url, status, scan_count, created_at, expires_at, password_hash" as const;

type SummaryRow = Pick<
  Tables<"qr_codes">,
  | "id"
  | "slug"
  | "name"
  | "destination_url"
  | "status"
  | "scan_count"
  | "created_at"
  | "expires_at"
  | "password_hash"
>;

/**
 * THE INVARIANT (P7.5-U2): the raw `password_hash` string never crosses the
 * codes-core boundary — not into a Server Component prop, not into API
 * JSON, not anywhere past this function. Every query in this file that
 * returns a `DynamicCodeSummary` funnels its row through `toSummary`, which
 * destructures `password_hash` away and keeps only the derived
 * `passwordProtected` boolean. If you add a new summary-shaped query below,
 * route it through this function rather than hand-mapping the row.
 */
function toSummary(row: SummaryRow): DynamicCodeSummary {
  const { password_hash, expires_at, ...rest } = row;
  return { ...rest, expiresAt: expires_at, passwordProtected: password_hash !== null };
}

/**
 * The KV write-through record for a row that just changed (retarget, pause,
 * or access-control update) — the STRUCTURAL FIX for the retarget/pause
 * KV-wipe bug: before P7.5-U2, `retargetCodeCore`/`setCodePausedCore` each
 * built their `KvSlugRecord` literal inline with only `destination`/
 * `paused`/`codeId` set, which meant retargeting or pausing a code SILENTLY
 * DROPPED its `expiresAt`/`passwordProtected` flags from KV (the write-
 * through overwrites the whole record) even though Postgres still had them.
 * Every `writeSlugToKv` call site in this file must build its record via
 * this function instead of a literal, so the three flags can never drift
 * apart again. Conditional-assigns mirror packages/shared/src/kv.ts's own
 * additive-optional style (and workers/redirect/src/redirect-decision.ts's
 * `buildKvBackfillRecord`, the Worker-side equivalent): a row with no
 * expiry/no password produces a record with those keys OMITTED, not set to
 * `false`/`undefined`, so pre-P7.5 KV entries and post-P7.5 unprotected
 * codes are byte-identical.
 */
function toKvRecord(
  row: Pick<QrCode, "destination_url" | "status" | "expires_at" | "password_hash">,
  codeId: string,
): KvSlugRecord {
  const record: KvSlugRecord = {
    destination: row.destination_url ?? "",
    paused: row.status === "paused",
    codeId,
  };
  if (row.expires_at) {
    record.expiresAt = row.expires_at;
  }
  if (row.password_hash !== null) {
    record.passwordProtected = true;
  }
  return record;
}

type RecentEvent = Pick<
  Tables<"scan_events">,
  "ts" | "country" | "region" | "city" | "device" | "referer"
>;

export interface CodeAnalytics {
  code: DynamicCodeSummary;
  series: ChartPoint[];
  totals: { scans: number };
  today: { scans: number };
  topCountries: BucketCount[];
  topDevices: BucketCount[];
  /** Last 10 raw scan_events for this code, newest first — the live-activity
   *  feed codes/[slug]/page.tsx renders alongside the scan_daily-derived
   *  chart (scan_daily lags up to an hour behind, D8, so this is the only
   *  source for "what just happened"). */
  recentEvents: RecentEvent[];
}

const MAX_SLUG_ATTEMPTS = 5;
const RECENT_EVENTS_LIMIT = 10;

/**
 * Counts the caller's non-archived dynamic codes against their plan limit.
 * "archived" is the closest thing this schema has to a soft-delete state for
 * qr_codes (CLAUDE.md: codes are never actually deleted) — no action in this
 * unit can produce one, but excluding it here is the correct reading of "count
 * existing non-deleted codes" against a schema with no deleted_at column.
 * Paused codes still count (D14: they keep existing, just go read-only
 * beyond the free cap).
 */
async function dynamicCodeCountFor(ctx: CodesCoreCtx): Promise<number | null> {
  const { count, error } = await ctx.db
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ctx.ownerId)
    .eq("kind", "dynamic")
    .neq("status", "archived");
  if (error) {
    return null;
  }
  return count ?? 0;
}

/**
 * The insert (+ auto-slug retry loop) at the bottom of `createDynamicCodeCore`
 * — extracted verbatim (P7.5-U3) so a caller-chosen vanity slug and an
 * auto-generated one can share the same insert shape without duplicating it.
 *
 * `args.slug` present (vanity, already validated/normalized by the caller):
 * a SINGLE insert attempt with that exact slug. A `23505` (Postgres
 * unique_violation — slug is the table's only unique column) here is a real
 * collision on a slug the *caller* picked, so it's surfaced as `slug_taken`
 * for them to resolve — never silently retried with a different slug they
 * didn't ask for.
 *
 * `args.slug` absent (auto path): byte-identical to the pre-extraction
 * behavior — `generateSlug()` + up to `MAX_SLUG_ATTEMPTS` retries on a
 * `23505`, `slug_exhausted` if every attempt collides.
 */
async function insertDynamicCode(
  ctx: CodesCoreCtx,
  args: { name: string; destination: string; style: unknown; slug?: string },
): Promise<ActionResult<QrCode>> {
  function payloadFor(slug: string): TablesInsert<"qr_codes"> {
    return {
      owner_id: ctx.ownerId,
      slug,
      kind: "dynamic",
      name: args.name,
      destination_url: args.destination,
      // Frozen snapshot at creation — never mutated by brand-kit edits
      // afterward (D5 hard rule). No update path in this file accepts a
      // style param.
      style: args.style as TablesInsert<"qr_codes">["style"],
    };
  }

  if (args.slug !== undefined) {
    const { data, error } = await ctx.db
      .from("qr_codes")
      .insert(payloadFor(args.slug))
      .select()
      .single();

    if (!error && data) {
      return { ok: true, data };
    }
    if (error?.code === "23505") {
      return { ok: false, error: "slug_taken" };
    }
    return { ok: false, error: "insert_failed" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { data, error } = await ctx.db
      .from("qr_codes")
      .insert(payloadFor(generateSlug()))
      .select()
      .single();

    if (!error && data) {
      return { ok: true, data };
    }

    // 23505 = Postgres unique_violation. slug is the table's only unique
    // column, so any 23505 here is a slug collision — retry with a fresh
    // draw. Anything else is a real failure; stop immediately.
    if (error?.code !== "23505") {
      return { ok: false, error: "insert_failed" };
    }
  }

  return { ok: false, error: "slug_exhausted" };
}

export async function createDynamicCodeCore(
  ctx: CodesCoreCtx,
  input: { name: unknown; destination: unknown; style: unknown; slug?: unknown },
): Promise<ActionResult<QrCode>> {
  const validated = validateDynamicCodeInput(input);
  if (!validated.ok) {
    return validated;
  }

  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("plan")
    .eq("id", ctx.ownerId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  // PLAN_LIMITS is the only source of entitlement limits (CLAUDE.md hard
  // rule) — free/pro both come from apps/web/lib/entitlements.ts.
  const plan = profile.plan as Plan;
  const limit = PLAN_LIMITS[plan].dynamicCodes;

  // Vanity slug (P7.5-U3, Pro-gated): resolved right after the plan fetch,
  // before the count/limit check below, so a disallowed or malformed slug
  // never costs a second query. `input.slug` absent (undefined) takes
  // exactly today's auto-generated path — `slug` stays undefined and
  // insertDynamicCode below runs its retry loop unchanged.
  let slug: string | undefined;
  if (input.slug !== undefined) {
    if (!PLAN_LIMITS[plan].vanitySlugs) {
      return { ok: false, error: "vanity_slugs_not_available" };
    }
    const slugResult = validateVanitySlug(input.slug);
    if (!slugResult.ok) {
      return slugResult;
    }
    slug = slugResult.data;
  }

  const existingCount = await dynamicCodeCountFor(ctx);
  if (existingCount === null) {
    return { ok: false, error: "code_count_failed" };
  }
  // Check-then-insert race accepted, not fixed — same call as
  // createBrandKit's kit_limit check.
  if (existingCount >= limit) {
    return { ok: false, error: "code_limit" };
  }

  return insertDynamicCode(ctx, {
    name: validated.data.name,
    destination: validated.data.destination,
    style: validated.data.style,
    slug,
  });
}

export async function listDynamicCodesCore(
  ctx: CodesCoreCtx,
): Promise<ActionResult<DynamicCodeSummary[]>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select(SUMMARY_SELECT)
    .eq("owner_id", ctx.ownerId)
    .eq("kind", "dynamic")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { ok: false, error: "list_failed" };
  }

  return { ok: true, data: data.map(toSummary) };
}

/**
 * Fetches a single code's frozen style snapshot (P5-U4 "Load in studio").
 * Read-only. `id` is expected to already be a validated uuid string — see
 * code-actions.ts's `getDynamicCodeStyle`, which validates the raw
 * (`unknown`) input via `validateQrCodeId` before delegating here.
 */
export async function getDynamicCodeStyleCore(
  ctx: CodesCoreCtx,
  id: string,
): Promise<ActionResult<QrStyle>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select("style")
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .single();

  if (error || !data) {
    // Covers both "not found" and "not yours" — under RLS the two are
    // indistinguishable from here; under the admin client this same
    // `owner_id` filter now enforces the same thing directly.
    return { ok: false, error: "not_found" };
  }

  try {
    const style = parseQrStyle(data.style);
    return { ok: true, data: style };
  } catch {
    // A corrupted/unparseable snapshot never crashes the "Load in studio"
    // flow — it surfaces as a normal action error instead.
    return { ok: false, error: "invalid_style" };
  }
}

export async function retargetCodeCore(
  ctx: CodesCoreCtx,
  id: string,
  destination: unknown,
): Promise<ActionResult<{ id: string; destinationUrl: string; kvSynced: boolean }>> {
  const destinationResult = validateDestination(destination);
  if (!destinationResult.ok) {
    return destinationResult;
  }

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update({ destination_url: destinationResult.data })
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  // Postgres UPDATE already committed above — this is best-effort
  // write-through (D2). A KV failure does NOT fail the action; worst case
  // is ~5min staleness until the Worker's own read-through backfill.
  // toKvRecord (not a hand-built literal) is the P7.5-U2 fix for the
  // retarget-wipes-expiry/password-flags bug — see its own doc comment.
  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: { id, destinationUrl: data.destination_url ?? "", kvSynced: kvResult.synced },
  };
}

export async function setCodePausedCore(
  ctx: CodesCoreCtx,
  id: string,
  paused: unknown,
): Promise<ActionResult<{ id: string; status: string; kvSynced: boolean }>> {
  const pausedResult = validatePaused(paused);
  if (!pausedResult.ok) {
    return pausedResult;
  }

  const nextStatus = pausedResult.data ? "paused" : "active";

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update({ status: nextStatus })
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  // toKvRecord (not a hand-built literal) — same P7.5-U2 fix as
  // retargetCodeCore above, see toKvRecord's doc comment.
  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: { id, status: data.status, kvSynced: kvResult.synced },
  };
}

/**
 * Sets/clears a dynamic code's expiry and/or password protection (P7.5-U2).
 * Plan-gated (PLAN_LIMITS[plan].accessControls, CLAUDE.md hard rule: limits
 * live only in entitlements.ts) — checked BEFORE the update runs, so a
 * free-plan caller's request never reaches the qr_codes table at all.
 *
 * The update payload is built sparse: only the keys the caller actually
 * supplied are set on the Postgres UPDATE, mirroring validateCodeAccessInput
 * distinguishing "omitted" (leave alone) from "explicitly null" (clear).
 * `password` hashing happens HERE and ONLY here — `hashCodePassword` is
 * never called from any other file — so the raw password string's lifetime
 * is confined to this one function body.
 */
export async function setCodeAccessCore(
  ctx: CodesCoreCtx,
  id: string,
  input: { expiresAt?: unknown; password?: unknown },
): Promise<
  ActionResult<{ id: string; expiresAt: string | null; passwordProtected: boolean; kvSynced: boolean }>
> {
  const validated = validateCodeAccessInput(input);
  if (!validated.ok) {
    return validated;
  }

  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("plan")
    .eq("id", ctx.ownerId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  const plan = profile.plan as Plan;
  if (!PLAN_LIMITS[plan].accessControls) {
    return { ok: false, error: "plan_required" };
  }

  const patch: TablesUpdate<"qr_codes"> = {};
  if (validated.data.expiresAt !== undefined) {
    patch.expires_at = validated.data.expiresAt;
  }
  if (validated.data.password !== undefined) {
    patch.password_hash =
      validated.data.password === null ? null : await hashCodePassword(validated.data.password);
  }

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update(patch)
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: {
      id,
      expiresAt: data.expires_at,
      passwordProtected: data.password_hash !== null,
      kvSynced: kvResult.synced,
    },
  };
}

/**
 * Owner-scoped lookup by slug — the entry point for both the future
 * per-slug API route and `getCodeAnalyticsCore` below. `kind = "dynamic"`
 * mirrors every other lookup in this file (static codes have no analytics
 * surface).
 */
export async function getCodeBySlugCore(
  ctx: CodesCoreCtx,
  slug: string,
): Promise<ActionResult<DynamicCodeSummary>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select(SUMMARY_SELECT)
    .eq("owner_id", ctx.ownerId)
    .eq("slug", slug)
    .eq("kind", "dynamic")
    .single();

  if (error || !data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, data: toSummary(data) };
}

/**
 * Models the three query groups `codes/[slug]/page.tsx` runs today:
 * scan_daily rows over the resolved range, a live "today" count, and the
 * last 10 raw scan_events. Resolves ownership via `getCodeBySlugCore`
 * FIRST — every scan-table query below uses `code.id` from that owner-scoped
 * result, never the raw `slug` argument directly (IDOR guard: a caller who
 * doesn't own `slug` never reaches a scan-table query at all).
 */
export async function getCodeAnalyticsCore(
  ctx: CodesCoreCtx,
  slug: string,
  range: RangeDays,
): Promise<ActionResult<CodeAnalytics>> {
  const codeResult = await getCodeBySlugCore(ctx, slug);
  if (!codeResult.ok) {
    return codeResult;
  }
  const code = codeResult.data;

  const { startIso, endIso } = rangeWindowUtc(range);

  const { data: dailyRows, error: dailyError } = await ctx.db
    .from("scan_daily")
    .select("day, scans, uniques, by_country, by_device")
    .eq("code_id", code.id)
    .gte("day", startIso)
    .lt("day", endIso)
    .order("day");

  if (dailyError) {
    return { ok: false, error: "analytics_failed" };
  }
  const rows = dailyRows ?? [];

  // "today" never comes from scan_daily (it lags up to an hour behind the
  // rollup cron, D8) — a live count against scan_events instead.
  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const { count: scansToday, error: todayError } = await ctx.db
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("code_id", code.id)
    .gte("ts", todayStartIso);

  if (todayError) {
    return { ok: false, error: "analytics_failed" };
  }

  const { data: recentEvents, error: recentError } = await ctx.db
    .from("scan_events")
    .select("ts, country, region, city, device, referer")
    .eq("code_id", code.id)
    .order("ts", { ascending: false })
    .limit(RECENT_EVENTS_LIMIT);

  if (recentError) {
    return { ok: false, error: "analytics_failed" };
  }

  return {
    ok: true,
    data: {
      code,
      series: toChartSeries(rows, range),
      totals: { scans: rows.reduce((sum, row) => sum + row.scans, 0) },
      today: { scans: scansToday ?? 0 },
      topCountries: sumBuckets(rows.map((row) => row.by_country)),
      topDevices: sumBuckets(rows.map((row) => row.by_device)),
      recentEvents: recentEvents ?? [],
    },
  };
}
