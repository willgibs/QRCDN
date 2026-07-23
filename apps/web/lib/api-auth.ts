import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@qrcdn/shared";
import { createAdminClient } from "./supabase/admin";
import { formatValidateApiKey, hashApiKey } from "./api-keys";
import { PLAN_LIMITS, type Plan } from "./entitlements";

// P7-U3: bearer-token auth pipeline for the public /api/v1 surface. Every
// route handler under app/api/v1/** starts with
// `const auth = await authenticateApiRequest(request); if (isApiError(auth)) return NextResponse.json(auth.body, { status: auth.status });`
// before touching anything else — this is the ONLY place the pipeline is
// implemented, mirroring how apps/web/lib/codes-core.ts is the only place
// the owner_id filter is implemented for the cores this file's context feeds
// into.
//
// D11 (docs/DECISIONS.md): `qrcdn_live_` + 32 base62 + CRC tail; store
// prefix (display) + sha256 hash. `formatValidateApiKey` (lib/api-keys.ts)
// is a zero-DB-cost typo gate checked BEFORE any query runs; `hashApiKey`
// produces the `\x<hex>` bytea-literal PostgREST expects for the
// `key_hash` lookup.
//
// Revoked-key handling is deliberately identical to unknown-key handling —
// same status (401), same error code, same message, same string constant —
// so a caller who once had a valid key can never distinguish "never
// existed" from "was revoked" by probing the API.

export interface AuthedApiContext {
  db: SupabaseClient<Database>;
  ownerId: string;
  apiKeyId: string;
  plan: Plan;
}

export interface ApiError {
  status: number;
  body: { error: string; message: string };
}

export function isApiError(x: AuthedApiContext | ApiError): x is ApiError {
  return "status" in x;
}

const INVALID_KEY_MESSAGE = "Invalid API key.";
const INTERNAL_ERROR_MESSAGE = "Something went wrong. Try again.";

function unauthorized(message: string): ApiError {
  return { status: 401, body: { error: "unauthorized", message } };
}

function internalError(): ApiError {
  return { status: 500, body: { error: "internal_error", message: INTERNAL_ERROR_MESSAGE } };
}

/**
 * Not imported from app/api/cron/purge/route.ts: that route's `bearerToken`
 * is a private, unexported function in a different module with no shared
 * export surface today, and this task's touch-list doesn't include that
 * file. Reimplemented locally instead — identical shape (Bearer-prefix
 * parse, reject empty token), noted here per the task spec rather than
 * silently duplicated.
 */
function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  return token.length > 0 ? token : null;
}

export async function authenticateApiRequest(
  request: Request,
): Promise<AuthedApiContext | ApiError> {
  const token = bearerToken(request);
  if (!token) {
    return unauthorized("Missing or malformed Authorization header.");
  }

  // Zero-DB-cost typo gate — a malformed key never reaches a query.
  if (!formatValidateApiKey(token)) {
    return unauthorized("Malformed API key.");
  }

  const hashed = await hashApiKey(token);
  const db = createAdminClient();

  const { data: keyRow, error: keyError } = await db
    .from("api_keys")
    .select("id, owner_id, revoked_at")
    .eq("key_hash", hashed)
    .maybeSingle();

  if (keyError || !keyRow) {
    return unauthorized(INVALID_KEY_MESSAGE);
  }

  // Same status/error/message as "unknown key" above — see file header.
  if (keyRow.revoked_at !== null) {
    return unauthorized(INVALID_KEY_MESSAGE);
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("plan")
    .eq("id", keyRow.owner_id)
    .single();

  // Should not happen (api_keys.owner_id FKs to profiles) — if it does,
  // it's a data-integrity failure, not a bad key, so 500 rather than 401.
  if (profileError || !profile) {
    return internalError();
  }

  const plan = profile.plan as Plan;
  const cap = PLAN_LIMITS[plan].apiMonthlyRequests;
  if (cap === null) {
    return {
      status: 403,
      body: { error: "api_not_available", message: "The API is available on the Pro plan." },
    };
  }

  const { data: usageRows, error: usageError } = await db.rpc("increment_api_usage", {
    p_key_id: keyRow.id,
    p_cap: cap,
  });

  if (usageError) {
    return internalError();
  }

  // The RPC is declared RETURNS TABLE, so PostgREST hands back an array —
  // exactly one row per call by construction (upsert-then-select on a
  // single (key_id, month) primary key). An empty array would mean the RPC
  // itself is broken, not that the caller is over cap — internal_error,
  // not quota_exceeded, in that case.
  const usage = usageRows?.[0];
  if (!usage) {
    return internalError();
  }
  if (usage.over_cap) {
    return { status: 429, body: { error: "quota_exceeded", message: "Monthly request quota exceeded." } };
  }

  // Best-effort telemetry only — scheduled after the response via `after`
  // (next/server) so a write failure here can never affect the response
  // already returned to the caller.
  after(async () => {
    try {
      await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } catch {
      // Swallowed deliberately — see comment above.
    }
  });

  return { db, ownerId: keyRow.owner_id, apiKeyId: keyRow.id, plan };
}
