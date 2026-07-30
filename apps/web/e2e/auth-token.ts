import { createAdminClient } from "../lib/supabase/admin";

// Relative imports only in e2e/ (no "@/" — see env.ts's header note).

/**
 * Mints a fresh, single-use magic-link token for `email` and returns its
 * `hashed_token` — the exact `auth.admin.generateLink` call global-setup.ts
 * used to make exactly once per suite run, before this unit (P9-U6).
 *
 * Extracted here so a sign-in step can call it AT TEST TIME, on every
 * attempt, instead of once at global-setup. Supabase magic-link tokens are
 * single-use, and money-path.spec.ts's `test.describe.serial` block retries
 * the WHOLE group from the top on any mid-suite failure (CI: `retries: 1`,
 * playwright.config.ts). With a token minted once into the manifest, a
 * retry re-submitted the SAME already-consumed token and deterministically
 * failed at `toHaveURL(/studio/)` — turning any transient flake anywhere
 * downstream of sign-in into a hard, unrecoverable failure that needed a
 * full manual rerun. Live evidence of exactly this: the E2E check run for
 * `12bdd5b` (P9-U4) shows a job-level "Re-run triggered" in its GitHub
 * Actions history — consistent with Playwright's own in-job retry being
 * unable to self-heal past a dead token, forcing a human-triggered rerun
 * (fresh job, fresh global-setup, fresh token) to go green. Recorded in
 * docs/STATUS.md's P9 entry.
 *
 * Calling this helper fresh on every attempt (first try AND any retry —
 * not conditioned on `testInfo.retry`, since that branch would add
 * complexity for no benefit: a fresh mint is cheap and correct either way)
 * means the sign-in step always exchanges a live token, so a real
 * transient failure later in the flow gets an honest second shot instead
 * of dying at the front door.
 *
 * global-setup.ts still creates the fixture user (and flips it to `pro`)
 * exactly as before — only the token mint moved out of that one-shot setup
 * phase and into this per-attempt helper. The manifest (manifest.ts) no
 * longer carries a token at all.
 */
export async function mintSignInToken(email: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    throw new Error(
      `[e2e/auth-token] failed to generate magic link for ${email}: ${error?.message ?? "no hashed_token returned"}`,
    );
  }
  return hashedToken;
}
