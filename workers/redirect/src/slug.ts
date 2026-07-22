// Pure slug-shape logic. No fetch, no KV, no Request/Response — safe to unit
// test directly under plain vitest (node), no miniflare required.

// Literal spec regex (P5-U2 brief): 4-30 alphanumeric, case-insensitive.
// Deliberately broader than the D12 auto-slug charset (which drops
// confusable characters 0/O/1/I/L/U) because vanity (Pro) slugs are
// arbitrary 4-30 char alphanumeric per D12 — the Worker's job is just to
// recognize "this path is slug-shaped," not to validate charset purity.
// Whether the slug actually resolves to anything is decided downstream by
// the KV/REST lookup, not by this matcher.
const SLUG_PATTERN = /^[0-9A-Za-z]{4,30}$/;

/** True if `segment` (a single path segment, no leading/trailing slashes) is
 *  shaped like a slug. Paths that fail this — dots (favicon.ico), deeper
 *  paths, empty segments — are host-canonicalized instead of treated as a
 *  scan (see route.ts). */
export function isSlugShaped(segment: string): boolean {
  return SLUG_PATTERN.test(segment);
}

/** Worker matches case-insensitively; KV keys and the qr_codes.slug column
 *  are uppercase-only (D12 schema check `slug = upper(slug)`) — always
 *  uppercase before any lookup. */
export function toSlugUpper(segment: string): string {
  return segment.toUpperCase();
}
