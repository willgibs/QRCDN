// The five aurora tokens as LINEAR sRGB triples for WebGL uniforms
// (lib/webgl/qr-slab-shaders.ts lights in linear space).
//
// HAND-CONVERTED from the oklch literals in app/globals.css (`--au-1..5`,
// the aurora ramp block) — CSS custom properties can't reach a shader, so
// these are a deliberate fork of the same values, the exact posture of
// lib/brand-qr.ts's backdrop hexes ("must match --qr-bg by hand"). The
// drift guard is EXECUTABLE: aurora.test.ts holds a reference
// oklch->linear-sRGB implementation (the standard OKLab matrices) and
// fails if these constants stop matching the tokens it restates. Editing
// the globals.css aurora ramp therefore means editing three places: the
// CSS, these triples, and the test's token table.
//
// au-1 green #43dd9a · au-2 magenta #e068d8 · au-3 blue #4bc6fa ·
// au-4 amber #f3b94c · au-5 violet #b58bf9

export type LinearRgb = readonly [number, number, number];

export const AURORA_LINEAR: readonly LinearRgb[] = [
  [0.0565, 0.7194, 0.3209], // --au-1  oklch(0.8 0.16 160)
  [0.7465, 0.1375, 0.6889], // --au-2  oklch(0.7 0.2 330)
  [0.0705, 0.5656, 0.9575], // --au-3  oklch(0.78 0.13 230)
  [0.899, 0.4855, 0.0725], // --au-4  oklch(0.82 0.14 80)
  [0.4602, 0.2566, 0.9465], // --au-5  oklch(0.72 0.16 300)
] as const;

/**
 * `#RRGGBB` -> linear sRGB triple, exact piecewise EOTF (not the shader's
 * pow(2.2) approximation — JS-side uniform prep can afford exactness).
 * Throws on anything that isn't a 6-digit hex color: every caller passes a
 * literal, so a bad value is a build-time authoring bug, not user input.
 */
export function srgbHexToLinear(hex: string): LinearRgb {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`srgbHexToLinear: expected #RRGGBB, got ${hex}`);
  }
  const channel = (offset: number): number => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(1), channel(3), channel(5)];
}
