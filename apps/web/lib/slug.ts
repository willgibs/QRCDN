import type { ActionResult } from "./validation";

// Dynamic-code slug generation (P5-U1, docs/guides/p5-dynamic.md). 7 chars
// drawn from a QR-alphanumeric-mode-safe charset with visually confusable
// characters removed: no 0/O, 1/I/L, or U — these are the characters most
// likely to be misread on a small printed label or a low-res photo of one.
//
// Note for future readers: docs/DECISIONS.md D12 describes a 31-symbol
// charset (`A–Z + 2–9 minus I L O 0 1`, i.e. it keeps U). This unit follows
// docs/guides/p5-dynamic.md's explicit 30-symbol charset instead (it also
// drops U) — p5-dynamic.md is the authoritative spec for P5-U1; D12 appears
// to predate that refinement and is worth reconciling in DECISIONS.md.
export const SLUG_CHARSET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SLUG_LENGTH = 7;

// Mirrors the qr_codes.slug check constraint (upper + length 4..17) in
// supabase/migrations/20260804000012_slug_cap_17.sql (D12 as amended,
// P9.8-B3 — tightened from 4..30; the number is empirical, not chosen: see
// that migration + docs/DECISIONS.md D12 for the v3-H capacity derivation).
// Auto-generated slugs are always SLUG_LENGTH; this wider bound is what
// makes isValidSlug correct for the column in general (vanity slugs), not
// just for this module's own output. Exported so callers (the create-code
// dialog, marketing/help/API-reference copy) can interpolate the real
// bounds instead of hand-typing them — the drift this file's own history
// warns about.
export const MIN_SLUG_LENGTH = 4;
export const MAX_SLUG_LENGTH = 17;

/**
 * Draws a random SLUG_LENGTH-character slug from SLUG_CHARSET.
 *
 * `random` is injectable (defaults to `Math.random`) so tests can assert
 * deterministic output without depending on the platform RNG. Must return
 * values in `[0, 1)`; a defensive clamp below keeps a boundary value of
 * exactly `1` from indexing past the end of the charset.
 */
export function generateSlug(random: () => number = Math.random): string {
  let slug = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    const index = Math.min(SLUG_CHARSET.length - 1, Math.floor(random() * SLUG_CHARSET.length));
    slug += SLUG_CHARSET[index];
  }
  return slug;
}

/**
 * Charset + length check mirroring the DB constraint. Does not check
 * uniqueness — that's an insert-time concern (unique index + retry), not a
 * format concern.
 */
export function isValidSlug(input: string): boolean {
  if (input.length < MIN_SLUG_LENGTH || input.length > MAX_SLUG_LENGTH) {
    return false;
  }
  for (const char of input) {
    if (!SLUG_CHARSET.includes(char)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vanity slugs (P7.5-U3, Pro-gated — D12's "Vanity (Pro): 4-17 chars,
// reserved blocklist ... single namespace"; cap tightened from 4-30 at
// P9.8-B3, D12 as amended). Words blocked from ever being assigned as a
// caller-chosen slug.
//
// Not a technical collision guard: today's routing splits cleanly by host
// (D1) — printed short codes resolve via workers/redirect on the bare apex
// (`qrcdn.com/{slug}`), while every word below is a route living under
// `www.qrcdn.com`, a different host entirely. So no literal collision exists
// between a vanity slug and an app route right now. Blocked anyway as a
// trust/UX safeguard: a vanity slug that reads as `qrcdn.com/LOGIN` or
// `qrcdn.com/ADMIN` is phishing-adjacent regardless of which host actually
// serves it, and this list is cheap insurance against a future host
// unification (apex + www collapsing into one namespace) turning today's
// non-collision into a real one.
//
// Reachability note (found during P7.5-U3, pinned by a test in
// slug.test.ts): every word below is either shorter than MIN_SLUG_LENGTH (4)
// or contains a SLUG_CHARSET-excluded letter (I/L/O/U) — ADMIN, DOCS, HELP,
// CODES, STUDIO, LOGIN, AUTH, DEVELOPERS, ROBOTS, EXPLORE, STATIC, and
// FAVICON all contain at least one; API/APP/DEV/WWW/U/P/A/QR are all under 4
// chars. That means `isValidSlug` (below, in `validateVanitySlug`) already
// rejects every one of these as `invalid_slug` before this set is ever
// consulted — the words stay blocked in practice, just via a less specific
// error than `slug_reserved`. Not a trust/security gap, but worth
// reconciling: either this list needs charset-valid replacements, or the
// intent was for the reserved check to run independent of format.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "API",
  "APP",
  "ADMIN",
  "DEV",
  "DOCS",
  "HELP",
  "WWW",
  "U",
  "P",
  "A",
  "QR",
  "CODES",
  "STUDIO",
  "LOGIN",
  "AUTH",
  "DEVELOPERS",
  "ROBOTS",
  "EXPLORE",
  "STATIC",
  "FAVICON",
]);

/**
 * Validates a caller-chosen vanity slug (the only caller today:
 * `createDynamicCodeCore`'s vanity branch in codes-core.ts, itself gated on
 * `PLAN_LIMITS[plan].vanitySlugs` before this ever runs). Lowercase input is
 * accepted and normalized — friendlier than forcing callers to shout their
 * own slug — everything else reuses the exact rules the auto-generated path
 * already satisfies by construction (`isValidSlug`'s charset + 4..17 length
 * check), plus the reserved-word blocklist above.
 */
export function validateVanitySlug(input: unknown): ActionResult<string> {
  if (typeof input !== "string") {
    return { ok: false, error: "invalid_slug" };
  }

  const normalized = input.trim().toUpperCase();

  if (!isValidSlug(normalized)) {
    return { ok: false, error: "invalid_slug" };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: false, error: "slug_reserved" };
  }

  return { ok: true, data: normalized };
}
