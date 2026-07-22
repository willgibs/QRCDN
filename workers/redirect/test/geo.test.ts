import { describe, expect, it } from "vitest";
import { extractGeo, refererHost } from "../src/geo";

describe("extractGeo", () => {
  it("maps country/region/city straight through when present", () => {
    expect(extractGeo({ country: "US", region: "CA", city: "San Francisco" })).toEqual({
      country: "US",
      region: "CA",
      city: "San Francisco",
    });
  });

  it("nulls out fields that are absent rather than leaving them undefined", () => {
    expect(extractGeo({ country: "US" })).toEqual({ country: "US", region: null, city: null });
  });

  it("nulls everything when cf is undefined (e.g. local dev without Cloudflare in front)", () => {
    expect(extractGeo(undefined)).toEqual({ country: null, region: null, city: null });
  });

  it("does not surface a colo field — scan_events has no column for it", () => {
    const geo = extractGeo({ country: "US" }) as unknown as Record<string, unknown>;
    expect(geo).not.toHaveProperty("colo");
  });
});

describe("refererHost", () => {
  it("extracts only the hostname from a full referer URL", () => {
    expect(refererHost("https://example.com/some/page?query=1")).toBe("example.com");
  });

  it("returns null for a missing referer", () => {
    expect(refererHost(null)).toBeNull();
    expect(refererHost(undefined)).toBeNull();
    expect(refererHost("")).toBeNull();
  });

  it("returns null for a referer that doesn't parse as a URL", () => {
    expect(refererHost("not a url")).toBeNull();
  });

  it("never returns the full URL, only the host", () => {
    const host = refererHost("https://example.com/secret-path?token=abc123");
    expect(host).toBe("example.com");
    expect(host).not.toContain("secret-path");
    expect(host).not.toContain("token");
  });
});
