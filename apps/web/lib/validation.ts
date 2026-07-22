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

function nameError(result: z.ZodSafeParseError<string>): string {
  return result.error.issues[0]?.message ?? "invalid_name";
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
    return { ok: false, error: nameError(name) };
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
      return { ok: false, error: nameError(name) };
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
