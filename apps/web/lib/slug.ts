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

// Mirrors the qr_codes.slug check constraint (upper + length 4..30) in
// supabase/migrations/20260721000001_initial_schema.sql. Auto-generated
// slugs are always SLUG_LENGTH; this wider bound is what makes isValidSlug
// correct for the column in general (e.g. future vanity slugs, D12 — out of
// scope for P5), not just for this module's own output.
const MIN_SLUG_LENGTH = 4;
const MAX_SLUG_LENGTH = 30;

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
