import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";
import type { Plan } from "./entitlements";

// Entitlement-driven raw-event purge (D8: "free 30d raw, Pro 365d"; retention
// days themselves live only in apps/web/lib/entitlements.ts). REST-only —
// no `.rpc()` — matching the rest of this codebase's Supabase convention
// (see apps/web/app/(app)/studio/code-actions.ts). Several bounded
// statements rather than one giant DELETE: PostgREST caps `max_rows` at
// 1000/request, and Postgres itself does better with bounded deletes than
// one massive transaction.
//
// P9.6-U1 adds a second purge below, `purgeScanDailyRollups`: nothing had
// ever trimmed `scan_daily` (the rollup table) before this unit — only raw
// `scan_events` was bounded. Same file, same "admin client passed in by the
// caller" shape, but a DIFFERENT retention rule: see
// `SCAN_DAILY_ROLLUP_RETENTION_DAYS`'s own comment for why it is a global
// storage bound rather than a `Plan`-keyed entitlement, unlike everything
// above it in this file.
//
// The caller (apps/web/app/api/cron/purge/route.ts) supplies the admin
// client rather than this module creating one — keeps this file directly
// unit-testable with a hand-rolled chain-mock (see purge.test.ts) and free
// of any dependency on `createAdminClient()`'s env-var requirements.

/** PostgREST's per-request row cap. */
const PROFILE_PAGE_SIZE = 1000;
/** Delete in bounded batches rather than one `.in()` with every id. */
const DELETE_CHUNK_SIZE = 500;

/**
 * How long a `scan_daily` rollup row survives before `purgeScanDailyRollups`
 * deletes it — 400 days, deliberately NOT one of `PLAN_LIMITS[plan].
 * analyticsRetentionDays` (30 free / 365 Pro). Two reasons this lives here
 * and not in `apps/web/lib/entitlements.ts`, despite the hard rule that
 * entitlement limits live there ONLY:
 *
 *   1. It isn't an entitlement. `entitlements.ts`'s hard rule exists to stop
 *      the exact failure D8's own amendment records — a second copy of a
 *      PER-PLAN number drifting from the first. This constant has no plan
 *      dimension: every rollup row, free or Pro, is trimmed at the same
 *      age. Filing a plan-invariant constant under a module whose entire
 *      job is "the numbers that vary BY plan" would misrepresent it — a
 *      future reader could reasonably assume anything exported from
 *      entitlements.ts varies by plan and go looking for the Free/Pro
 *      split that doesn't exist, or "fix" that by folding it into
 *      `PlanLimits` and inventing a split that shouldn't exist either.
 *   2. 400, not 365, is itself the tell: this is a STORAGE bound with
 *      headroom above the longest RETENTION promise (Pro's 365-day
 *      `analyticsRetentionDays`), not a retention promise itself. A Pro
 *      user viewing the 1-year chart range must never see the purge edge
 *      inside their own window — if this were 365 and ran the same day as
 *      a user's request, the oldest day of their own "last 365 days" view
 *      could already be gone. 400 days of slack (~5 extra weeks) makes that
 *      impossible in practice given this purge runs at most daily.
 *
 * Co-located with `purgeScanDailyRollups`, its only reader, instead of a
 * third file invented just to hold one number.
 */
export const SCAN_DAILY_ROLLUP_RETENTION_DAYS = 400;

/** Bounded calendar-day window per `scan_daily` delete call — same "several
 *  bounded statements, not one giant DELETE" reasoning as DELETE_CHUNK_SIZE
 *  above, sized for a dimension (days) instead of a row-id list. In steady
 *  state (this purge runs ~daily) each run only ever has ~1 stale day to
 *  clear; this bound only matters for a large one-time backlog (e.g. the
 *  purge having been broken or unscheduled for a long stretch). */
const DAY_CHUNK_SIZE = 30;

/** `"YYYY-MM-DD" + N days -> "YYYY-MM-DD"`, UTC. Mirrors
 *  apps/web/lib/analytics.ts's `toDateOnlyIso`/`DAY_MS` pattern (not
 *  imported: that module is deliberately I/O-free and has no reason to
 *  depend on this one, or vice versa). */
