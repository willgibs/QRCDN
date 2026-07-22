import { describe, expect, it } from "vitest";
import { defaultQrStyle } from "@qrcdn/shared";
import { stylesEqual } from "./style-compare";

describe("stylesEqual", () => {
  it("treats an identical style as equal", () => {
    expect(stylesEqual(defaultQrStyle, { ...defaultQrStyle })).toBe(true);
  });

  it("is order-independent for object keys", () => {
    const a = { v: 1, ecc: "M", fill: { type: "solid", color: "#111111" } };
    const b = { fill: { color: "#111111", type: "solid" }, ecc: "M", v: 1 };
    expect(stylesEqual(a, b)).toBe(true);
  });

  it("detects a changed nested value", () => {
    const a = { ...defaultQrStyle, fill: { type: "solid" as const, color: "#111111" } };
    const b = { ...defaultQrStyle, fill: { type: "solid" as const, color: "#ffffff" } };
    expect(stylesEqual(a, b)).toBe(false);
  });

  it("detects a logo being added", () => {
    const withLogo = {
      ...defaultQrStyle,
      logo: {
        assetId: "data:image/png;base64,abc=",
        sizeRatio: 0.32,
        padding: 1,
        knockout: true,
        shape: "auto" as const,
      },
    };
    expect(stylesEqual(defaultQrStyle, withLogo)).toBe(false);
  });

  it("is order-independent for array entries within a nested field", () => {
    const a = {
      type: "linearGradient",
      rotation: 0,
      stops: [
        { offset: 0, color: "#111111" },
        { offset: 1, color: "#ffffff" },
      ],
    };
    // Same array, re-keyed object copies — arrays themselves stay ordered
    // (array order IS semantic for gradient stops), only object-key order
    // is normalized.
    const b = {
      rotation: 0,
      type: "linearGradient",
      stops: [
        { color: "#111111", offset: 0 },
        { color: "#ffffff", offset: 1 },
      ],
    };
    expect(stylesEqual(a, b)).toBe(true);
  });

  it("treats reordered array entries as different (array order is semantic)", () => {
    const a = { stops: [{ offset: 0 }, { offset: 1 }] };
    const b = { stops: [{ offset: 1 }, { offset: 0 }] };
    expect(stylesEqual(a, b)).toBe(false);
  });

  it("treats null and undefined-equivalent shapes correctly", () => {
    expect(stylesEqual({ logo: null }, { logo: null })).toBe(true);
  });
});
