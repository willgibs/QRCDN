"use server";

import { createClient } from "../../../lib/supabase/server";
import { PLAN_LIMITS, type Plan } from "../../../lib/entitlements";
import { generateApiKey, hashApiKey } from "../../../lib/api-keys";
import { validateApiKeyId, validateApiKeyName, type ActionResult } from "../../../lib/validation";
import type { TablesInsert } from "@qrcdn/shared";

// Server actions for API key management (P7-U4). Same file shape as
// studio/actions.ts's brand-kit CRUD: every input is zod-parsed
// (apps/web/lib/validation.ts) before touching Supabase, and ownership is
// enforced by RLS ("own api keys" policy,
// supabase/migrations/20260721000002_rls_policies.sql) — neither action
// below adds a manual owner_id filter beyond what INSERT requires, since RLS
// already scopes every select/update to the caller.
//
// Imports below are relative, not the "@/" alias studio/actions.ts and
// code-actions.ts use — Vitest in this repo has no tsconfig-paths config
// (confirmed empirically across every prior P6/P7 unit; see
// lib/api-auth.test.ts's and app/api/cron/purge/route.test.ts's own header
// notes), and this file, unlike those two, has a direct test
// (actions.test.ts) that needs its imports to resolve under plain Vitest.

export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * getUser() re-verifies against the Auth server (CLAUDE.md hard rule: use it
 * before destructive/billing-adjacent actions). Both actions in this file
 * qualify: minting is credential-issuing (a live secret leaves the server
 * exactly once) and revoking is destructive-adjacent (it kills a caller's
 * ability to hit the API with that key) — neither is a case where the
 * cheaper getClaims() tier is appropriate.
 */
async function requireUserContext(): Promise<
  { supabase: SupabaseServerClient; userId: string } | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return { supabase, userId: data.user.id };
}

/**
 * Mints a new API key and returns the full secret exactly once. The caller
 * (api-keys-panel.tsx) must keep `fullKey` in component state only —
 * dismissing the reveal-once card discards it, and nothing on the server
 * side stores or logs it beyond the sha256 hash already written to
 * `api_keys.key_hash`.
 *
 * Validation runs before authentication (mirrors createBrandKit in
 * studio/actions.ts): a malformed name is rejected without ever touching the
 * Auth server. The plan check below is the actual enforcement boundary — the
 * Pro gate a free-plan caller sees client-side (api-keys-panel.tsx / page.tsx)
 * is a UX convenience only, never trusted here.
 */
export async function createApiKeyAction(
  name: unknown,
): Promise<ActionResult<{ id: string; name: string; fullKey: string; displayPrefix: string }>> {
  const nameResult = validateApiKeyName(name);
  if (!nameResult.ok) {
    return nameResult;
  }

  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase, userId } = ctx;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  // PLAN_LIMITS is the only source of entitlement limits (CLAUDE.md hard
  // rule). `apiMonthlyRequests === null` means "no API access at all" —
  // same sentinel api-auth.ts's authenticateApiRequest checks server-side
  // for every /api/v1 request.
  const plan = profile.plan as Plan;
  if (PLAN_LIMITS[plan].apiMonthlyRequests === null) {
    return { ok: false, error: "pro_required" };
  }

  const { fullKey, displayPrefix } = generateApiKey();
  const keyHash = await hashApiKey(fullKey);

  const insertPayload: TablesInsert<"api_keys"> = {
    owner_id: userId,
    name: nameResult.data,
    key_prefix: displayPrefix,
    key_hash: keyHash,
  };

  const { data, error } = await supabase
    .from("api_keys")
    .insert(insertPayload)
    .select("id, name")
    .single();

  if (error || !data) {
    return { ok: false, error: "insert_failed" };
  }

  // fullKey is returned to the caller ONCE, here — never persisted (only
  // its hash is), never logged, never re-derivable from the row above.
  return { ok: true, data: { id: data.id, name: data.name, fullKey, displayPrefix } };
}

/**
 * Revokes a key by stamping `revoked_at`. Idempotent-safe by construction:
 * the `.is("revoked_at", null)` guard means an already-revoked key (or a
 * concurrent double-click) matches zero rows rather than re-stamping a new
 * timestamp over the original one, and zero rows is indistinguishable here
 * from "not found" / "not yours" — same stance code-actions.ts's
 * retargetCode/setCodePaused take on their own RLS-scoped updates. Revoked
 * rows are never deleted — they stay listed for auditability
 * (api-keys-panel.tsx keeps them in the table with the revoke action
 * hidden).
 */
export async function revokeApiKeyAction(id: unknown): Promise<ActionResult<{ id: string }>> {
  const idResult = validateApiKeyId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", idResult.data)
    .is("revoked_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, data: { id: data.id } };
}
