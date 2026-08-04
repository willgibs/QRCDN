"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import {
  validateBrandKitId,
  validateBrandKitInput,
  validateBrandKitPatch,
  type ActionResult,
} from "@/lib/validation";
import type { TablesInsert, TablesUpdate } from "@qrcdn/shared";
import type { BrandKit } from "@/lib/brand-kits";

// Server actions for Studio brand-kit CRUD (P4-U1). Every input is
// zod-parsed (apps/web/lib/validation.ts) before it reaches Supabase.
// Ownership is enforced by RLS (supabase/migrations/20260721000002_rls_policies.sql
// "own brand kits" policy) — actions below intentionally do not add manual
// owner_id filters beyond what INSERT requires, since RLS already scopes
// every select/update/delete to the caller.

// `BrandKit` lives in lib/brand-kits.ts, not here: a "use server" file may
// export async functions ONLY (see lib/use-server-contract.test.ts).

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * getClaims() is sufficient for identity checks that gate non-destructive
 * reads/writes (create/update/set-default) — hard rule from CLAUDE.md.
 */
async function requireClaimsContext(): Promise<
  { supabase: SupabaseServerClient; userId: string } | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return null;
  }
  return { supabase, userId: data.claims.sub };
}

/**
 * getUser() re-verifies against the Auth server and is required before
 * destructive actions (hard rule from CLAUDE.md) — deleteBrandKit is the one
 * destructive action in this file.
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

async function brandKitCountFor(supabase: SupabaseServerClient): Promise<number | null> {
  const { count, error } = await supabase
    .from("brand_kits")
    .select("id", { count: "exact", head: true });
  if (error) {
    return null;
  }
  return count ?? 0;
}

export async function createBrandKit(input: {
  name: string;
  style: unknown;
}): Promise<ActionResult<BrandKit>> {
  const validated = validateBrandKitInput(input);
  if (!validated.ok) {
    return validated;
  }

  const ctx = await requireClaimsContext();
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
  // rule) — free/pro both come from apps/web/lib/entitlements.ts.
  const plan = profile.plan as Plan;
  const limit = PLAN_LIMITS[plan].brandKits;

  if (limit !== null) {
    const existingCount = await brandKitCountFor(supabase);
    if (existingCount === null) {
      return { ok: false, error: "kit_count_failed" };
    }
    if (existingCount >= limit) {
      return { ok: false, error: "kit_limit" };
    }
  }

  const insertPayload: TablesInsert<"brand_kits"> = {
    owner_id: userId,
    name: validated.data.name,
    style: validated.data.style as TablesInsert<"brand_kits">["style"],
  };

  const { data, error } = await supabase
    .from("brand_kits")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "insert_failed" };
  }

  return { ok: true, data };
}

export async function updateBrandKit(
  id: string,
  input: { name?: string; style?: unknown },
): Promise<ActionResult<{ kit: BrandKit; syncedCodes: number }>> {
  const idResult = validateBrandKitId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const patchResult = validateBrandKitPatch(input);
  if (!patchResult.ok) {
    return patchResult;
  }
  if (Object.keys(patchResult.data).length === 0) {
    return { ok: false, error: "empty_update" };
  }

  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  const updatePayload: TablesUpdate<"brand_kits"> = {};
  if (patchResult.data.name !== undefined) {
    updatePayload.name = patchResult.data.name;
  }
  if (patchResult.data.style !== undefined) {
    updatePayload.style = patchResult.data.style as TablesUpdate<"brand_kits">["style"];
  }

  const { data, error } = await supabase
    .from("brand_kits")
    .update(updatePayload)
    .eq("id", idResult.data)
    .select()
    .single();

  if (error || !data) {
    // Covers both "not found" and "not yours" — RLS makes the two
    // indistinguishable from here, which is the correct behavior.
    return { ok: false, error: "update_failed" };
  }

  // Hard-sync propagation (P9.8-B1, D5 as amended): a style edit fans out to
  // every attached code in one atomic SQL call (sync_kit_codes, migration
  // 20260804000011 — security invoker, so RLS scopes it to the caller's own
  // rows). Rename-only saves never reach this branch and never touch codes.
  // A propagation failure FAILS the save loudly rather than best-effort: a
  // kit that saved but half-propagated is exactly the silent stale-style
  // state hard sync exists to kill, and the caller can simply save again.
  let syncedCodes = 0;
  if (patchResult.data.style !== undefined) {
    const { data: count, error: syncError } = await supabase.rpc("sync_kit_codes", {
      p_kit_id: idResult.data,
    });
    if (syncError || typeof count !== "number") {
      return { ok: false, error: "sync_failed" };
    }
    syncedCodes = count;
  }

  return { ok: true, data: { kit: data, syncedCodes } };
}

export async function deleteBrandKit(id: string): Promise<ActionResult<{ id: string }>> {
  const idResult = validateBrandKitId(id);
  if (!idResult.ok) {
    return idResult;
  }

  // Destructive action — getUser(), not getClaims() (CLAUDE.md hard rule).
  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("brand_kits")
    .delete()
    .eq("id", idResult.data)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "delete_failed" };
  }

  // Best-effort logo cleanup at the kit's storage path — tolerate absence
  // (a kit may never have had a logo uploaded). A failure here doesn't roll
  // back the already-deleted row: the kit row is gone regardless, and an
  // orphaned logo object is invisible to the owner (RLS still scopes it to
  // them, and the Studio never re-lists it without a kit row to point at).
  const logoPath = `${userId}/${idResult.data}`;
  const { error: removeError } = await supabase.storage
    .from("brand-logos")
    .remove([logoPath]);
  if (removeError) {
    console.error("brand-logos cleanup failed for", logoPath, removeError);
  }

  return { ok: true, data: { id: data.id } };
}

/**
 * Studio top-bar sign-out. Bound directly to a `<form action={signOutAction}>`
 * so it works with zero client JS. `redirect()` throws internally — nothing
 * after it runs, and the client is navigated to /login in the same roundtrip.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setDefaultBrandKit(id: string): Promise<ActionResult<BrandKit>> {
  const idResult = validateBrandKitId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  // Clear any existing default first, then set the new one — two statements
  // are fine (per spec); the brand_kits_one_default partial unique index is
  // the backstop against ever having two defaults at once. No manual
  // owner_id filter here: the "own brand kits" RLS policy already scopes
  // this update to the caller's own rows.
  const { error: clearError } = await supabase
    .from("brand_kits")
    .update({ is_default: false })
    .eq("is_default", true);
  if (clearError) {
    return { ok: false, error: "clear_default_failed" };
  }

  const { data, error } = await supabase
    .from("brand_kits")
    .update({ is_default: true })
    .eq("id", idResult.data)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "set_default_failed" };
  }

  return { ok: true, data };
}
