import { isSlugShaped, toSlugUpper } from "./slug";

// Pure top-level routing decision — given only the HTTP method and the
// parsed URL parts, decide which of the four handled shapes a request is.
// No I/O here; index.ts turns this into an actual Response.

export type Route =
  | { kind: "method-not-allowed" }
  | { kind: "robots" }
  | { kind: "slug"; slugUpper: string }
  | { kind: "canonicalize"; pathAndSearch: string };

export function decideRoute(method: string, pathname: string, search: string): Route {
  // Non-GET/HEAD → 405 (spec, bullet 1). Checked before anything else: a
  // POST to /robots.txt or to a slug path is still a 405, not a redirect.
  if (method !== "GET" && method !== "HEAD") {
    return { kind: "method-not-allowed" };
  }

  // Bots hitting slug URLs shouldn't cause those URLs to get indexed —
  // robots.txt is served directly rather than 301'd to www so a `Disallow: /`
  // actually applies to *this* host (qrcdn.com), not www.qrcdn.com's.
  if (pathname === "/robots.txt") {
    return { kind: "robots" };
  }

  // A scan is exactly one path segment shaped like a slug (e.g. "/K7M2X9A").
  // "/", "/favicon.ico" (fails the shape check — it has a dot), and any
  // deeper path ("/a/b") all fall through to host canonicalization.
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 1 && isSlugShaped(segments[0]!)) {
    return { kind: "slug", slugUpper: toSlugUpper(segments[0]!) };
  }

  return { kind: "canonicalize", pathAndSearch: pathname + search };
}
