import type { KvSlugRecord } from "@qrcdn/shared";

// KV write-through for the redirect Worker's cache (docs/DECISIONS.md D2).
// Postgres is truth; this call is best-effort — callers must never fail an
// action because this failed (worst case: the Worker's 5-minute backfill
// TTL self-heals the stale entry).
//
// P5 revision: instead of calling the Cloudflare REST API (which would need
// a Cloudflare API token provisioned into this app), we PUT to the Worker's
// own first-party sync endpoint (`/__kv-sync/{slug}` — see
// workers/redirect/src/kv-sync-endpoint.ts), authenticated by one shared
// secret. `KV_SYNC_SECRET` must match the Worker's `SYNC_SECRET`;
// `KV_SYNC_URL` overrides the base for staging (defaults to the production
// apex). Unconfigured → typed no-op: never throws, never blocks.

export type KvSyncResult =
  | { synced: true }
  | { synced: false; reason: "kv_unconfigured" | "kv_request_failed" };

const DEFAULT_SYNC_BASE = "https://qrcdn.com";

interface SyncEnv {
  base: string;
  secret: string;
}

/** Read lazily (call-time, not module-load-time) so tests can stub env vars
 *  per-case and so a missing var never crashes import-time module init. */
function readSyncEnv(): SyncEnv | null {
  const secret = process.env.KV_SYNC_SECRET;
  if (!secret) {
    return null;
  }
  return { base: process.env.KV_SYNC_URL || DEFAULT_SYNC_BASE, secret };
}

function syncUrl(base: string, slug: string): string {
  return `${base}/__kv-sync/${encodeURIComponent(slug)}`;
}

async function putOnce(url: string, secret: string, record: KvSlugRecord): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "x-sync-secret": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    // Network error, timeout, etc. — treated the same as a non-ok response;
    // the retry (or the caller's tolerance of a synced:false result) is the
    // recovery path, not a thrown exception.
    return false;
  }
}

/**
 * Write-through PUT of a slug's KV record. The Postgres UPDATE that this
 * follows is the source of truth (D2) — this call never throws, and a
 * failure here does NOT fail the calling server action. One retry on
 * failure to absorb a transient network blip, then give up.
 *
 * `record.codeId` (additive, P5-U2) flows through untouched so the redirect
 * Worker's scan ingest can populate scan_events.code_id without a second
 * Postgres round-trip.
 */
export async function writeSlugToKv(
  slug: string,
  record: KvSlugRecord,
): Promise<KvSyncResult> {
  const env = readSyncEnv();
  if (!env) {
    return { synced: false, reason: "kv_unconfigured" };
  }

  const url = syncUrl(env.base, slug);

  if (await putOnce(url, env.secret, record)) {
    return { synced: true };
  }
  if (await putOnce(url, env.secret, record)) {
    return { synced: true };
  }
  return { synced: false, reason: "kv_request_failed" };
}
