import { describe, expect, it } from "vitest";
import { defaultQrStyle } from "@qrcdn/shared";
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
