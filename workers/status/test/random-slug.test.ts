import { describe, expect, it } from "vitest";
import { randomProbeSlug } from "../src/random-slug";

// A local literal, not an import from workers/redirect — this package has
// zero dependency on that one by design (separate infrastructure, separate
// failure domain). Mirrors workers/redirect/src/slug.ts's own SLUG_PATTERN
// so this test can assert the generated value really is shaped like
// something the redirect Worker would route to its scan-decision branch.
const SLUG_PATTERN = /^[0-9A-Za-z]{4,30}$/;

describe("randomProbeSlug", () => {
  it("is shaped like a slug the redirect Worker would treat as a scan path", () => {
    expect(randomProbeSlug()).toMatch(SLUG_PATTERN);
  });

  it("defaults to 24 characters", () => {
    expect(randomProbeSlug()).toHaveLength(24);
  });

  it("respects a custom length within the shape's own bounds", () => {
    expect(randomProbeSlug(10)).toHaveLength(10);
    expect(randomProbeSlug(10)).toMatch(SLUG_PATTERN);
  });

  it("is different on every call — never a pinned fixture", () => {
    const values = new Set(Array.from({ length: 25 }, () => randomProbeSlug()));
    expect(values.size).toBe(25);
  });
});
