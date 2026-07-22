import { describe, expect, it } from "vitest";
import { hexColorSchema, parseQrStyle, qrStyleSchema } from "./style";

// P4-U4 red-team pass: proves the schema-level defense that everything else
// (apps/web/lib/validation.ts, packages/qr-engine/src/render.ts's
// `assertHex`, the Studio's `ColorField` control) is built on top of.
// Colors are sRGB hex only — oklch and every other CSS color syntax must
// never reach `qr-engine` (CLAUDE.md hard rule, D6).

describe("hexColorSchema", () => {
  const rejected = [
    "red",
    "#GGG",
    "#12345", // 5 digits, not 6
    "#1234567", // 7 digits
    "oklch(0.5 0.1 240)",
    "#11223344", // 8-digit hex with alpha — not accepted, RGB-only
    " #ffffff", // leading whitespace
    "#ffffff ", // trailing whitespace
    "#ffffff;background:url(x)", // CSS-injection-shaped
    "rgb(255,255,255)",
    "rgba(0,0,0,0.5)",
    "hsl(0, 0%, 100%)",
    "",
    "#",
    "transparent",
    "currentColor",
    "#fff", // 3-digit shorthand not accepted — schema requires exactly 6
  ];

  for (const value of rejected) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(hexColorSchema.safeParse(value).success).toBe(false);
    });
  }

  it("accepts a well-formed 6-digit hex, case-insensitively", () => {
    expect(hexColorSchema.safeParse("#a1B2c3").success).toBe(true);
    expect(hexColorSchema.safeParse("#FFFFFF").success).toBe(true);
    expect(hexColorSchema.safeParse("#000000").success).toBe(true);
  });
});

describe("qrStyleSchema rejects hostile color values at every color field", () => {
  const hostile = "oklch(0.5 0.1 240)";

  it("fill.color (solid)", () => {
    expect(
      qrStyleSchema.safeParse({ v: 1, fill: { type: "solid", color: hostile } }).success,
    ).toBe(false);
  });

  it("fill.stops[].color (linearGradient)", () => {
    expect(
      qrStyleSchema.safeParse({
        v: 1,
        fill: {
          type: "linearGradient",
          stops: [
            { offset: 0, color: "#000000" },
            { offset: 1, color: hostile },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("eyes.color", () => {
    expect(
      qrStyleSchema.safeParse({ v: 1, eyes: { color: hostile } }).success,
    ).toBe(false);
  });

  it("background.color", () => {
    expect(
      qrStyleSchema.safeParse({ v: 1, background: { color: hostile } }).success,
    ).toBe(false);
  });

  it("parseQrStyle throws (not silently coerces) for a hostile color anywhere in the tree", () => {
    expect(() =>
      parseQrStyle({ v: 1, fill: { type: "solid", color: "#GGG" } }),
    ).toThrow();
  });
});
