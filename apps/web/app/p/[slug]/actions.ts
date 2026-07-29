"use server";

// Relative imports, not "@/" — this file has a companion vitest suite
// (actions.test.ts), and Vitest has no tsconfig-paths plugin configured in
// this repo (confirmed empirically by every prior P6/P7 unit — see
// app/api/cron/purge/route.test.ts's and lib/api-auth.test.ts's own header
// notes); "@/" only resolves under Next's own bundler.
import { createAdminClient } from "../../../lib/supabase/admin";
import { verifyCodePassword } from "../../../lib/passwords";
import type { ActionResult } from "../../../lib/validation";

// P7.5-U2: the app's first PUBLIC (unauthenticated, reachable by anyone with
// the URL) server action. Everything above this line in every other server
// action file (code-actions.ts, actions.ts) starts with
// requireClaimsContext/requireUserContext — this one deliberately doesn't,
// because it can't: there is no session to authenticate here, by design
// (page.tsx never sets one either — see its own header comment).
//
// Rate-limiting / brute-force posture (condensed — full context: the D11
// amendment in docs/DECISIONS.md and the P7.5 spec). Two separate concerns:
//   1. Existence + protection-status disclosure: a caller who reaches /p/
//      {slug} already knows the slug exists and is password-protected — the
//      QR code itself told them that. This action doesn't leak anything
//      beyond what scanning the physical code already reveals.
//   2. Password-guessing throughput: THIS is the real risk, and there is no
//      per-IP/per-slug rate limiting in front of this action yet — that's
//      P10 (Turnstile/WAF), blocked by the same D11-amendment constraint
//      that's blocked rate limiting everywhere else in this codebase so
//      far. Until then, the two frictions below are the entire defense:
//      scrypt's cost factor (N=2^15, apps/web/lib/passwords.ts — tens of
//      milliseconds of CPU per attempt) and this action's own constant
//      artificial delay on a wrong guess (below). Both are DOCUMENTED
//      INTERIM measures, not a claim that this is sufficient against a
//      sustained, distributed guessing attack.

const WRONG_PASSWORD_DELAY_MS = 150;

function defaultDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
}

/**
 * Verifies a guessed password against a code's stored hash and returns its
 * destination on success. `deps.delay` is injectable so tests can assert the
 * wrong-password path awaits SOME delay without actually waiting
 * WRONG_PASSWORD_DELAY_MS in the test run.
 *
 * Always re-fetches the row fresh via the admin client (TOCTOU guard) rather
 * than trusting anything the page/client passed in — the code's status/
 * expiry/password could have changed between the page render and this
 * submit. Every failure branch below (not-found, non-active, expired)
 * collapses to the same generic `"unavailable"` error so a wrong-guess
 * response can't be used to distinguish "code doesn't exist" from "code
 * expired 5 minutes ago" from "wrong password" — only a right guess is ever
 * distinguishable from every kind of wrong one.
 */
export async function verifyCodeAccess(
  slug: unknown,
  password: unknown,
  deps: { delay?: () => Promise<void> } = {},
): Promise<ActionResult<{ destination: string }>> {
  const delay = deps.delay ?? defaultDelay;

  if (typeof slug !== "string" || slug.length === 0 || typeof password !== "string") {
    return { ok: false, error: "unavailable" };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("qr_codes")
    .select("destination_url, status, expires_at, password_hash")
    .eq("slug", slug.toUpperCase())
    .eq("kind", "dynamic")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "unavailable" };
  }
  if (data.status !== "active") {
    return { ok: false, error: "unavailable" };
  }
  if (data.expires_at && new Date() >= new Date(data.expires_at)) {
    return { ok: false, error: "unavailable" };
  }

  const destination = data.destination_url ?? "";

  if (data.password_hash === null) {
    // Fail-open: reachable when a stale KV entry routed a scan here for a
    // code whose password was just removed (or that was never protected in
    // the first place) — "your code never dies" (CLAUDE.md hard rule) means
    // this must not become a dead end just because the cache lagged truth.
    return { ok: true, data: { destination } };
  }

  const correct = await verifyCodePassword(password, data.password_hash);
  if (!correct) {
    await delay();
    return { ok: false, error: "incorrect" };
  }

  return { ok: true, data: { destination } };
}
