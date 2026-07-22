import { describe, expect, it } from "vitest";
import { defaultQrStyle } from "@qrcdn/shared";
import { MAX_LOGO_ASSET_ID_LENGTH } from "./logo";
import {
  validateBrandKitId,
  validateBrandKitInput,
  validateBrandKitPatch,
} from "./validation";

describe("validateBrandKitInput", () => {
  it("accepts a trimmed name and a valid style", () => {
    const result = validateBrandKitInput({ name: "  My Kit  ", style: { v: 1 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("My Kit");
      expect(result.data.style).toEqual(defaultQrStyle);
    }
  });

  it("rejects an empty name", () => {
    const result = validateBrandKitInput({ name: "   ", style: { v: 1 } });
    expect(result).toEqual({ ok: false, error: "name_required" });
  });

  it("rejects a name over 60 characters", () => {
    const result = validateBrandKitInput({ name: "a".repeat(61), style: { v: 1 } });
    expect(result).toEqual({ ok: false, error: "name_too_long" });
  });

  it("accepts a name at exactly the 60-character boundary", () => {
    const result = validateBrandKitInput({ name: "a".repeat(60), style: { v: 1 } });
    expect(result.ok).toBe(true);
  });

  it("rejects a non-string name", () => {
    const result = validateBrandKitInput({ name: 42, style: { v: 1 } });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid style payload", () => {
    const result = validateBrandKitInput({ name: "Kit", style: { v: 2 } });
    expect(result).toEqual({ ok: false, error: "invalid_style" });
  });

  it("rejects a style with an oklch color instead of sRGB hex", () => {
    const result = validateBrandKitInput({
      name: "Kit",
      style: { v: 1, fill: { type: "solid", color: "oklch(0.5 0.1 250)" } },
    });
    expect(result).toEqual({ ok: false, error: "invalid_style" });
  });

  it("rejects a logo sizeRatio above the 0.4 hard cap", () => {
    const result = validateBrandKitInput({
      name: "Kit",
      style: {
        v: 1,
        logo: { assetId: "x", sizeRatio: 0.9, padding: 1, knockout: true, shape: "auto" },
      },
    });
    expect(result).toEqual({ ok: false, error: "invalid_style" });
  });

  // P4-U4 red-team: `logo.assetId` is a bare `z.string()` in the shared
  // schema (additive-evolution constraint — see qr-engine.md), so nothing
  // upstream stops a forged `createBrandKit` call (server actions are just
  // POST endpoints; the client's 2MB `validateLogoFile` check is trivially
  // bypassable) from smuggling an oversized string into `brand_kits.style`.
  // This exercises the app-layer guard added in lib/validation.ts.
  it("rejects a logo assetId over the byte-derived length cap", () => {
    const result = validateBrandKitInput({
      name: "Kit",
      style: {
        v: 1,
        logo: {
          assetId: "a".repeat(MAX_LOGO_ASSET_ID_LENGTH + 1),
          sizeRatio: 0.3,
          padding: 1,
          knockout: true,
          shape: "auto",
        },
      },
    });
    expect(result).toEqual({ ok: false, error: "logo_too_large" });
  });

  it("accepts a logo assetId at exactly the length cap", () => {
    const result = validateBrandKitInput({
      name: "Kit",
      style: {
        v: 1,
        logo: {
          assetId: "a".repeat(MAX_LOGO_ASSET_ID_LENGTH),
          sizeRatio: 0.3,
          padding: 1,
          knockout: true,
          shape: "auto",
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("a style with no logo is never rejected for length", () => {
    const result = validateBrandKitInput({ name: "Kit", style: { v: 1, logo: null } });
    expect(result.ok).toBe(true);
  });
});

describe("validateBrandKitPatch", () => {
  it("returns an empty patch when nothing is supplied", () => {
    const result = validateBrandKitPatch({});
    expect(result).toEqual({ ok: true, data: {} });
  });

  it("validates only the name when style is omitted", () => {
    const result = validateBrandKitPatch({ name: "Renamed" });
    expect(result).toEqual({ ok: true, data: { name: "Renamed" } });
  });

  it("validates only the style when name is omitted", () => {
    const result = validateBrandKitPatch({ style: { v: 1 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBeUndefined();
      expect(result.data.style).toEqual(defaultQrStyle);
    }
  });

  it("rejects an invalid name in a patch", () => {
    const result = validateBrandKitPatch({ name: "" });
    expect(result).toEqual({ ok: false, error: "name_required" });
  });

  it("rejects an invalid style in a patch", () => {
    const result = validateBrandKitPatch({ style: { v: 1, ecc: "bogus" } });
    expect(result).toEqual({ ok: false, error: "invalid_style" });
  });

  it("rejects an oversized logo assetId in a patch (updateBrandKit replay path)", () => {
    const result = validateBrandKitPatch({
      style: {
        v: 1,
        logo: {
          assetId: "a".repeat(MAX_LOGO_ASSET_ID_LENGTH + 1),
          sizeRatio: 0.3,
          padding: 1,
          knockout: true,
          shape: "auto",
        },
      },
    });
    expect(result).toEqual({ ok: false, error: "logo_too_large" });
  });
});

describe("validateBrandKitId", () => {
  // A real gen_random_uuid()-shaped v4 uuid — zod v4's z.uuid() checks the
  // RFC 4122 version/variant nibbles, so the simplified repeating-hex ids
  // used as pgTAP fixtures (e.g. "11111111-1111-1111-1111-111111111111")
  // are NOT valid here even though Postgres's uuid type accepts them.
  const validUuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

  it("accepts a valid uuid", () => {
    const result = validateBrandKitId(validUuid);
    expect(result).toEqual({ ok: true, data: validUuid });
  });

  it("rejects a non-uuid string", () => {
    const result = validateBrandKitId("not-a-uuid");
    expect(result).toEqual({ ok: false, error: "invalid_id" });
  });

  it("rejects a non-string id", () => {
    const result = validateBrandKitId(123);
    expect(result).toEqual({ ok: false, error: "invalid_id" });
  });
});
