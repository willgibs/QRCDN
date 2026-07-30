"use server";

// Relative imports, not "@/" — this file has a companion vitest suite
// (actions.test.ts), and Vitest has no tsconfig-paths plugin configured in
// this repo (confirmed empirically by every prior P6/P7 unit — see
// app/api/cron/purge/route.test.ts's and lib/api-auth.test.ts's own header
// notes); "@/" only resolves under Next's own bundler.
import { headers } from "next/headers";
import { createAdminClient } from "../../../lib/supabase/admin";
import { verifyCodePassword } from "../../../lib/passwords";
import { checkRateLimit, ipSubject, P_UNLOCK_LIMIT } from "../../../lib/rate-limits";
import type { ActionResult } from "../../../lib/validation";

// P7.5-U2: the app's first PUBLIC (unauthenticated, reachable by anyone with
// the URL) server action. Everything above this line in every other server
// action file (code-actions.ts, actions.ts) starts with
// requireClaimsContext/requireUserContext — this one deliberately doesn't,
// because it can't: there is no session to authenticate here, by design
// (page.tsx never sets one either — see its own header comment).
//
// Rate-limiting / brute-force posture (condensed — full context: the D11
// amendment in docs/DECISIONS.md and the P8-U4 spec). Two separate
// concerns:
//   1. Existence + protection-status disclosure: a caller who reaches /p/
//      {slug} already knows the slug exists and is password-protected — the
//      QR code itself told them that. This action doesn't leak anything
//      beyond what scanning the physical code already reveals.
//   2. Password-guessing throughput: P8-U4 closed the gap this comment used
//      to describe as unmitigated. `checkRateLimit` (lib/rate-limits.ts,
//      backed by supabase/migrations/20260730000009_rate_limits.sql) now
//      caps this action at P_UNLOCK_LIMIT (8 calls / 5min) per (hashed ip,
//      slug), checked BEFORE the DB fetch and BEFORE verifyCodePassword
//      below — an over-limit caller never pays for, or even reaches, a
//      query or a scrypt hash. This is an APPLICATION-level limiter, not
//      the burst/WAF layer: D11's Vercel-Pro blocker (`@vercel/firewall`
//      checkRateLimit() + WAF rule) only ever applied to that separate
//      per-second layer, which remains unshipped, gated on the Pro plan
//      upgrade (/developers documents that gap honestly, unchanged by this
//      unit). Below this new gate, the pre-existing frictions are
//      unchanged and still doing real work for any caller who stays under
//      the window: scrypt's cost factor (N=2^15, apps/web/lib/passwords.ts
//      — tens of milliseconds of CPU per attempt) and this action's own
//      constant artificial delay on a wrong guess (below). checkRateLimit
//      fails OPEN by design (lib/rate-limits.ts) — a broken limiter allows
//      the call through rather than turning into an outage for every
//      legitimate unlock attempt.

const WRONG_PASSWORD_DELAY_MS = 150;

// A caller with no forwarded-for header at all (shouldn't happen behind
// Vercel in practice, but callerIp() below must still resolve to SOME
// stable subject rather than throw) shares this one bucket — a
// deliberately conservative fallback: worst case, unrelated callers with no
// header briefly share a rate-limit window with each other, never with any
// real caller's own IP-scoped budget.
const UNKNOWN_IP = "unknown";

function defaultDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
}

/**
 * First entry of a (possibly comma-separated, proxy-chain) `x-forwarded-for`
 * header, or UNKNOWN_IP when absent/empty. Next.js 16's `headers()` is
 * async-only (CLAUDE.md gotcha).
 */
async function callerIp(): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  if (!forwardedFor) {
    return UNKNOWN_IP;
  }
  const first = forwardedFor.split(",")[0]?.trim();
  return first && first.length > 0 ? first : UNKNOWN_IP;
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
 * distinguishable from every kind of wrong one. `rate_limited` (P8-U4) is
 * the one deliberate exception to that collapse: see the file header and
 * this unit's delivery report for why a distinct code here doesn't leak
 * anything a response-timing measurement wouldn't already reveal, given the
 * rate-limit check below runs BEFORE the scrypt-costed verify.
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

  // Rate-limited BEFORE the DB fetch and BEFORE verifyCodePassword — reject
  // cheaply, ahead of the scrypt cost (P8-U4; see file header). Subject is
  // scoped to the UPPERCASED slug (matching the lookup below) so a caller
  // can't dodge the limiter by toggling the slug's case across calls — this
  // action is reachable directly (a server action, not just through the
  // rendered form), so the client-side uppercasing page.tsx/UnlockForm
  // already do can't be relied on here.
  const ip = await callerIp();
  const rateLimit = await checkRateLimit(db, ipSubject(ip, `p_unlock:${slug.toUpperCase()}`), P_UNLOCK_LIMIT);
  if (!rateLimit.allowed) {
    return { ok: false, error: "rate_limited" };
  }

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
