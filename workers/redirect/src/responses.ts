import type { RedirectDecision } from "./redirect-decision";

// Pure Response builders. `Response`/`Headers` are standard Fetch API
// globals available both in the Workers runtime and in Node 22 (no
// miniflare/workerd needed to unit test these).

const WWW_ORIGIN = "https://www.qrcdn.com";

/**
 * Scan redirects: always 302, always `Cache-Control: no-store`, NEVER 301
 * (hard rule — a cached 301 would pin users to a stale destination
 * forever). This is the one function every redirect path funnels through so
 * that invariant can't be accidentally bypassed by a new call site.
 */
function scanRedirect(location: string, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  return new Response(null, { status: 302, headers });
}

/** Active code → real destination. Referrer-Policy is scoped to this branch
 *  specifically per the P5-U2 brief (not applied to the unclaimed/degraded
 *  branches below). */
function scanRedirectToDestination(destination: string): Response {
  return scanRedirect(destination, { "Referrer-Policy": "no-referrer-when-downgrade" });
}

/** Paused/archived/not-found/unreachable all land here — the unclaimed page
 *  (P9 builds it). Same 302+no-store contract, just a different Location. */
function scanRedirectToUnclaimed(slugUpper: string): Response {
  return scanRedirect(`${WWW_ORIGIN}/u/${slugUpper}`);
}

/** Turns a redirect decision (redirect-decision.ts) into the actual
 *  Response. The only two cases; no code path here can produce a 301. */
export function buildRedirectResponse(decision: RedirectDecision, slugUpper: string): Response {
  return decision.kind === "destination"
    ? scanRedirectToDestination(decision.destination)
    : scanRedirectToUnclaimed(slugUpper);
}

/** Host canonicalization — 301 is correct HERE (not a scan): apex paths that
 *  aren't slug-shaped permanently belong on www. */
export function permanentRedirect(pathAndSearch: string): Response {
  return new Response(null, {
    status: 301,
    headers: { Location: `${WWW_ORIGIN}${pathAndSearch}` },
  });
}

/** Bots hitting slug URLs directly shouldn't index them — served straight
 *  from the apex rather than 301'd to www so the directive actually applies
 *  to this host. */
export function robotsResponse(): Response {
  return new Response("User-agent: *\nDisallow: /\n", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function methodNotAllowedResponse(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
}
