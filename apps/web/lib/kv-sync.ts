import type { KvSlugRecord } from "@qrcdn/shared";

// Cloudflare KV write-through for the redirect Worker's cache (P5-U1,
// docs/DECISIONS.md D2). Postgres is truth; this call is best-effort —
// callers must never fail an action because this failed (worst case ~60s
// staleness until the Worker's own read-through backfill catches up).
//
// The three CF_* env vars land in U3 (docs/guides/p5-dynamic.md). Until
// then — and in any environment that hasn't configured them — this is a
// typed no-op: it never throws and never blocks the caller.

export type KvSyncResult =
  | { synced: true }
  | { synced: false; reason: "kv_unconfigured" | "kv_request_failed" };

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface KvEnv {
  accountId: string;
  namespaceId: string;
  apiToken: string;
}

/** Read lazily (call-time, not module-load-time) so tests can stub env vars
 *  per-case and so a missing var never crashes import-time module init. */
function readKvEnv(): KvEnv | null {
  const accountId = process.env.CF_ACCOUNT_ID;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  const apiToken = process.env.CF_KV_API_TOKEN;

  if (!accountId || !namespaceId || !apiToken) {
    return null;
  }
  return { accountId, namespaceId, apiToken };
}

function kvValueUrl(env: KvEnv, slug: string): string {
  return `${CLOUDFLARE_API_BASE}/accounts/${env.accountId}/storage/kv/namespaces/${env.namespaceId}/values/${encodeURIComponent(slug)}`;
}

async function putOnce(url: string, apiToken: string, record: KvSlugRecord): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
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
 * `record.codeId` (additive, P5-U2) flows through untouched — this function
 * doesn't need to know it exists to pass it along; callers just include it
 * so the redirect Worker's scan ingest can populate scan_events.code_id
 * without a second Postgres round-trip.
 */
export async function writeSlugToKv(
  slug: string,
  record: KvSlugRecord,
): Promise<KvSyncResult> {
  const env = readKvEnv();
  if (!env) {
    return { synced: false, reason: "kv_unconfigured" };
  }

  const url = kvValueUrl(env, slug);

  if (await putOnce(url, env.apiToken, record)) {
    return { synced: true };
  }
  if (await putOnce(url, env.apiToken, record)) {
    return { synced: true };
  }
  return { synced: false, reason: "kv_request_failed" };
}
