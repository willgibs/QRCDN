// Pure pointer/tilt math for TiltStage (components/brand/tilt-stage.tsx) —
// kept dependency-free of motion/react and the DOM so the clamp/normalize
// math is unit-testable without a browser or an animation runtime.
// Colocated-tested (tilt-math.test.ts).

/** Clamps `value` into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The subset of `DOMRect` this module actually needs — typed narrowly so
 *  tests can pass a plain object instead of a real `getBoundingClientRect()`
 *  result. */
export interface StageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Normalizes a pointer position to [-1, 1] on each axis, relative to
 * `rect`'s own center — (-1, -1) is the top-left corner, (1, 1) the
 * bottom-right, (0, 0) dead center. A pointer outside the rect (the pointer
 * can legitimately end up there between a fast move and the next frame)
 * clamps to the nearest edge rather than overshooting past ±1. A
 * degenerate (zero-area) rect normalizes to dead center rather than
 * dividing by zero.
 */
export function normalizeStagePointer(
  clientX: number,
  clientY: number,
  rect: StageRect,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = (clientX - centerX) / (rect.width / 2);
  const y = (clientY - centerY) / (rect.height / 2);
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
}

/**
 * Normalized offset (-1..1 — one axis of `normalizeStagePointer`'s output,
 * or a spring-smoothed value tracking it) to a tilt angle in degrees,
 * clamped to ±`maxTilt`. The clamp matters even though the *input* to the
 * spring is already clamped to [-1, 1]: a spring can briefly overshoot its
 * target on a fast reversal (TiltStage's stiffness/damping pair is
 * underdamped), and the rendered tilt must never exceed the prop contract's
 * `maxTilt` regardless.
 */
export function tiltDegrees(normalized: number, maxTilt: number): number {
  return clamp(normalized, -1, 1) * maxTilt;
}
