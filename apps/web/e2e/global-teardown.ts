import { readFile, rm } from "node:fs/promises";
import { createAdminClient } from "../lib/supabase/admin";
import { loadE2eEnv, requireEnv } from "./env";
import { manifestPath, type E2eFixtureManifest } from "./manifest";

/**
 * Layer 1 of the guardrail (see global-setup.ts's header for all four).
 * Deletes EXACTLY the one user id global-setup wrote to the manifest, and
 * nothing else — no `listUsers`, no email-pattern query, no "users that look
 * like a test fixture" heuristic of any kind. `auth.admin.deleteUser`
 * cascades through profiles -> {brand_kits, qr_codes, api_keys} ->
 * {qr_codes -> scan_events, scan_daily} (every one of those foreign keys is
 * `on delete cascade`, supabase/migrations/20260721000001_initial_schema.sql),
 * so one delete call is sufficient cleanup.
 *
 * If `cancel-in-progress` SIGKILLs a superseded run before this ever gets to
 * execute, that's expected and survivable — global-setup.ts's reap sweep is
 * the actual safety net for that case, not this file. This file only handles
 * the common case: the run finished (pass or fail) and got to clean up after
 * itself.
 */
export default async function globalTeardown(): Promise<void> {
  loadE2eEnv();

  const path = manifestPath();
  let manifest: E2eFixtureManifest;
  try {
    manifest = JSON.parse(await readFile(path, "utf8")) as E2eFixtureManifest;
  } catch {
    // No manifest — global-setup either never ran or failed before writing
    // one, so there is nothing this file could possibly know to delete.
    // Not an error: throwing here would mask whatever the real failure was.
    console.warn(`[e2e/global-teardown] no fixture manifest at ${path} — nothing to clean up.`);
    return;
  }

  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SECRET_KEY");
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(manifest.userId);
  if (error) {
    // Surfaced, not swallowed — a failed teardown leaves a real fixture user
    // behind. It will still be caught by the next run's reap sweep (>2h,
    // @e2e.qrcdn.test), so this is a loud warning rather than a thrown error
    // that would mark an otherwise-green suite run as failed.
    console.warn(
      `[e2e/global-teardown] failed to delete fixture user ${manifest.userId} (${manifest.email}): ${error.message} — the next run's reap sweep will catch it.`,
    );
  } else {
    console.log(`[e2e/global-teardown] deleted fixture user ${manifest.email} (${manifest.userId}).`);
  }

  await rm(path, { force: true });
}
