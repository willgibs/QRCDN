import { z } from "zod";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { MAX_LOGO_ASSET_ID_LENGTH } from "./logo";

// Pure input-validation helpers for the Studio brand-kit server actions
// (apps/web/app/(app)/studio/actions.ts). Kept dependency-free from Supabase
// so they're directly unit-testable — see apps/web/lib/validation.test.ts.

/**
 * Discriminated result every server action returns — actions never throw to
 * the client (agent-playbook spec for P4-U1).
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const brandKitNameSchema = z
  .string()
  .trim()
  .min(1, "name_required")
  .max(60, "name_too_long");

export const brandKitIdSchema = z.uuid("invalid_id");

export interface ValidatedBrandKit {
  name: string;
  style: QrStyle;
}

export interface ValidatedBrandKitPatch {
  name?: string;
  style?: QrStyle;
}

function firstIssueMessage(result: z.ZodSafeParseError<string>, fallback: string): string {
  return result.error.issues[0]?.message ?? fallback;
}

/**
 * Post-parse guard: `qrStyleSchema`'s `logo.assetId` is a bare `z.string()`
 * with no length bound (additive-only schema evolution means we can't tighten
 * it there without a migration decision). Reject oversized asset ids here
 * instead — same boundary both create and update funnel through, independent
 * of whether the value happens to be a well-formed data URI (see
 * apps/web/lib/logo.ts for why the cap is sized the way it is).
 */
function styleWithinLimits(style: QrStyle): boolean {
  return !style.logo || style.logo.assetId.length <= MAX_LOGO_ASSET_ID_LENGTH;
}

/** Full validation for create: both name and style are required. */
export function validateBrandKitInput(input: {
  name: unknown;
  style: unknown;
}): ActionResult<ValidatedBrandKit> {
  const name = brandKitNameSchema.safeParse(input.name);
  if (!name.success) {
    return { ok: false, error: firstIssueMessage(name, "invalid_name") };
  }

  try {
    const style = parseQrStyle(input.style);
    if (!styleWithinLimits(style)) {
      return { ok: false, error: "logo_too_large" };
    }
    return { ok: true, data: { name: name.data, style } };
  } catch {
    return { ok: false, error: "invalid_style" };
  }
}

/**
 * Partial validation for update: only the fields the caller supplied are
 * validated/returned, so a rename-only or style-only edit doesn't require
 * resending the other field.
 */
export function validateBrandKitPatch(input: {
  name?: unknown;
  style?: unknown;
}): ActionResult<ValidatedBrandKitPatch> {
  const patch: ValidatedBrandKitPatch = {};

  if (input.name !== undefined) {
    const name = brandKitNameSchema.safeParse(input.name);
    if (!name.success) {
      return { ok: false, error: firstIssueMessage(name, "invalid_name") };
    }
    patch.name = name.data;
  }

  if (input.style !== undefined) {
    try {
      const style = parseQrStyle(input.style);
      if (!styleWithinLimits(style)) {
        return { ok: false, error: "logo_too_large" };
      }
      patch.style = style;
    } catch {
      return { ok: false, error: "invalid_style" };
    }
  }

  return { ok: true, data: patch };
}

export function validateBrandKitId(input: unknown): ActionResult<string> {
  const id = brandKitIdSchema.safeParse(input);
  if (!id.success) {
    return { ok: false, error: "invalid_id" };
  }
  return { ok: true, data: id.data };
}

// ---------------------------------------------------------------------------
// Dynamic-code CRUD (P5-U1, apps/web/app/(app)/studio/code-actions.ts).
// qr_codes has no `name` column (supabase/migrations/20260721000001_initial_
// schema.sql) — only destination and the frozen style snapshot are
// persisted per code. See code-actions.ts's file header for the full note.
// ---------------------------------------------------------------------------

export const qrCodeIdSchema = z.uuid("invalid_id");

/**
 * http/https only, ≤2048 chars. `httpUrl()` also requires a dotted hostname
 * with a letters-only TLD (zod v4's `core.regexes.domain`) — deliberately
 * rejects bare IPs/`localhost`, which is the right call for a destination a
 * printed, permanent code redirects to.
 */
export const destinationUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.httpUrl("invalid_destination").max(2048, "destination_too_long"),
);

export const pausedSchema = z.boolean();

