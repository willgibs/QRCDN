import { createClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";

/**
 * RLS-BYPASSING admin client — authenticates with `SUPABASE_SECRET_KEY`
 * (D9 — new `sb_secret_` key scheme), not the publishable key `server.ts`
 * uses. Every row-level-security policy in `supabase/migrations` is
 * invisible to this client: it can read and write across every profile's
 * data unconditionally.
 *
 * Server-only, and stronger than that: it must never be imported by any
 * module reachable from the client bundle, nor by any route/action that
 * merely needs the *caller's* identity (use `createClient()` in
 * `apps/web/lib/supabase/server.ts` for that — `getClaims()`/`getUser()`
 * still apply there). This client has no notion of "the current user" at
 * all — every query it runs is scoped by hand in application code.
 *
 * First consumer: the entitlement-driven retention purge cron
 * (`apps/web/app/api/cron/purge/route.ts`, P6-U2), which must delete
 * `scan_events` rows across every owner's codes on a schedule with no
 * request-scoped session to authenticate as.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
}
