import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createAdminClient } from "../lib/supabase/admin";
import { loadE2eEnv, requireEnv } from "./env";
import { manifestPath, type E2eFixtureManifest } from "./manifest";

// P8-U1's guardrail — this suite signs in as a real user and mints real
// dynamic codes/API keys against PRODUCTION Supabase (project
// yklhpbhfowuvxlwlalhf; there is no staging project). Four layers, all
// required, all documented here since this file is layer 1+2:
//
// 1. MANIFEST, NOT PATTERN-MATCHING. This file creates exactly ONE
//    throwaway user and writes its exact `auth.users.id` to a manifest
//    (manifest.ts) outside the repo tree. global-teardown.ts deletes ONLY
//    that id via `auth.admin.deleteUser` (every owned row cascades —
//    profiles/qr_codes/brand_kits/api_keys all carry
//    `references ... on delete cascade`, supabase/migrations/20260721000001_
//    initial_schema.sql). Teardown never lists or pattern-matches users.
// 2. REAP-ON-START SAFETY NET (this file, below). `.github/workflows/e2e.yml`
//    uses `concurrency: cancel-in-progress` (this repo's standing cost-control
//    posture, mirrored from ci.yml/rls.yml) — a superseded run gets SIGKILLed,
//    so `global-teardown.ts` may simply never run for it. Every run of THIS
//    file therefore sweeps `auth.users` first, before creating its own
//    fixture, deleting any user whose email ends `@e2e.qrcdn.test` AND whose
//    `created_at` is more than 2 hours old. `.test` is the IANA-reserved,
//    permanently-unresolvable TLD (RFC 2606) — no real address can ever end
//    `@e2e.qrcdn.test`, so this filter functions as a strict allowlist, not a
//    guess. 2 hours comfortably exceeds this workflow's own
//    `timeout-minutes: 15`, so a live concurrent run (a different PR/ref;
//    `concurrency` is scoped per-`github.ref`) is never at risk of being
//    reaped out from under itself.
// 3. Emails: `e2e-${randomUUID()}@e2e.qrcdn.test`, created via
//    `auth.admin.createUser({ email, password: randomUUID(), email_confirm:
//    true })` — the password is generated and discarded (never used again);
//    the manifest only ever carries the magic-link token below.
// 4. The fixture is flipped to `pro` (profiles.plan) so every Pro surface the
//    money path exercises — access controls, bulk create, vanity slugs — is
//    actually reachable, not just visible-but-locked.
export default async function globalSetup(): Promise<void> {
  loadE2eEnv();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SECRET_KEY");

  const admin = createAdminClient();

  await reapStaleFixtureUsers(admin);

  const email = `e2e-${randomUUID()}@e2e.qrcdn.test`;
  const password = randomUUID();

  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !createData.user) {
    throw new Error(
      `[e2e/global-setup] failed to create fixture user: ${createError?.message ?? "no user returned"}`,
    );
  }
  const userId = createData.user.id;

  await setProfileToPro(admin, userId);

  // No email is sent by generateLink (P8-U1 brief) — the spec exchanges
  // `hashed_token` directly against apps/web/app/auth/confirm/route.ts via
  // `?token_hash=<hashedToken>&type=magiclink&next=/studio`, the exact same
  // `verifyOtp({ token_hash, type })` call a real clicked email link drives.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    throw new Error(
      `[e2e/global-setup] failed to generate magic link for ${email}: ${linkError?.message ?? "no hashed_token returned"}`,
    );
  }

  const manifest: E2eFixtureManifest = {
    userId,
    email,
    hashedToken,
    createdAt: new Date().toISOString(),
  };
  await writeFile(manifestPath(), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`[e2e/global-setup] fixture ready: ${email} (${userId}), plan=pro`);
}

type AdminClient = ReturnType<typeof createAdminClient>;

const E2E_EMAIL_SUFFIX = "@e2e.qrcdn.test";
const REAP_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const LIST_PAGE_SIZE = 200;
// Defensive cap on the sweep loop (200 * 50 = 10k users) so a pathological
// listUsers response (or a bug in this loop) can't spin forever — this
// project will never come close to that many real signups while this
// guardrail is still relevant.
const MAX_LIST_PAGES = 50;

function isStaleFixtureUser(user: { email?: string; created_at: string }): boolean {
  if (!user.email || !user.email.endsWith(E2E_EMAIL_SUFFIX)) return false;
  return Date.now() - new Date(user.created_at).getTime() > REAP_AGE_MS;
}

async function reapStaleFixtureUsers(admin: AdminClient): Promise<void> {
  let reaped = 0;
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
    if (error) {
      console.warn(`[e2e/global-setup] reap sweep: listUsers(page ${page}) failed: ${error.message}`);
      break;
    }

    for (const user of data.users.filter(isStaleFixtureUser)) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.warn(`[e2e/global-setup] reap sweep: deleteUser(${user.id}) failed: ${deleteError.message}`);
        continue;
      }
      reaped++;
    }

    if (data.nextPage === null) break;
  }
  if (reaped > 0) {
    console.log(`[e2e/global-setup] reap sweep: deleted ${reaped} stale fixture user(s) (>2h old, @e2e.qrcdn.test).`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The `on_auth_user_created` trigger (supabase/migrations/20260721000001_
 * initial_schema.sql) inserts `profiles` in the SAME transaction as the
 * `auth.users` insert `createUser` just performed, so the row should already
 * exist by the time we get here — this retries a couple of times purely as
 * defense-in-depth against the row not being visible yet (e.g. read-replica
 * lag), not because the trigger is expected to race in practice.
 */
async function setProfileToPro(admin: AdminClient, userId: string): Promise<void> {
  const attempts = 3;
  let lastMessage = "profile row not found";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data, error } = await admin
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (!error && data) return;
    lastMessage = error?.message ?? lastMessage;
    if (attempt < attempts - 1) await sleep(300);
  }
  throw new Error(`[e2e/global-setup] failed to flip fixture profile ${userId} to pro: ${lastMessage}`);
}
