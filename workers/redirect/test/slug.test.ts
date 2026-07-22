import { describe, expect, it } from "vitest";
import { isSlugShaped, toSlugUpper } from "../src/slug";

describe("isSlugShaped", () => {
  it("accepts 4-30 char alphanumeric segments", () => {
    expect(isSlugShaped("K7M2")).toBe(true);
    expect(isSlugShaped("k7m2x9a")).toBe(true);
    expect(isSlugShaped("A".repeat(30))).toBe(true);
    expect(isSlugShaped("Abc123Def456")).toBe(true);
  });

  it("rejects segments shorter than 4 or longer than 30 characters", () => {
    expect(isSlugShaped("abc")).toBe(false);
    expect(isSlugShaped("A".repeat(31))).toBe(false);
  });

  it("rejects segments containing dots, slashes, or other punctuation", () => {
    expect(isSlugShaped("favicon.ico")).toBe(false);
    expect(isSlugShaped("robots.txt")).toBe(false);
    expect(isSlugShaped("abc-def")).toBe(false);
    expect(isSlugShaped("abc_def")).toBe(false);
    expect(isSlugShaped("")).toBe(false);
  });
});

describe("toSlugUpper", () => {
  it("uppercases mixed-case input (Worker matches case-insensitively, D12)", () => {
    expect(toSlugUpper("k7m2x9a")).toBe("K7M2X9A");
    expect(toSlugUpper("K7m2X9a")).toBe("K7M2X9A");
  });

  it("is a no-op on already-uppercase input", () => {
    expect(toSlugUpper("K7M2X9A")).toBe("K7M2X9A");
  });
});
