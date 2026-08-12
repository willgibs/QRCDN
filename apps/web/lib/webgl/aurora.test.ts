import { describe, expect, it } from "vitest";
import { AURORA_LINEAR, srgbHexToLinear } from "./aurora";

// The executable drift guard: this table RESTATES the oklch literals from
// app/globals.css's aurora ramp. If the CSS tokens change, change this
// table too — the reference conversion below then tells you the new
// AURORA_LINEAR triples.
const CSS_TOKENS: readonly [L: number, C: number, hDeg: number][] = [
  [0.8, 0.16, 160], // --au-1
  [0.7, 0.2, 330], // --au-2
  [0.78, 0.13, 230], // --au-3
  [0.82, 0.14, 80], // --au-4
  [0.72, 0.16, 300], // --au-5
];

// Reference oklch -> linear sRGB (standard OKLab matrices, Björn Ottosson),
// clamped to [0,1] the way the shader's uniforms are.
function oklchToLinearSrgb(L: number, C: number, hDeg: number): number[] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

describe("AURORA_LINEAR", () => {
  it("matches the globals.css oklch tokens through the reference conversion", () => {
    expect(AURORA_LINEAR).toHaveLength(CSS_TOKENS.length);
    CSS_TOKENS.forEach(([L, C, H], i) => {
      const ref = oklchToLinearSrgb(L, C, H);
      AURORA_LINEAR[i].forEach((v, ch) => {
        expect(Math.abs(v - ref[ch]), `au-${i + 1} channel ${ch}`).toBeLessThan(2e-3);
      });
    });
  });
});

describe("srgbHexToLinear", () => {
  it("converts anchors exactly", () => {
    expect(srgbHexToLinear("#ffffff")).toEqual([1, 1, 1]);
    expect(srgbHexToLinear("#000000")).toEqual([0, 0, 0]);
    const mid = srgbHexToLinear("#808080");
    mid.forEach((v) => expect(v).toBeCloseTo(0.2159, 3));
  });

  it("rejects malformed input", () => {
    expect(() => srgbHexToLinear("fff")).toThrow();
    expect(() => srgbHexToLinear("#fff")).toThrow();
    expect(() => srgbHexToLinear("#gggggg")).toThrow();
    expect(() => srgbHexToLinear("oklch(0.8 0.16 160)")).toThrow();
  });
});
