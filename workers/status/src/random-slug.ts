// Pure — no fetch, no crypto side effects beyond the one documented call.

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * A random, slug-shaped path segment for P1 (evaluate.ts). "Slug-shaped"
 * here means it satisfies workers/redirect/src/slug.ts's own SLUG_PATTERN
 * (`/^[0-9A-Za-z]{4,30}$/`) — that Worker has to route the request to its
 * scan-decision branch at all before P1's "unknown slug still gets a 302"
 * assertion means anything. The default length (24) and full 62-symbol
 * alphabet are both well outside the product's real slug space (7-char
 * auto-slugs from a narrow 30-symbol charset, or 4-30 char vanity slugs a
 * real owner picked) purely to make an accidental collision with a real
 * code astronomically unlikely — this is not itself a security boundary,
 * just a correctness one (a collision would make this probe test the wrong
 * thing: a real code's redirect, not the unknown-slug contract).
 *
 * Regenerated fresh on every request this Worker serves (see index.ts) —
 * never a fixed fixture — so this check can never quietly settle into
 * "probing one specific pinned slug forever."
 *
 * `crypto.getRandomValues`, not `Math.random()`: nothing security-sensitive
 * depends on this value, but it costs nothing to use the non-predictable
 * source, and it is available as a Web Crypto global in both the Workers
 * runtime and Node 22 (this file's own test runs under plain Node vitest,
 * the same convention workers/redirect's pure modules already use).
 */
export function randomProbeSlug(length = 24): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}
