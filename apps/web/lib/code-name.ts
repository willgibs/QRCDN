// Pure helper for the studio's "Create dynamic code" inline name field
// (P5-U4, docs/guides/p5-dynamic.md unit U4). Colocated-tested
// (code-name.test.ts).

/**
 * Suggests a starting point for a dynamic code's name from its destination
 * URL's hostname — e.g. "https://www.example.com/pricing" -> "example.com".
 * Strips a leading "www." (the common case where the bare host reads better
 * than the full subdomain); any other subdomain is left untouched since it's
 * often meaningful (e.g. "shop.example.com").
 *
 * Falls back to an empty string for anything that doesn't parse as a URL —
 * this is only ever called with a destination that's already passed the
 * same `validateDestination` check gating the "Create dynamic code" button,
 * but staying defensive here means a caller can't crash the inline naming
 * flow by calling it earlier than expected. An empty suggestion just leaves
 * the name field blank, prompting the user instead of guessing.
 */
export function suggestCodeName(destination: string): string {
  try {
    const url = new URL(destination.trim());
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
