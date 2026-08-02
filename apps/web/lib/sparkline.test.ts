import { describe, expect, it } from "vitest";
import { buildSparkline, parseSparklinePoints, SPARKLINE_VIEW_H, SPARKLINE_VIEW_W } from "./sparkline";

describe("buildSparkline", () => {
  it("returns empty geometry for an empty array", () => {
    expect(buildSparkline([])).toEqual({ points: "", lastPoint: null, hasActivity: false });
  });

  it("renders a flat, muted line for an all-zero window (the honest 'no scans' case)", () => {
    const geometry = buildSparkline([0, 0, 0, 0, 0, 0, 0]);
    expect(geometry.hasActivity).toBe(false);
    expect(geometry.points).not.toBe("");
    // Every y coordinate is identical (flat) — MID_Y, but this test only
    // asserts flatness, not the exact constant, to stay decoupled from the
    // module's internal geometry constants.
    const ys = geometry.points.split(" ").map((pair) => pair.split(",")[1]);
    expect(new Set(ys).size).toBe(1);
  });

  it("renders a flat but active line for a constant nonzero window", () => {
    const geometry = buildSparkline([5, 5, 5, 5]);
    expect(geometry.hasActivity).toBe(true);
    const ys = geometry.points.split(" ").map((pair) => pair.split(",")[1]);
    expect(new Set(ys).size).toBe(1);
  });

  it("normalizes to the series' OWN min/max, not a shared/absolute scale", () => {
    // A low-volume code (0-3) and a high-volume code (0-300) should produce
    // the SAME normalized shape when their relative pattern matches — proof
    // the low-volume code isn't flattened to near-invisible by an absolute
    // scale.
    const low = buildSparkline([0, 3, 1, 2]);
    const high = buildSparkline([0, 300, 100, 200]);
    expect(low.points).toBe(high.points);
  });

  it("places the first point at x=0 and the last point at the view width", () => {
    const geometry = buildSparkline([1, 5, 2, 8, 3]);
    const coords = geometry.points.split(" ").map((pair) => pair.split(",").map(Number));
    expect(coords[0]![0]).toBe(0);
    expect(coords[coords.length - 1]![0]).toBe(SPARKLINE_VIEW_W);
  });

  it("keeps every y coordinate within the view's vertical bounds", () => {
    const geometry = buildSparkline([0, 10, 3, 45, 1, 0, 20]);
    const ys = geometry.points.split(" ").map((pair) => Number(pair.split(",")[1]));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(SPARKLINE_VIEW_H);
    }
  });

  it("gives the highest value the smallest y (SVG y grows downward)", () => {
    const geometry = buildSparkline([1, 9, 1]);
    const coords = geometry.points.split(" ").map((pair) => pair.split(",").map(Number));
    const [, peakY] = coords[1]!;
    const [, troughY] = coords[0]!;
    expect(peakY).toBeLessThan(troughY);
  });

  it("returns a lastPoint matching the final coordinate", () => {
    const geometry = buildSparkline([1, 2, 3]);
    const coords = geometry.points.split(" ").map((pair) => pair.split(",").map(Number));
    const [x, y] = coords[coords.length - 1]!;
    expect(geometry.lastPoint).toEqual({ x, y });
  });

  it("handles a single-point window without dividing by zero", () => {
    const geometry = buildSparkline([7]);
    expect(geometry.points).not.toBe("");
    expect(geometry.hasActivity).toBe(true);
  });
});

describe("parseSparklinePoints", () => {
  it("passes a clean numeric array through unchanged", () => {
    expect(parseSparklinePoints([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
  });

  it("returns [] for non-array input", () => {
    expect(parseSparklinePoints(null)).toEqual([]);
    expect(parseSparklinePoints(undefined)).toEqual([]);
    expect(parseSparklinePoints("not an array")).toEqual([]);
    expect(parseSparklinePoints({ 0: 1, 1: 2 })).toEqual([]);
  });

  it("maps malformed entries to 0 rather than dropping them, preserving position", () => {
    expect(parseSparklinePoints([1, "bad", null, 4])).toEqual([1, 0, 0, 4]);
  });

  it("treats non-finite numbers as 0", () => {
    expect(parseSparklinePoints([1, Number.NaN, Number.POSITIVE_INFINITY, 2])).toEqual([1, 0, 0, 2]);
  });
});
