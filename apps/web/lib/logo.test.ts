import { describe, expect, it } from "vitest";
import {
  ACCEPTED_LOGO_TYPES,
  LOGO_PADDING_DEFAULT,
  LOGO_SIZE_RATIO_DEFAULT,
  LOGO_SIZE_RATIO_MAX,
  LOGO_SIZE_RATIO_MIN,
  MAX_LOGO_ASSET_ID_LENGTH,
  MAX_LOGO_BYTES,
  isLogoDataUri,
  logoValidationMessage,
  validateLogoFile,
} from "./logo";

describe("validateLogoFile", () => {
  for (const type of ACCEPTED_LOGO_TYPES) {
    it(`accepts ${type} at the size boundary`, () => {
      const result = validateLogoFile({ type, size: MAX_LOGO_BYTES });
      expect(result).toEqual({ ok: true });
    });
  }

  it("rejects a type outside the accepted set", () => {
    const result = validateLogoFile({ type: "image/svg+xml", size: 1024 });
    expect(result).toEqual({ ok: false, error: "invalid_type" });
  });

  it("rejects a gif (not in the accepted set)", () => {
    const result = validateLogoFile({ type: "image/gif", size: 1024 });
    expect(result).toEqual({ ok: false, error: "invalid_type" });
  });

  it("rejects a file one byte over the 2MB cap", () => {
    const result = validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 });
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("accepts a small file well under the cap", () => {
    const result = validateLogoFile({ type: "image/webp", size: 512 });
    expect(result).toEqual({ ok: true });
  });
});

describe("logoValidationMessage", () => {
  it("has a message for every error variant", () => {
    expect(logoValidationMessage("invalid_type")).toMatch(/PNG|JPEG|WebP/);
    expect(logoValidationMessage("too_large")).toMatch(/2MB/);
  });
});

describe("isLogoDataUri", () => {
  it("accepts a well-formed png data URI", () => {
    expect(isLogoDataUri("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
  });

  it("accepts jpeg and webp mime types", () => {
    expect(isLogoDataUri("data:image/jpeg;base64,/9k=")).toBe(true);
    expect(isLogoDataUri("data:image/webp;base64,UklGRg==")).toBe(true);
  });

  it("rejects svg+xml even when base64-encoded", () => {
    expect(isLogoDataUri("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
  });

  it("rejects a non-data-URI string", () => {
    expect(isLogoDataUri("https://evil.example/x.png")).toBe(false);
  });

  it("rejects a data URI with injected attribute syntax", () => {
    expect(isLogoDataUri('data:image/png;base64,abc" onload="x')).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isLogoDataUri("")).toBe(false);
  });
});

describe("MAX_LOGO_ASSET_ID_LENGTH", () => {
  // P4-U4 red-team: proves the cap actually admits a real MAX_LOGO_BYTES-sized
  // upload (base64-encoded, with a realistic data URI prefix) — a guard that
  // rejects legitimate max-size logos would just be a different bug.
  it("fits a base64-encoded MAX_LOGO_BYTES file plus its data URI prefix", () => {
    const rawBytes = new Uint8Array(MAX_LOGO_BYTES);
    const base64 = Buffer.from(rawBytes).toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;
    expect(dataUri.length).toBeLessThanOrEqual(MAX_LOGO_ASSET_ID_LENGTH);
  });

  it("rejects something meaningfully larger than a MAX_LOGO_BYTES upload could ever encode", () => {
    // A 10MB file's base64 form is far past the cap — anything this size
    // reaching validateBrandKitInput did not come from validateLogoFile.
    const encodedFor10MB = Math.ceil((10 * 1024 * 1024) / 3) * 4;
    expect(encodedFor10MB).toBeGreaterThan(MAX_LOGO_ASSET_ID_LENGTH);
  });
});

describe("schema-aligned constants", () => {
  // These mirror packages/shared/src/style.ts logo defaults/bounds — pinned
  // here so a schema change that isn't mirrored in this file fails loudly.
  it("match the shared style schema's logo bounds", () => {
    expect(LOGO_SIZE_RATIO_MIN).toBe(0.1);
    expect(LOGO_SIZE_RATIO_MAX).toBe(0.4);
    expect(LOGO_SIZE_RATIO_DEFAULT).toBe(0.32);
    expect(LOGO_PADDING_DEFAULT).toBe(1);
  });
});