export interface ValidatedDynamicCode {
  name: string;
  destination: string;
  style: QrStyle;
}

/** Full validation for create: name, destination, and style all required.
 *  Name reuses the brand-kit rules (1..60 trimmed — stricter than the DB's
 *  1..80 check, deliberately). */
export function validateDynamicCodeInput(input: {
  name: unknown;
  destination: unknown;
  style: unknown;
}): ActionResult<ValidatedDynamicCode> {
  const name = brandKitNameSchema.safeParse(input.name);
  if (!name.success) {
    return { ok: false, error: firstIssueMessage(name, "invalid_name") };
  }

  const destination = destinationUrlSchema.safeParse(input.destination);
  if (!destination.success) {
    return { ok: false, error: firstIssueMessage(destination, "invalid_destination") };
  }

  try {
    const style = parseQrStyle(input.style);
    if (!styleWithinLimits(style)) {
      return { ok: false, error: "logo_too_large" };
    }
    return { ok: true, data: { name: name.data, destination: destination.data, style } };
  } catch {
    return { ok: false, error: "invalid_style" };
  }
}

/** retargetCode's destination-only input. */
export function validateDestination(input: unknown): ActionResult<string> {
  const result = destinationUrlSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: firstIssueMessage(result, "invalid_destination") };
  }
  return { ok: true, data: result.data };
}

export function validatePaused(input: unknown): ActionResult<boolean> {
  const result = pausedSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "invalid_paused" };
  }
  return { ok: true, data: result.data };
}

export function validateQrCodeId(input: unknown): ActionResult<string> {
  const id = qrCodeIdSchema.safeParse(input);
  if (!id.success) {
    return { ok: false, error: "invalid_id" };
  }
  return { ok: true, data: id.data };
}

// ---------------------------------------------------------------------------
// API key management (P7-U4, apps/web/app/(app)/api-keys/actions.ts). Mirrors
// the brand-kit name/id validators above — same shape, different DB check
// constraint: api_keys.name is `check (char_length(name) between 1 and 80)`
// (supabase/migrations/20260721000001_initial_schema.sql), wider than
// brand_kits/qr_codes' 60-char cap, so this gets its own schema rather than
// reusing brandKitNameSchema.
// ---------------------------------------------------------------------------

export const apiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "name_required")
  .max(80, "name_too_long");

export const apiKeyIdSchema = z.uuid("invalid_id");

export function validateApiKeyName(input: unknown): ActionResult<string> {
  const name = apiKeyNameSchema.safeParse(input);
  if (!name.success) {
    return { ok: false, error: firstIssueMessage(name, "invalid_name") };
  }
  return { ok: true, data: name.data };
}

export function validateApiKeyId(input: unknown): ActionResult<string> {
  const id = apiKeyIdSchema.safeParse(input);
  if (!id.success) {
    return { ok: false, error: "invalid_id" };
  }
  return { ok: true, data: id.data };
}

export interface ValidatedCodePatch {
  destination?: string;
  paused?: boolean;
}

/**
 * Partial validation for the public API's PATCH surface (P7): only the
 * fields the caller supplied are validated/returned, mirroring
 * `validateBrandKitPatch`'s style above. Unlike the studio's `retargetCode`/
 * `setCodePaused` actions (which are single-field, one-endpoint-per-field),
 * the API exposes one PATCH endpoint that accepts either or both fields —
 * so "the caller sent an empty object" is its own rejected case rather than
 * a no-op.
 */
export function validateCodePatchInput(input: {
  destination?: unknown;
  paused?: unknown;
}): ActionResult<ValidatedCodePatch> {
  if (input.destination === undefined && input.paused === undefined) {
    return { ok: false, error: "empty_patch" };
  }

  const patch: ValidatedCodePatch = {};

  if (input.destination !== undefined) {
    const destination = destinationUrlSchema.safeParse(input.destination);
    if (!destination.success) {
      return { ok: false, error: firstIssueMessage(destination, "invalid_destination") };
    }
    patch.destination = destination.data;
  }

  if (input.paused !== undefined) {
    const paused = pausedSchema.safeParse(input.paused);
    if (!paused.success) {
      return { ok: false, error: "invalid_paused" };
    }
    patch.paused = paused.data;
  }

  return { ok: true, data: patch };
}
