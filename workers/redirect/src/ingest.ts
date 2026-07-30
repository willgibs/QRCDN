import { captureException } from "@sentry/cloudflare";
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
 * P8-U2: the catch block also reports to Sentry explicitly, because
 * Sentry's Cloudflare SDK does NOT auto-capture errors thrown inside
 * `ctx.waitUntil()` — confirmed by reading @sentry/cloudflare's own source
 * (flush.js's `instrumentedWaitUntil` only wraps the promise in a
 * `.finally()` for its own flush bookkeeping; it never attaches a
 * `.catch()`, so a rejection is never observed there). Combined with this
 * function's blanket try/catch existing specifically to stop that
 * rejection from ever happening, that gap means an ingest failure would be
 * invisible to Sentry with zero code here — exactly the "nobody knew" class
 * of bug this whole unit exists to close. `captureException` is a no-op
 * (no throw, no network call) when Sentry isn't initialized — see
 * index.ts's `withSentry` call site — and is deliberately called with no
 * extra context/payload, so there's nothing app-specific for it to leak.
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
    try {
      captureException(err);
    } catch {
      // Monitoring itself must never be the reason an ingest failure
      // escapes — see the outer doc comment.
    }
  }
}
