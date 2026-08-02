import { describe, expect, it } from "vitest";
import { CODES_PAGE_SIZE, pageSliceFor, resolveCodesPage, totalPagesFor } from "./pagination";

describe("totalPagesFor", () => {
  it("is 1 for zero items (never zero pages)", () => {
    expect(totalPagesFor(0)).toBe(1);
  });

  it("is 1 while items fit inside a single page", () => {
    expect(totalPagesFor(1)).toBe(1);
    expect(totalPagesFor(CODES_PAGE_SIZE)).toBe(1);
  });

  it("rounds up for a partial final page", () => {
    expect(totalPagesFor(CODES_PAGE_SIZE + 1)).toBe(2);
  });

  it("matches the Pro ceiling (250 codes) exactly", () => {
    expect(totalPagesFor(250)).toBe(Math.ceil(250 / CODES_PAGE_SIZE));
  });
});

describe("resolveCodesPage", () => {
  it("defaults to 1 for missing/malformed input", () => {
    expect(resolveCodesPage(undefined, 100)).toBe(1);
    expect(resolveCodesPage("", 100)).toBe(1);
    expect(resolveCodesPage("abc", 100)).toBe(1);
    expect(resolveCodesPage("1.5", 100)).toBe(1);
    expect(resolveCodesPage("-1", 100)).toBe(1);
    expect(resolveCodesPage("0", 100)).toBe(1);
  });

  it("passes through a valid in-range page", () => {
    expect(resolveCodesPage("2", 100)).toBe(2);
  });

  it("clamps a page past the last real page down to the last page", () => {
    // 100 items / 25 per page = 4 pages.
    expect(resolveCodesPage("9999", 100)).toBe(4);
  });

  it("clamps to page 1 when there are no items at all", () => {
    expect(resolveCodesPage("3", 0)).toBe(1);
  });
});

describe("pageSliceFor", () => {
  it("slices page 1 as [0, CODES_PAGE_SIZE)", () => {
    expect(pageSliceFor(1)).toEqual({ start: 0, end: CODES_PAGE_SIZE });
  });

  it("slices page 2 immediately after page 1's window", () => {
    expect(pageSliceFor(2)).toEqual({ start: CODES_PAGE_SIZE, end: CODES_PAGE_SIZE * 2 });
  });

  it("composes with Array.prototype.slice to return the right items", () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    const { start, end } = pageSliceFor(3);
    expect(items.slice(start, end)).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
  });
});
