import { describe, expect, it } from "vitest";
import { stepCriticalSpring, type SpringState } from "./spring";

function run(
  from: number,
  target: number,
  dtMs: number,
  steps: number,
  omega?: number,
): { state: SpringState; peak: number } {
  let s: SpringState = { x: from, v: 0 };
  let peak = from;
  for (let i = 0; i < steps; i++) {
    s = stepCriticalSpring(s, target, dtMs / 1000, omega);
    if (Math.abs(s.x - from) > Math.abs(peak - from)) peak = s.x;
  }
  return { state: s, peak };
}

describe("stepCriticalSpring", () => {
  it("converges to the target from rest", () => {
    const { state } = run(0, 1, 16, 180); // ~2.9s at 60fps
    expect(state.x).toBeCloseTo(1, 3);
    expect(state.v).toBeCloseTo(0, 3);
  });

  it("barely overshoots (critical damping, discrete step tolerance)", () => {
    // The continuous critically damped system never crosses the target;
    // semi-implicit Euler may cross by a sliver. 1% of travel is the
    // contract — anything more means the integrator or omega regressed.
    const { peak } = run(0, 1, 16, 600);
    expect(peak).toBeLessThan(1.01);
  });

  it("stays stable at the loop's 33ms dt clamp", () => {
    const { state, peak } = run(0, 1, 33, 300);
    expect(state.x).toBeCloseTo(1, 3);
    expect(peak).toBeLessThan(1.02);
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.v)).toBe(true);
  });

  it("retargets cleanly mid-flight", () => {
    let s: SpringState = { x: 0, v: 0 };
    for (let i = 0; i < 20; i++) s = stepCriticalSpring(s, 1, 0.016);
    expect(s.x).toBeGreaterThan(0.05); // moving toward 1
    for (let i = 0; i < 400; i++) s = stepCriticalSpring(s, -0.5, 0.016);
    expect(s.x).toBeCloseTo(-0.5, 3);
  });

  it("holds still when already settled at the target", () => {
    const s = stepCriticalSpring({ x: 1, v: 0 }, 1, 0.016);
    expect(s.x).toBe(1);
    expect(s.v).toBe(0);
  });
});
