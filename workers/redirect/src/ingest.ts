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
 *
 * P8-U2: that same blanket catch is exactly what would make an ingest
 * failure invisible — it exists to protect the response, but it also
 * swallows the only evidence. So the catch logs. `console.error` in a
 * Worker is captured by Cloudflare's native Workers Logs (`observability`
 * in wrangler.jsonc) and by `wrangler tail`, which costs zero bundle bytes
 * — the deciding factor on this file's package, where an SDK measured
 * 10.8x the whole Worker (see index.ts's export comment).
 *
 * Logs the error only — no request context, no destination, no ip/hash
 * (D3: that data must not leave our infrastructure, and a log sink is
 * "leaving").
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
  } catch (err) {
    console.error("scan ingest failed", err);
  }
}
