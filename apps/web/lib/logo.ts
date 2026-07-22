// Logo upload helpers for the Studio (P4-U3). Pure validation logic is
// colocated and unit-tested (lib/logo.test.ts); `readFileAsDataUri` is a
// thin FileReader wrapper (DOM-only, exercised manually — jsdom isn't in
// the dependency tree and isn't worth adding just to cover a five-line
// Promise wrapper).

// Mirrors the `brand-logos` bucket's own limits
// (supabase/migrations/20260722000005_brand_logo_storage.sql) — the client
// check exists purely so a rejection is instant instead of round-tripping
// to Storage first; the bucket enforces the same limits regardless.
export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AcceptedLogoType = (typeof ACCEPTED_LOGO_TYPES)[number];

export type LogoValidationError = "invalid_type" | "too_large";

/** Schema defaults (packages/shared/src/style.ts `logo.*`) — used when a
 *  fresh upload creates a `style.logo` object from scratch, and as the
 *  Studio's own slider bounds (hard cap 0.4 per D6). */
export const LOGO_SIZE_RATIO_DEFAULT = 0.32;
export const LOGO_SIZE_RATIO_MIN = 0.1;
export const LOGO_SIZE_RATIO_MAX = 0.4;
export const LOGO_PADDING_DEFAULT = 1;

function isAcceptedLogoType(type: string): type is AcceptedLogoType {
  return (ACCEPTED_LOGO_TYPES as readonly string[]).includes(type);
}

/** Client-side pre-check before a File ever reaches FileReader or Storage. */
export function validateLogoFile(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: LogoValidationError } {
  if (!isAcceptedLogoType(file.type)) {
    return { ok: false, error: "invalid_type" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "too_large" };
  }
  return { ok: true };
}

export function logoValidationMessage(error: LogoValidationError): string {
  switch (error) {
    case "invalid_type":
      return "PNG, JPEG, or WebP only.";
    case "too_large":
      return "Logo must be 2MB or smaller.";
  }
}

// Deliberately duplicated from packages/qr-engine/src/render.ts's
// `DATA_URI_RE` rather than imported — the engine doesn't re-export it
// (only `renderQr` itself validates at render time), and this copy exists
// as a defensive guard *before* a persisted `style.logo.assetId` ever
// reaches `RenderRequest.logoDataUri` (see qr-engine.md: "validate/whitelist
// the value immediately before it's used, even if validated upstream").
// svg+xml is deliberately excluded, matching the engine.
const DATA_URI_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** True if `value` is a base64 image data URI the engine will accept as
 *  `RenderRequest.logoDataUri` (png/jpeg/webp only). */
export function isLogoDataUri(value: string): boolean {
  return DATA_URI_RE.test(value);
}

// P4-U4 red-team finding: `packages/shared/src/style.ts` models `logo.assetId`
// as a bare, unconstrained `z.string()` — there is no schema-level cap. The
// Studio always stores the resolved data URI *directly* in that field
// (studio-shell.tsx), and `updateBrandKit`/`createBrandKit` are server
// actions — plain POST endpoints a caller can invoke directly with a
// hand-built `style` payload, bypassing `validateLogoFile`'s 2MB browser-side
// check entirely. The `brand-logos` Storage bucket enforces its own
// `file_size_limit` (supabase/migrations/20260722000005_brand_logo_storage.sql),
// but that only guards the durable-upload path — it says nothing about what
// can be written into the `brand_kits.style` jsonb column itself. Without a
// guard here, a forged request could embed an arbitrarily large string (data
// URI or not) in `style.logo.assetId` and have it persisted forever (DB
// bloat, bandwidth on every future read/render). Base64 inflates by 4/3
// (rounded up to a multiple of 4); `"data:image/jpeg;base64,"` is the longest
// accepted MIME prefix — both folded in so a real MAX_LOGO_BYTES-sized upload
// still fits under this cap with no headroom lost.
const LONGEST_DATA_URI_PREFIX_LENGTH = "data:image/jpeg;base64,".length;
export const MAX_LOGO_ASSET_ID_LENGTH =
  Math.ceil(MAX_LOGO_BYTES / 3) * 4 + LONGEST_DATA_URI_PREFIX_LENGTH;

/** Reads a File as a base64 data URI (`FileReader.readAsDataURL`). Browser-only. */
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("file_read_failed"));
      }
    };
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}
