// Degrees <-> radians conversion at the Studio UI boundary (P4
// design-iteration note 3): the gradient-angle slider is authored in
// degrees (a familiar unit with a clean 0-360 readout), but
// `QrStyle.fill.rotation` (packages/shared/src/style.ts) is radians —
// conversion happens here, once, right where degrees enter/leave the style.
// Colocated-tested (angle.test.ts).

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export function degreesToRadians(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}

/** Normalizes to [0, 360) — a rotation is directionally periodic, so this
 *  keeps the slider readout stable instead of drifting into negative or
 *  >360 degree ranges as radians round-trip through cos/sin math. */
export function radiansToDegrees(radians: number): number {
  const degrees = radians * DEGREES_PER_RADIAN;
  return ((degrees % 360) + 360) % 360;
}
