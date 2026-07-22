"use server";

import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import {
  validateDestination,
  validateDynamicCodeInput,
  validatePaused,
  validateQrCodeId,
  type ActionResult,
} from "@/lib/validation";
import { generateSlug } from "@/lib/slug";
import { writeSlugToKv } from "@/lib/kv-sync";
import type { Tables, TablesInsert } from "@qrcdn/shared";

// Server actions for dynamic-code CRUD (P5-U1). Every input is zod-parsed
// (apps/web/lib/validation.ts) before it reaches Supabase, following the
// Studio brand-kit action pattern verbatim
// (apps/web/app/(app)/studio/actions.ts): ActionResult everywhere, no
// manual owner_id filters beyond what INSERT requires (the "own qr codes"
// RLS policy — supabase/migrations/20260721000002_rls_policies.sql — already
// scopes every select/update to the caller).
//
// Schema fact (read, not guessed — supabase/migrations/20260721000001_
// initial_schema.sql): qr_codes has NO `name` column. It has `destination_url`
// (not `destination`), a `status` text column checked against
// ('active' | 'paused' | 'archived') — not a boolean `paused` field — and
// `style_version` (integer, defaults to 1, untouched by this unit). The
// `name` column was NOT in the original schema — the U1 agent caught the
// spec/schema gap and refused to silently drop the field; migration
// 20260722000006 added it (1..80 check, matching brand_kits/api_keys), and
// this file carries it end-to-end (validate → insert → summary).
//
// scan_count is written ONLY by the nightly rollup job (D8, CLAUDE.md hard
// rule) — no action in this file ever touches it, including in a `.select()`
// projection meant for writing.

export type QrCode = Tables<"qr_codes">;

/** Columns the codes-list UI needs — never the frozen `style` snapshot
 *  (large jsonb, including a possible logo data URI) and never a write path
 *  for `scan_count` (D8: rollup-only). */
export type DynamicCodeSummary = Pick<
  Tables<"qr_codes">,
  "id" | "slug" | "name" | "destination_url" | "status" | "scan_count" | "created_at"
>;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_SLUG_ATTEMPTS = 5;

/**
 * getClaims() is sufficient for identity checks that gate non-destructive
 * reads/writes (create/list) — hard rule from CLAUDE.md.
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
 * destructive/destructive-adjacent actions (hard rule from CLAUDE.md) —
 * retargetCode and setCodePaused both change where a printed, live code
 * sends people, so both use this.
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
 * Counts the caller's non-archived dynamic codes against their plan limit.
 * "archived" is the closest thing this schema has to a soft-delete state
 * for qr_codes (CLAUDE.md: codes are never actually deleted) — no action in
 * this unit can produce one, but excluding it here is the correct reading
 * of the spec's "count existing non-deleted codes" against a schema that has
 * no deleted_at/is_deleted column. Paused codes still count (D14: they keep
 * existing, just go read-only beyond the free cap).
 */
async function dynamicCodeCountFor(supabase: SupabaseServerClient): Promise<number | null> {
  const { count, error } = await supabase
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("kind", "dynamic")
    .neq("status", "archived");
  if (error) {
    return null;
  }
  return count ?? 0;
}

export async function createDynamicCode(input: {
  name: unknown;
  destination: unknown;
  style: unknown;
}): Promise<ActionResult<QrCode>> {
  const validated = validateDynamicCodeInput(input);
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
  const limit = PLAN_LIMITS[plan].dynamicCodes;

  const existingCount = await dynamicCodeCountFor(supabase);
  if (existingCount === null) {
    return { ok: false, error: "code_count_failed" };
  }
  // Check-then-insert race accepted, not fixed — same call as createBrandKit's
  // kit_limit check (apps/web/app/(app)/studio/actions.ts, documented in
  // docs/STATUS.md's P4 notes): a DB-level backstop would duplicate the
  // entitlement constants against the single-source-of-truth hard rule.
  if (existingCount >= limit) {
    return { ok: false, error: "code_limit" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const insertPayload: TablesInsert<"qr_codes"> = {
      owner_id: userId,
      slug: generateSlug(),
      kind: "dynamic",
      name: validated.data.name,
      destination_url: validated.data.destination,
      // Frozen snapshot at creation — never mutated by brand-kit edits
      // afterward (D5 hard rule). No update action in this file accepts a
      // style param.
      style: validated.data.style as TablesInsert<"qr_codes">["style"],
    };

    const { data, error } = await supabase
      .from("qr_codes")
      .insert(insertPayload)
      .select()
      .single();

    if (!error && data) {
      return { ok: true, data };
    }

    // 23505 = Postgres unique_violation. slug is the table's only unique
    // column, so any 23505 here is a slug collision — retry with a fresh
    // draw. Anything else is a real failure; stop immediately.
    if (error?.code !== "23505") {
      return { ok: false, error: "insert_failed" };
    }
  }

  return { ok: false, error: "slug_exhausted" };
}

export async function listDynamicCodes(): Promise<ActionResult<DynamicCodeSummary[]>> {
  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  // No manual owner_id filter: the "own qr codes" RLS policy already scopes
  // this to the caller's own rows.
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, slug, name, destination_url, status, scan_count, created_at")
    .eq("kind", "dynamic")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { ok: false, error: "list_failed" };
  }

  return { ok: true, data };
}

export async function retargetCode(
  id: string,
  destination: unknown,
): Promise<ActionResult<{ id: string; destinationUrl: string; kvSynced: boolean }>> {
  const idResult = validateQrCodeId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const destinationResult = validateDestination(destination);
  if (!destinationResult.ok) {
    return destinationResult;
  }

  // Destructive-adjacent: retargeting changes where an already-printed, live
  // code sends people — getUser(), not getClaims() (CLAUDE.md hard rule).
  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("qr_codes")
    .update({ destination_url: destinationResult.data })
    .eq("id", idResult.data)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status")
    .single();

  if (error || !data) {
    // Covers both "not found" and "not yours" — RLS makes the two
    // indistinguishable from here, which is the correct behavior.
    return { ok: false, error: "update_failed" };
  }

  // Postgres UPDATE already committed above — this is best-effort
  // write-through (D2). A KV failure does NOT fail the action; worst case
  // is ~60s staleness until the Worker's own read-through backfill.
  const kvResult = await writeSlugToKv(data.slug, {
    destination: data.destination_url ?? "",
    paused: data.status === "paused",
  });

  return {
    ok: true,
    data: {
      id: idResult.data,
      destinationUrl: data.destination_url ?? "",
      kvSynced: kvResult.synced,
    },
  };
}

export async function setCodePaused(
  id: string,
  paused: unknown,
): Promise<ActionResult<{ id: string; status: string; kvSynced: boolean }>> {
  const idResult = validateQrCodeId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const pausedResult = validatePaused(paused);
  if (!pausedResult.ok) {
    return pausedResult;
  }

  // getUser(), not getClaims(): pausing/resuming changes whether a printed,
  // live code redirects at all (CLAUDE.md destructive-adjacent hard rule).
  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }
  const { supabase } = ctx;

  const nextStatus = pausedResult.data ? "paused" : "active";

  const { data, error } = await supabase
    .from("qr_codes")
    .update({ status: nextStatus })
    .eq("id", idResult.data)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  const kvResult = await writeSlugToKv(data.slug, {
    destination: data.destination_url ?? "",
    paused: data.status === "paused",
  });

  return {
    ok: true,
    data: { id: idResult.data, status: data.status, kvSynced: kvResult.synced },
  };
}
