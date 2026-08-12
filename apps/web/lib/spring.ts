// Critically damped spring for the studio object's tilt smoothing
// (components/marketing/studio-object.tsx) — kept dependency-free of
// motion/react and the DOM because the island owns a rAF loop already, and
// stepping a two-value spring inside it is simpler than bridging
// motion/react's spring runtime into hand-driven WebGL uniforms.
// Colocated-tested (spring.test.ts).
//
// Semi-implicit Euler: velocity integrates the acceleration first, position
// integrates the NEW velocity. For a damped oscillator this is stable at
// far larger steps than explicit Euler — with the default omega and the
// loop's 33ms dt clamp, omega*dt ~ 0.25, an order of magnitude inside the
// stability bound.

export interface SpringState {
  x: number;
  v: number;
}

/**
 * Advances a critically damped spring one step toward `target`.
 * `omega` is the natural frequency in rad/s: higher = snappier. Critical
 * damping (zeta = 1, the `2 * omega` velocity term) means no oscillation in
 * the continuous system; the discrete step can overshoot by a hair on a
 * fast reversal, which is why consumers still clamp the OUTPUT
 * (tilt-math.ts's `tiltDegrees` contract, same reasoning as TiltStage).
 */
export function stepCriticalSpring(
  s: SpringState,
  target: number,
  dt: number,
  omega = 7.5,
): SpringState {
  const v = s.v + (omega * omega * (target - s.x) - 2 * omega * s.v) * dt;
  return { x: s.x + v * dt, v };
}
