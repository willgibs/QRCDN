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
  /**
   * qr_codes.id — added additively at P5-U2 so the redirect Worker's scan
   * ingest (D3) can populate scan_events.code_id without a second Postgres
   * round-trip. Optional because KV entries written before this field
   * existed won't have it, and both sides must tolerate its absence
   * (additive-only evolution, same discipline as the style schema, D5):
   * writers (apps/web/lib/kv-sync.ts call sites) always set it now, but the
   * Worker must not assume every record has it — when it's missing, skip
   * scan ingest for that request rather than guessing an id.
   */
  codeId?: string;
  /**
   * qr_codes.expires_at (ISO-8601 UTC) — added additively at P7.5-U1.
   * Optional/absent means "never expires," which is true of every record
   * written before this field existed as well as every code without an
   * expiry set today (additive-only evolution, same discipline as codeId
   * above): both sides must tolerate its absence rather than treating a
   * missing value as already-expired.
   */
  expiresAt?: string;
  /**
   * Derived from qr_codes.password_hash (`password_hash !== null`) — added
   * additively at P7.5-U1. Optional/absent means "not protected," true of
   * every pre-existing entry. The hash itself never reaches KV, only this
   * boolean: KV is a read-through cache the Worker uses to decide whether to
   * show the password wall, never the place a credential gets checked.
   */
  passwordProtected?: boolean;
}
