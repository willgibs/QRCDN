import { describe, expect, it } from "vitest";
import {
  maxRangeDaysFor,
  rangeWindowUtc,
  resolveRangeDays,
  sumBuckets,
  toChartSeries,
} from "./analytics";

describe("maxRangeDaysFor", () => {
  it("reuses entitlements.ts's retention constant per plan", () => {
    expect(maxRangeDaysFor("free")).toBe(30);
    expect(maxRangeDaysFor("pro")).toBe(365);
  });
});

describe("resolveRangeDays — clamping", () => {
  it("clamps a free-plan request for 365 down to its 30-day ceiling", () => {
    expect(resolveRangeDays("365", "free")).toBe(30);
  });

  it("allows a pro-plan request for 365 (equals its ceiling)", () => {
    expect(resolveRangeDays("365", "pro")).toBe(365);
  });

  it("passes through an in-range preset unchanged (free, 7)", () => {
    expect(resolveRangeDays("7", "free")).toBe(7);
  });

  it("passes through an in-range preset unchanged (pro, 90)", () => {
    expect(resolveRangeDays("90", "pro")).toBe(90);
  });

  it("boundary: a free request exactly at its ceiling (30) is not clamped further", () => {
    expect(resolveRangeDays("30", "free")).toBe(30);
  });
});

describe("resolveRangeDays — malformed/missing/disallowed input", () => {
  it("undefined param defaults to 30", () => {
    expect(resolveRangeDays(undefined, "pro")).toBe(30);
  });

  it("empty string defaults to 30", () => {
    expect(resolveRangeDays("", "pro")).toBe(30);
  });

  it("non-numeric garbage defaults to 30", () => {
    expect(resolveRangeDays("abc", "pro")).toBe(30);
  });

  it("a decimal string defaults to 30", () => {
    expect(resolveRangeDays("90.5", "pro")).toBe(30);
  });

  it("a disallowed-but-numeric day count defaults to 30 (not the nearest preset)", () => {
    expect(resolveRangeDays("45", "pro")).toBe(30);
  });

  it("the default itself is clamped to the plan ceiling (free, missing param)", () => {
    expect(resolveRangeDays(undefined, "free")).toBe(30);
  });
});

describe("rangeWindowUtc", () => {
  const now = new Date("2026-07-22T15:30:00Z");

  it("end is today's UTC midnight, exclusive", () => {
    expect(rangeWindowUtc(7, now).endIso).toBe("2026-07-22");
  });

  it("start is end minus the day count", () => {
    expect(rangeWindowUtc(7, now).startIso).toBe("2026-07-15");
  });

  it("computes a 30-day window correctly", () => {
    expect(rangeWindowUtc(30, now)).toEqual({ startIso: "2026-06-22", endIso: "2026-07-22" });
  });
});

describe("toChartSeries", () => {
  const now = new Date("2026-07-22T15:30:00Z");

  it("zero-fills gap days, preserves ascending order, and returns exactly `days` points", () => {
    const rows = [
      { day: "2026-07-16", scans: 5, uniques: 3 },
      { day: "2026-07-20", scans: 2, uniques: 2 },
    ];

    const series = toChartSeries(rows, 7, now);

    expect(series).toHaveLength(7);
    expect(series.map((p) => p.day)).toEqual([
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
    ]);
    expect(series[1]).toEqual({ day: "2026-07-16", scans: 5, uniques: 3 });
    expect(series[5]).toEqual({ day: "2026-07-20", scans: 2, uniques: 2 });
    // gap days zero-fill
    expect(series[0]).toEqual({ day: "2026-07-15", scans: 0, uniques: 0 });
    expect(series[2]).toEqual({ day: "2026-07-17", scans: 0, uniques: 0 });
  });

  it("returns an all-zero series when no rows match the window", () => {
    const series = toChartSeries([], 7, now);
    expect(series).toHaveLength(7);
    expect(series.every((p) => p.scans === 0 && p.uniques === 0)).toBe(true);
  });
});

describe("sumBuckets", () => {
  it("sums matching keys across multiple day buckets and sorts descending", () => {
    const buckets = [
      { US: 10, CA: 3 },
      { US: 5, GB: 2 },
    ];
    expect(sumBuckets(buckets)).toEqual([
      { key: "US", count: 15 },
      { key: "CA", count: 3 },
      { key: "GB", count: 2 },
    ]);
  });

  it("folds keys beyond top-N plus any pre-existing 'other' key into one final Other entry", () => {
    const buckets = [{ US: 10, CA: 8, GB: 6, DE: 4, FR: 2, JP: 1, other: 3 }];
    // top 3 -> US/CA/GB kept; DE+FR+JP (tail) + other (pre-existing) fold together.
    expect(sumBuckets(buckets, 3)).toEqual([
      { key: "US", count: 10 },
      { key: "CA", count: 8 },
      { key: "GB", count: 6 },
      { key: "Other", count: 4 + 2 + 1 + 3 },
    ]);
  });

  it("respects a custom top-N and skips malformed entries", () => {
    const buckets: unknown[] = [{ a: 1, b: 5, c: 3 }, null, "not an object", { d: "not a number" }];
    expect(sumBuckets(buckets as Parameters<typeof sumBuckets>[0], 2)).toEqual([
      { key: "b", count: 5 },
      { key: "c", count: 3 },
      { key: "Other", count: 1 },
    ]);
  });

  it("returns an empty array for empty input, with no Other entry when nothing overflows", () => {
    expect(sumBuckets([])).toEqual([]);
    expect(sumBuckets([{ a: 1, b: 2 }], 5)).toEqual([
      { key: "b", count: 2 },
      { key: "a", count: 1 },
    ]);
  });
});
