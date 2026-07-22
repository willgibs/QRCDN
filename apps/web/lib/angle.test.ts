import { describe, expect, it } from "vitest";
import { degreesToRadians, radiansToDegrees } from "./angle";

describe("degreesToRadians", () => {
  it("converts cardinal angles", () => {
    expect(degreesToRadians(0)).toBeCloseTo(0);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    expect(degreesToRadians(270)).toBeCloseTo((3 * Math.PI) / 2);
  });
});

describe("radiansToDegrees", () => {
  it("converts cardinal angles back", () => {
    expect(radiansToDegrees(0)).toBeCloseTo(0);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
  });

  it("normalizes a negative rotation into [0, 360)", () => {
    expect(radiansToDegrees(-Math.PI / 2)).toBeCloseTo(270);
  });

  it("wraps a full turn back to 0", () => {
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(0);
  });
});

describe("round-trip", () => {
  it("recovers the original degree value for every slider step", () => {
    for (let degrees = 0; degrees < 360; degrees += 15) {
      expect(radiansToDegrees(degreesToRadians(degrees))).toBeCloseTo(degrees);
    }
  });
});
