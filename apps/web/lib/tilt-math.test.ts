import { describe, expect, it } from "vitest";
import { clamp, normalizeStagePointer, tiltDegrees } from "./tilt-math";

describe("clamp", () => {
  it("passes through in-range values", () => {
    expect(clamp(0.5, -1, 1)).toBe(0.5);
    expect(clamp(-0.5, -1, 1)).toBe(-0.5);
    expect(clamp(0, -1, 1)).toBe(0);
  });

  it("clamps above the max", () => {
    expect(clamp(5, -1, 1)).toBe(1);
  });

  it("clamps below the min", () => {
    expect(clamp(-5, -1, 1)).toBe(-1);
  });
});

describe("normalizeStagePointer", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };

  it("centers a pointer at the rect's midpoint to (0, 0)", () => {
    expect(normalizeStagePointer(100, 50, rect)).toEqual({ x: 0, y: 0 });
  });

  it("maps the top-left corner to (-1, -1)", () => {
    expect(normalizeStagePointer(0, 0, rect)).toEqual({ x: -1, y: -1 });
  });

  it("maps the bottom-right corner to (1, 1)", () => {
    expect(normalizeStagePointer(200, 100, rect)).toEqual({ x: 1, y: 1 });
  });

  it("clamps pointer positions outside the rect instead of overshooting", () => {
    expect(normalizeStagePointer(400, -50, rect)).toEqual({ x: 1, y: -1 });
  });

  it("accounts for a rect offset from the viewport origin", () => {
    const offsetRect = { left: 50, top: 20, width: 200, height: 100 };
    expect(normalizeStagePointer(150, 70, offsetRect)).toEqual({ x: 0, y: 0 });
  });

  it("normalizes a degenerate zero-area rect to dead center", () => {
    expect(
      normalizeStagePointer(10, 10, { left: 0, top: 0, width: 0, height: 0 }),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("tiltDegrees", () => {
  it("scales a normalized offset by maxTilt", () => {
    expect(tiltDegrees(0.5, 12)).toBe(6);
    expect(tiltDegrees(-1, 12)).toBe(-12);
    expect(tiltDegrees(0, 12)).toBe(0);
  });

  it("clamps overshoot beyond [-1, 1] (spring overshoot defense)", () => {
    expect(tiltDegrees(1.4, 12)).toBe(12);
    expect(tiltDegrees(-2, 12)).toBe(-12);
  });
});
