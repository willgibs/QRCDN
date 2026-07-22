import { isBotUserAgent } from "./ua";

// Whether a given request should trigger scan ingest at all — separate from
// the redirect decision (redirect-decision.ts). This never affects the
// response; it only gates the fire-and-forget ctx.waitUntil() POST.

export type IngestDecision =
  | { shouldIngest: true; codeId: string }
  | { shouldIngest: false };

/**
 * Skips ingest when:
 *  - the request is a HEAD, not a GET (D3's "UA + HEAD-request check" bot
 *    filter — a HEAD is a probe, not a human scan);
 *  - the UA looks like a bot/crawler/monitor (ua.ts);
 *  - codeId is undefined — either the slug is genuinely unclaimed/unknown
 *    (no qr_codes row to attach scan_events.code_id to — the column is
 *    NOT NULL + FK-constrained, so there is nothing valid to insert), or
 *    Supabase was unreachable on this request, or the KV record predates
 *    the additive codeId field. All three skip rather than guess.
 */
export function decideIngest(
  method: string,
  userAgent: string | null | undefined,
  codeId: string | undefined,
): IngestDecision {
  if (method !== "GET") {
    return { shouldIngest: false };
  }
  if (!codeId) {
    return { shouldIngest: false };
  }
  if (isBotUserAgent(userAgent)) {
    return { shouldIngest: false };
  }
  return { shouldIngest: true, codeId };
}
