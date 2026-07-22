// Pure extraction helpers for scan_events fields that come from request
// metadata rather than the redirect decision itself.

/** The subset of request.cf actually used here — deliberately narrow rather
 *  than importing the full IncomingRequestCfProperties type, so this stays
 *  a plain-object-in, plain-object-out pure function for tests. */
export interface CfGeo {
  country?: string;
  region?: string;
  city?: string;
}

export interface ScanGeo {
  country: string | null;
  region: string | null;
  city: string | null;
}

/**
 * scan_events has `country`/`region`/`city` columns — no `colo` column
 * exists in the schema (supabase/migrations/20260721000001_initial_schema.
 * sql), even though request.cf.colo (the edge datacenter code) is available
 * for free. Deliberately dropped rather than smuggled into an unrelated
 * column — "as the columns allow" (P5-U2 brief) means only what the schema
 * actually has room for.
 */
export function extractGeo(cf: CfGeo | undefined): ScanGeo {
  return {
    country: cf?.country ?? null,
    region: cf?.region ?? null,
    city: cf?.city ?? null,
  };
}

/** Referer host only, never the full URL (privacy — query strings/paths on
 *  a referring page can carry sensitive data). Null for a missing header or
 *  a value that doesn't parse as a URL. */
export function refererHost(refererHeader: string | null | undefined): string | null {
  if (!refererHeader) {
    return null;
  }
  try {
    return new URL(refererHeader).hostname || null;
  } catch {
    return null;
  }
}