function addDaysIso(dateOnlyIso: string, days: number): string {
  const ms = Date.parse(`${dateOnlyIso}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

type ProfileWithCodeIds = { qr_codes: { id: string }[] | null };

/** Every `qr_codes.id` owned by a profile on `plan`, paginated defensively
 *  even though today's per-plan counts are tiny — PostgREST silently caps
 *  any single request at `PROFILE_PAGE_SIZE` rows regardless of what's
 *  asked for, so a short page is the only reliable "no more pages" signal. */
async function collectCodeIdsForPlan(
  admin: SupabaseClient<Database>,
  plan: Plan,
): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await admin
      .from("profiles")
      .select("qr_codes(id)")
      .eq("plan", plan)
      .range(offset, offset + PROFILE_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as ProfileWithCodeIds[];
    for (const row of page) {
      for (const code of row.qr_codes ?? []) {
        ids.push(code.id);
      }
    }

    if (page.length < PROFILE_PAGE_SIZE) break;
    offset += PROFILE_PAGE_SIZE;
  }

  return ids;
}

/**
 * Deletes `scan_events` rows older than `cutoffIso` belonging to codes owned
 * by profiles on `plan`. Returns the total number of rows deleted. Throws on
 * any Supabase error — the caller (the cron route) is responsible for
 * catching per-plan so one plan's failure doesn't stop the other's purge.
 */
export async function purgePlanScanEvents(
  admin: SupabaseClient<Database>,
  plan: Plan,
  cutoffIso: string,
): Promise<number> {
  const codeIds = await collectCodeIdsForPlan(admin, plan);
  if (codeIds.length === 0) {
    return 0;
  }

  let deleted = 0;
  for (let i = 0; i < codeIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = codeIds.slice(i, i + DELETE_CHUNK_SIZE);
    const { count, error } = await admin
      .from("scan_events")
      .delete({ count: "exact" })
      .lt("ts", cutoffIso)
      .in("code_id", chunk);

    if (error) throw error;
    deleted += count ?? 0;
  }

  return deleted;
}

/**
 * Deletes `scan_daily` rows with `day < cutoffIso` (a date-only
 * `"YYYY-MM-DD"` string — `scan_daily.day` is a `date` column, string
 * comparison against that format is exact, same convention
 * apps/web/lib/analytics.ts's `rangeWindowUtc` relies on). Global, not
 * scoped by plan or owner — see `SCAN_DAILY_ROLLUP_RETENTION_DAYS`'s own
 * comment for why. Returns the total rows deleted.
 *
 * Chunked by calendar-day window (`DAY_CHUNK_SIZE` days per DELETE) rather
 * than one unbounded statement, same bounded-batches philosophy as
 * `purgePlanScanEvents` above, adapted to `scan_daily`'s natural dimension:
 * there's no owner-scoped id list to page through here (this rule isn't
 * owner-scoped), so this finds the single oldest stale day once, then walks
 * forward to `cutoffIso` in fixed windows. Short-circuits to one cheap query
 * and a `0` return whenever nothing is stale yet — the common case for a
 * long time to come, since 400 days of headroom means the earliest this
 * table can have anything to purge is roughly 400 days after this unit
 * shipped.
 *
 * KNOWN LIMITATION (verified against
 * supabase/migrations/20260723000007_scan_rollup.sql while building this,
 * flagged in P9.6-U1's report and docs/DECISIONS.md's D8 amendment — not
 * fixed here, since fixing it means changing how `rollup_scan_daily()`
 * maintains `scan_count`, a different migration this unit does not own):
 * `qr_codes.scan_count` is maintained by a full RESUM over every
 * currently-present `scan_daily` row for a code, every time that code is
 * "touched" (scanned again) — not an incremental counter. Once this
 * function has actually deleted a code's older rows, the next resum for
 * that code (if it's ever scanned again) will only see the rows that
 * survived, silently undercounting relative to true lifetime scans by
 * whatever this function already removed. A code that goes permanently
 * quiet before its old rows age out is unaffected — its `scan_count` is
 * simply never recomputed again, and stays at its last (accurate) value
 * forever. Only an ACTIVELY-scanned code with >400 days of history is
 * exposed, and only after this function starts actually deleting rows for
 * it (not reachable for a long time given this product's age).
 */
export async function purgeScanDailyRollups(
  admin: SupabaseClient<Database>,
  cutoffIso: string,
): Promise<number> {
  const { data: oldest, error: oldestError } = await admin
    .from("scan_daily")
    .select("day")
    .lt("day", cutoffIso)
    .order("day", { ascending: true })
    .limit(1);

  if (oldestError) throw oldestError;
  if (!oldest || oldest.length === 0) {
    return 0;
  }

  let cursor = oldest[0]!.day;
  let deleted = 0;

  while (cursor < cutoffIso) {
    const chunkEnd = addDaysIso(cursor, DAY_CHUNK_SIZE);
    const windowEnd = chunkEnd < cutoffIso ? chunkEnd : cutoffIso;

    const { count, error } = await admin
      .from("scan_daily")
      .delete({ count: "exact" })
      .gte("day", cursor)
      .lt("day", windowEnd);

    if (error) throw error;
    deleted += count ?? 0;
    cursor = windowEnd;
  }

  return deleted;
}
