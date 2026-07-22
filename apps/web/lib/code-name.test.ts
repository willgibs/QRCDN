import { describe, expect, it } from "vitest";
import { suggestCodeName } from "./code-name";

describe("suggestCodeName", () => {
  it("extracts the bare hostname from a URL", () => {
    expect(suggestCodeName("https://example.com/pricing")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(suggestCodeName("https://www.example.com")).toBe("example.com");
  });

  it("preserves a non-www subdomain", () => {
    expect(suggestCodeName("https://shop.example.com/cart")).toBe("shop.example.com");
  });

  it("is case-insensitive when stripping www.", () => {
    expect(suggestCodeName("https://WWW.example.com")).toBe("example.com");
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(suggestCodeName("  https://example.com  ")).toBe("example.com");
  });

  it("ignores path, query, and hash", () => {
    expect(suggestCodeName("https://example.com/a/b?x=1#y")).toBe("example.com");
  });

  it("returns an empty string for an unparseable destination", () => {
    expect(suggestCodeName("not a url")).toBe("");
  });

  it("returns an empty string for an empty destination", () => {
    expect(suggestCodeName("")).toBe("");
  });
});
