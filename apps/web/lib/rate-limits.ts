import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";

// Postgres-backed application-level rate limiting (P8-U4). Design rationale:
// docs/DECISIONS.md D11's amendment records rate limiting as blocked on a
// Vercel Pro upgrade -- but that's about `@vercel/firewall`'s
// checkRateLimit() + WAF rule specifically, the burst/per-second layer in
// front of the whole app. It never blocked an application-level limiter
// backed by this project's own Postgres -- this module + migration
// 20260730000009_rate_limits.sql are that limiter, zero new dependencies,
// no plan change. Two call sites: apps/web/app/p/[slug]/actions.ts
// (verifyCodeAccess, per (hashed ip, slug), checked ahead of the scrypt
// password-verify cost) and apps/web/app/(app)/studio/code-actions.ts
// (per user, on every mutating action).
//
// Deliberately NOT in lib/entitlements.ts: entitlements are PLAN limits
// (free vs Pro, CLAUDE.md hard rule: "Entitlement limits live in
// apps/web/lib/entitlements.ts only"). These two windows apply IDENTICALLY
// regardless of plan -- a Pro caller guessing passwords or hammering Studio
// mutations is exactly as throttled as a free one, because the thing being
// protected (scrypt CPU cost, Postgres write volume) doesn't care what the
// caller pays. Folding a non-plan concept into the single-source-of-plan-
// limits module would blur that boundary for no benefit.

export interface RateLimitConfig {
  windowSeconds: number;
  limit: number;
}

/** Password-unlock attempts, per (hashed ip, slug) --
 *  apps/web/app/p/[slug]/actions.ts's verifyCodeAccess. */
export const P_UNLOCK_LIMIT = { windowSeconds: 300, limit: 8 } as const;

/**
 * Studio mutation actions (create/bulk-create/retarget/pause/access), per
 * user -- apps/web/app/(app)/studio/code-actions.ts. Deliberately NOT
 * applied inside lib/codes-core.ts's `*Core` functions: those are shared
 * with the public API-key path (app/api/v1/**), which already has its own
 * monthly quota (increment_api_usage, migration 20260723000008_api_usage.sql)
 * -- stacking a second, independent limiter underneath an already-quota'd
 * path would only make that quota harder to reason about, for no
 * additional protection. This limit exists for the Studio's cookie-session
 * surface specifically, which has no quota of its own today.
 */
export const STUDIO_MUTATE_LIMIT = { windowSeconds: 300, limit: 60 } as const;

export interface RateLimitResult {
  /** false means "over limit -- reject the caller." */
  allowed: boolean;
  /** true means the RPC itself failed (network/DB error, or an
   *  unexpected/empty result) and `allowed` was forced to true as a
   *  result -- the limiter fails OPEN, never closed. A broken limiter must
   *  never itself become an outage for every legitimate caller. Exposed so
   *  a call site COULD log/alert on it without changing caller-facing
   *  behavior; none of this unit's call sites do that yet. */
  failedOpen: boolean;
}

/**
 * Checks and increments one rate-limit window via the check_rate_limit()
 * RPC (migration 20260730000009_rate_limits.sql) -- an atomic Postgres
 * upsert, so concurrent callers against the same subject never race. Never
 * throws: any failure (RPC error, unexpected/empty result, or the call
 * itself throwing) fails OPEN, mirroring lib/kv-sync.ts's "unconfigured or
 * broken -> typed result, caller never fails because of us" posture -- a
 * rate limiter is a backstop, not a feature the product's correctness
 * depends on, so its own failure must never cascade into blocking every
 * legitimate caller. `admin` must be a service_role (admin) client --
 * check_rate_limit()'s EXECUTE privilege is revoked from `authenticated`,
 * so an RLS-scoped cookie-session client can never call it (see the
 * migration's grants).
 */
export async function checkRateLimit(
  admin: SupabaseClient<Database>,
  subject: string,
  cfg: RateLimitConfig,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_subject: subject,
      p_window_seconds: cfg.windowSeconds,
      p_limit: cfg.limit,
    });

    if (error) {
      return { allowed: true, failedOpen: true };
    }

    // RETURNS TABLE -> PostgREST hands back an array, exactly one row by
    // construction (upsert-then-select on a single (subject, window_start)
    // primary key) -- same shape as increment_api_usage (lib/api-auth.ts).
    // An empty/missing row means the RPC itself is broken -- same fail-open
    // bucket as an explicit error, since RateLimitResult has no third
    // "internal error" state to report instead.
    const row = data?.[0];
    if (!row) {
      return { allowed: true, failedOpen: true };
    }

    return { allowed: row.allowed, failedOpen: false };
  } catch {
    return { allowed: true, failedOpen: true };
  }
}

// ============================================================ ipSubject
// A rate-limit window needs a STABLE identity for its whole duration -- the
// opposite requirement from workers/redirect/src/scan-hash.ts's ip_hash,
// which rotates DAILY (its own salt concatenated with the UTC calendar
// date) so scan analytics can never correlate a visitor across days (D3
// privacy rationale). A rotating salt here would silently reset any window
// that straddles UTC midnight -- a caller mid-window at 23:59 would get a
// fresh, empty counter one minute later at 00:01, for free, defeating the
// limiter for exactly the callers probing right at the boundary. So this
// uses its OWN static salt (RATE_LIMIT_IP_SALT), distinct from the
// Worker's SCAN_SALT, hashed synchronously via node:crypto rather than the
// async crypto.subtle this repo uses elsewhere for isomorphic/Workers-
// runtime code (lib/api-keys.ts, scan-hash.ts) -- this module is Node-only
// (same trust boundary as lib/passwords.ts, which already uses
// node:crypto), and a synchronous hash keeps ipSubject's own signature
// synchronous, so call sites don't need an extra await beyond
// checkRateLimit's.
//
// Unset RATE_LIMIT_IP_SALT falls back to a constant string rather than
// throwing or disabling the limiter -- deterministic behavior (including
// in tests and any environment that never set the var) matters more here
// than the salt's secrecy: an unconfigured deployment still rate-limits
// correctly, it just does so with a PUBLICLY KNOWN salt (this exact
// fallback string, readable in this file), which weakens the hash's
// resistance to being reversed back to a raw IP by anyone who reads this
// source. That's an acceptable, documented tradeoff for a value whose
// entire job is "stable bucketing for a few minutes," not long-term PII
// protection -- set RATE_LIMIT_IP_SALT in every real deployment to get
// that property back.
const FALLBACK_IP_SALT = "qrcdn-rate-limit-fallback-salt-set-RATE_LIMIT_IP_SALT-in-real-deployments";

function ipSalt(): string {
  return process.env.RATE_LIMIT_IP_SALT || FALLBACK_IP_SALT;
}

/**
 * `sha256(ip + static salt)`, hex-encoded, joined with the caller's scope
 * (e.g. `"p_unlock:" + slug`) -- the resulting string is the `subject`
 * primary-key column check_rate_limit() reads/writes. A caller-supplied
 * `scope` keeps otherwise-identical IPs from sharing a bucket across
 * unrelated limits (e.g. two different slugs guessed from the same IP get
 * two independent windows).
 */
export function ipSubject(ip: string, scope: string): string {
  const hash = createHash("sha256").update(`${ip}:${ipSalt()}`).digest("hex");
  return `${hash}:${scope}`;
}
