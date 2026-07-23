"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createDynamicCodeCore,
  getDynamicCodeStyleCore,
  listDynamicCodesCore,
  retargetCodeCore,
  setCodePausedCore,
  type CodesCoreCtx,
  type DynamicCodeSummary,
  type QrCode,
} from "@/lib/codes-core";
import { validateQrCodeId, type ActionResult } from "@/lib/validation";
import type { QrStyle } from "@qrcdn/shared";

// Server actions for dynamic-code CRUD (P5-U1). Thin wrappers only (P7-U2):
// all business logic — including the load-bearing owner_id filters — now
// lives in apps/web/lib/codes-core.ts, so the exact same logic is reachable
// from the cookie-authenticated studio path here AND the API-key-
// authenticated public API path (admin client, RLS bypassed). Each action
// below does exactly three things, in order: validate any input that must be
// resolved BEFORE we know who the caller is (kept here, unchanged from the
// pre-extraction bodies), authenticate via requireClaimsContext/
// requireUserContext (unchanged), then delegate to the matching *Core
// function with `{ db: supabase, ownerId: userId }`.
//
// Schema fact (read, not guessed — supabase/migrations/20260721000001_
// initial_schema.sql): qr_codes has NO `name` column originally scoped —
// see codes-core.ts's own header for the full note; unchanged by this unit.

export type { QrCode, DynamicCodeSummary };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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

function ctxFrom(auth: { supabase: SupabaseServerClient; userId: string }): CodesCoreCtx {
  return { db: auth.supabase, ownerId: auth.userId };
}

export async function createDynamicCode(input: {
  name: unknown;
  destination: unknown;
  style: unknown;
}): Promise<ActionResult<QrCode>> {
  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }

  return createDynamicCodeCore(ctxFrom(ctx), input);
}

export async function listDynamicCodes(): Promise<ActionResult<DynamicCodeSummary[]>> {
  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }

  return listDynamicCodesCore(ctxFrom(ctx));
}

export async function getDynamicCodeStyle(id: unknown): Promise<ActionResult<QrStyle>> {
  const idResult = validateQrCodeId(id);
  if (!idResult.ok) {
    return idResult;
  }

  const ctx = await requireClaimsContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }

  return getDynamicCodeStyleCore(ctxFrom(ctx), idResult.data);
}

export async function retargetCode(
  id: string,
  destination: unknown,
): Promise<ActionResult<{ id: string; destinationUrl: string; kvSynced: boolean }>> {
  const idResult = validateQrCodeId(id);
  if (!idResult.ok) {
    return idResult;
  }

  // Destructive-adjacent: retargeting changes where an already-printed, live
  // code sends people — getUser(), not getClaims() (CLAUDE.md hard rule).
  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }

  return retargetCodeCore(ctxFrom(ctx), idResult.data, destination);
}

export async function setCodePaused(
  id: string,
  paused: unknown,
): Promise<ActionResult<{ id: string; status: string; kvSynced: boolean }>> {
  const idResult = validateQrCodeId(id);
  if (!idResult.ok) {
    return idResult;
  }

  // getUser(), not getClaims(): pausing/resuming changes whether a printed,
  // live code redirects at all (CLAUDE.md destructive-adjacent hard rule).
  const ctx = await requireUserContext();
  if (!ctx) {
    return { ok: false, error: "unauthenticated" };
  }

  return setCodePausedCore(ctxFrom(ctx), idResult.data, paused);
}
