// Shape of the Cloudflare KV value written by the web app's retarget/pause
// write-through (apps/web/lib/kv-sync.ts, P5-U1) and read by the redirect
// Worker (workers/redirect, P5-U2) on cache miss / read-through backfill
// (docs/DECISIONS.md D2). Colocated here (rather than only in apps/web) so
// both sides share one type without churn — additive-only evolution, same
// as the style schema (D5).
export interface KvSlugRecord {
  /** Current 302 target for the slug. */
  destination: string;
  /** When true, the Worker redirects to www.qrcdn.com/u/{slug} instead of
   *  `destination` (D2) rather than serving the code's real target. */
  paused: boolean;
}
