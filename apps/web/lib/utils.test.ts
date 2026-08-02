import { describe, expect, it } from "vitest";
import { withQueryParam } from "./utils";

describe("withQueryParam", () => {
  it("sets the param on an empty query string", () => {
    expect(withQueryParam(new URLSearchParams(), "range", 30)).toBe("?range=30");
  });

  it("overrides an existing value for the same key", () => {
    expect(withQueryParam(new URLSearchParams("range=7"), "range", 90)).toBe("?range=90");
  });

  it("preserves other existing params untouched", () => {
    const result = withQueryParam(new URLSearchParams("range=30&page=3"), "page", 4);
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("range")).toBe("30");
    expect(params.get("page")).toBe("4");
  });

  it("accepts a string value", () => {
    expect(withQueryParam(new URLSearchParams(), "q", "hello")).toBe("?q=hello");
  });
});
