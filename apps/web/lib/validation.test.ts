import { describe, expect, it } from "vitest";
import { defaultQrStyle } from "@qrcdn/shared";
import { MAX_LOGO_ASSET_ID_LENGTH } from "./logo";
import {
  validateApiKeyId,
  validateApiKeyName,
  validateBrandKitId,
  validateBrandKitInput,
  validateBrandKitPatch,
  validateCodePatchInput,
  validateDestination,
  validateDynamicCodeInput,
  validatePaused,
  validateQrCodeId,
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

describe("validateDestination", () => {
  it("accepts a plain https URL", () => {
    const result = validateDestination("https://example.com/landing");
    expect(result).toEqual({ ok: true, data: "https://example.com/landing" });
  });

  it("accepts a plain http URL", () => {
    const result = validateDestination("http://example.com");
    expect(result.ok).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    const result = validateDestination("  https://example.com  ");
    expect(result).toEqual({ ok: true, data: "https://example.com" });
  });

  it("rejects a non-http(s) protocol", () => {
    const result = validateDestination("ftp://example.com/file");
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("rejects a bare IP host (no dotted domain with a letters-only TLD)", () => {
    const result = validateDestination("http://192.168.1.1");
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("rejects a malformed URL", () => {
    const result = validateDestination("not a url");
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("rejects a non-string input", () => {
    const result = validateDestination(42);
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("accepts a URL at exactly the 2048-character boundary", () => {
    const padding = "a".repeat(2048 - "https://example.com/".length);
    const url = `https://example.com/${padding}`;
    expect(url).toHaveLength(2048);
    const result = validateDestination(url);
    expect(result).toEqual({ ok: true, data: url });
  });

  it("rejects a URL over the 2048-character boundary", () => {
    const padding = "a".repeat(2048 - "https://example.com/".length + 1);
    const url = `https://example.com/${padding}`;
    expect(url).toHaveLength(2049);
    const result = validateDestination(url);
    expect(result).toEqual({ ok: false, error: "destination_too_long" });
  });
});

describe("validateDynamicCodeInput", () => {
  it("accepts a valid name, destination, and style", () => {
    const result = validateDynamicCodeInput({
      name: "Spring menu",
      destination: "https://example.com",
      style: { v: 1 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Spring menu");
      expect(result.data.destination).toBe("https://example.com");
      expect(result.data.style).toEqual(defaultQrStyle);
    }
  });

  it("rejects a missing name before anything else", () => {
    const result = validateDynamicCodeInput({
      name: "",
      destination: "https://example.com",
      style: { v: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a name over 60 chars", () => {
    const result = validateDynamicCodeInput({
      name: "a".repeat(61),
      destination: "https://example.com",
      style: { v: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid destination before checking style", () => {
    const result = validateDynamicCodeInput({
      name: "Menu",
      destination: "not a url",
      style: "garbage",
    });
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("rejects an invalid style payload", () => {
    const result = validateDynamicCodeInput({
      name: "Menu",
      destination: "https://example.com",
      style: { v: 2 },
    });
    expect(result).toEqual({ ok: false, error: "invalid_style" });
  });

  it("rejects an oversized logo assetId", () => {
    const result = validateDynamicCodeInput({
      name: "Menu",
      destination: "https://example.com",
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

describe("validatePaused", () => {
  it("accepts true", () => {
    expect(validatePaused(true)).toEqual({ ok: true, data: true });
  });

  it("accepts false", () => {
    expect(validatePaused(false)).toEqual({ ok: true, data: false });
  });

  it("rejects a non-boolean", () => {
    expect(validatePaused("true")).toEqual({ ok: false, error: "invalid_paused" });
  });

  it("rejects undefined", () => {
    expect(validatePaused(undefined)).toEqual({ ok: false, error: "invalid_paused" });
  });
});

describe("validateCodePatchInput", () => {
  it("rejects a patch with both fields absent", () => {
    const result = validateCodePatchInput({});
    expect(result).toEqual({ ok: false, error: "empty_patch" });
  });

  it("validates only destination when paused is omitted", () => {
    const result = validateCodePatchInput({ destination: "https://example.com" });
    expect(result).toEqual({ ok: true, data: { destination: "https://example.com" } });
  });

  it("validates only paused when destination is omitted", () => {
    const result = validateCodePatchInput({ paused: true });
    expect(result).toEqual({ ok: true, data: { paused: true } });
  });

  it("validates both fields when both are supplied", () => {
    const result = validateCodePatchInput({
      destination: "https://example.com",
      paused: false,
    });
    expect(result).toEqual({
      ok: true,
      data: { destination: "https://example.com", paused: false },
    });
  });

  it("rejects an invalid destination in a patch", () => {
    const result = validateCodePatchInput({ destination: "not a url" });
    expect(result).toEqual({ ok: false, error: "invalid_destination" });
  });

  it("rejects an invalid paused value in a patch", () => {
    const result = validateCodePatchInput({ paused: "true" });
    expect(result).toEqual({ ok: false, error: "invalid_paused" });
  });
});

describe("validateQrCodeId", () => {
  const validUuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

  it("accepts a valid uuid", () => {
    expect(validateQrCodeId(validUuid)).toEqual({ ok: true, data: validUuid });
  });

  it("rejects a non-uuid string", () => {
    expect(validateQrCodeId("not-a-uuid")).toEqual({ ok: false, error: "invalid_id" });
  });

  it("rejects a non-string id", () => {
    expect(validateQrCodeId(123)).toEqual({ ok: false, error: "invalid_id" });
  });
});

describe("validateApiKeyName", () => {
  // api_keys.name's DB check constraint is 1..80 chars (initial_schema.sql)
  // — wider than brand_kits/qr_codes' 60-char cap, so the 80-char boundary
  // is the one worth asserting here rather than re-testing the 60-char case
  // validateBrandKitInput's own suite already covers.
  it("accepts a name at exactly the 80-character boundary", () => {
    const name = "a".repeat(80);
    expect(validateApiKeyName(name)).toEqual({ ok: true, data: name });
  });

  it("rejects a name over 80 characters", () => {
    expect(validateApiKeyName("a".repeat(81))).toEqual({ ok: false, error: "name_too_long" });
  });
});

describe("validateApiKeyId", () => {
  const validUuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

  it("accepts a valid uuid", () => {
    expect(validateApiKeyId(validUuid)).toEqual({ ok: true, data: validUuid });
  });

  it("rejects a non-uuid string", () => {
    expect(validateApiKeyId("not-a-uuid")).toEqual({ ok: false, error: "invalid_id" });
  });
});
