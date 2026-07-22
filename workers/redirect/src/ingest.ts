import { classifyDevice } from "./ua";
import { extractGeo, refererHost, type CfGeo } from "./geo";
import { hashIp, toPgBytea } from "./scan-hash";
import { postScanEvent, type SupabaseRestEnv } from "./supabase";

// Assembles a scan_events insert from request context and ships it. This is
// the one place that touches Date.now()/crypto/headers together — kept
// separate from supabase.ts (the raw REST client) so that module stays a
// thin, swappable network boundary.

export interface IngestRequestContext {
  codeId: string;
  ip: string;
  userAgent: string | null;
  referer: string | null;
  cf: CfGeo | undefined;
}

/**
 * Always invoked via `ctx.waitUntil()` by index.ts — never awaited inline
 * with the redirect response. Wrapped in its own try/catch as defense in
 * depth (postScanEvent already never throws, but hashIp's WebCrypto call
 * theoretically could): a scan-ingest failure must never become visible to,
 * or delay, the response already sent to the client.
 */
export async function ingestScan(
  env: SupabaseRestEnv,
  scanSalt: string,
  request: IngestRequestContext,
  now: Date = new Date(),
): Promise<void> {
  try {
    const ipHash = await hashIp(request.ip, scanSalt, now);
    const geo = extractGeo(request.cf);
    await postScanEvent(env, {
      code_id: request.codeId,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device: classifyDevice(request.userAgent),
      ip_hash: toPgBytea(ipHash),
      referer: refererHost(request.referer),
    });
  } catch {
    // See doc comment — never let an ingest failure escape.
  }
}
