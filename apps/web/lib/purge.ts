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
// The caller (apps/web/app/api/cron/purge/route.ts) supplies the admin
// client rather than this module creating one — keeps this file directly
// unit-testable with a hand-rolled chain-mock (see purge.test.ts) and free
// of any dependency on `createAdminClient()`'s env-var requirements.

/** PostgREST's per-request row cap. */
const PROFILE_PAGE_SIZE = 1000;
/** Delete in bounded batches rather than one `.in()` with every id. */
const DELETE_CHUNK_SIZE = 500;

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
