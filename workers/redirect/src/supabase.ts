import type { RestLookupResult, RestQrCodeRow } from "./redirect-decision";

// The only module in this Worker that talks to the network directly (aside
// from the KV binding, handled in index.ts). Kept isolated so
// redirect-decision.ts and ingest-decision.ts stay pure and unit-testable
// without mocking fetch.

export interface SupabaseRestEnv {
  supabaseUrl: string;
  secretKey: string;
}

function restHeaders(secretKey: string, extra?: Record<string, string>): HeadersInit {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    ...extra,
  };
}

/**
 * Read-through lookup on a KV miss (D2). Three-way result — a network
 * failure/thrown error and a non-ok HTTP response both collapse to
 * "unreachable" (Supabase down/erroring), distinct from "not-found" (the
 * slug genuinely doesn't exist, HTTP 200 with an empty array) so the
 * redirect Worker can keep working even when Supabase is down/paused (D2
 * hard rule) — both degrade to the same unclaimed redirect today, but the
 * pure decision layer (redirect-decision.ts) is what maps them, not this
 * function.
 */
export async function lookupSlugInSupabase(
  env: SupabaseRestEnv,
  slugUpper: string,
): Promise<RestLookupResult> {
  const url = `${env.supabaseUrl}/rest/v1/qr_codes?slug=eq.${encodeURIComponent(slugUpper)}&select=id,destination_url,status,expires_at,password_hash`;
  try {
    const response = await fetch(url, { headers: restHeaders(env.secretKey) });
    if (!response.ok) {
      return { status: "unreachable" };
    }
    const rows = (await response.json()) as RestQrCodeRow[];
    const row = rows[0];
    return row ? { status: "found", row } : { status: "not-found" };
  } catch {
    return { status: "unreachable" };
  }
}

/** scan_events insert payload — deliberately narrower than the full column
 *  set (see final report): `os`/`browser` are left unset (D3 specifies
 *  "coarse UA parse," not a full parser), `ts` is left to the column's
 *  `default now()`, `id` is identity-generated. */
export interface ScanEventInsert {
  code_id: string;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string;
  ip_hash: string;
  referer: string | null;
}

/**
 * Fire-and-forget scan ingest (D3). MUST be called via ctx.waitUntil() by
 * the caller — this function itself never throws (every failure path is
 * caught internally) so a rejected promise can never surface as an
 * unhandled rejection warning, and it never delays the response that's
 * already been returned to the client. One retry on failure, then drop —
 * <0.5% event loss is accepted (D3); this is directional analytics, not a
 * ledger.
 */
export async function postScanEvent(env: SupabaseRestEnv, payload: ScanEventInsert): Promise<void> {
  const url = `${env.supabaseUrl}/rest/v1/scan_events`;
  const init: RequestInit = {
    method: "POST",
    headers: restHeaders(env.secretKey, {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify(payload),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return;
      }
    } catch {
      // Network error, timeout, etc. — fall through to the retry (or, on
      // the second attempt, give up silently).
    }
  }
}
