import { describe, expect, it } from "vitest";
import { decideRoute } from "../src/route";

describe("decideRoute", () => {
  it("routes a GET on a slug-shaped single path segment to the slug case, uppercased", () => {
    expect(decideRoute("GET", "/k7m2x9a", "")).toEqual({ kind: "slug", slugUpper: "K7M2X9A" });
  });

  it("routes a HEAD on a slug-shaped path to the slug case too", () => {
    expect(decideRoute("HEAD", "/K7M2X9A", "")).toEqual({ kind: "slug", slugUpper: "K7M2X9A" });
  });

  it("routes / to canonicalize", () => {
    expect(decideRoute("GET", "/", "")).toEqual({ kind: "canonicalize", pathAndSearch: "/" });
  });

  it("routes favicon.ico to canonicalize (not slug-shaped: contains a dot)", () => {
    expect(decideRoute("GET", "/favicon.ico", "")).toEqual({
      kind: "canonicalize",
      pathAndSearch: "/favicon.ico",
    });
  });

  it("routes a deeper path to canonicalize, preserving path and query", () => {
    expect(decideRoute("GET", "/a/b", "?x=1")).toEqual({
      kind: "canonicalize",
      pathAndSearch: "/a/b?x=1",
    });
  });

  it("serves robots.txt directly rather than canonicalizing it", () => {
    expect(decideRoute("GET", "/robots.txt", "")).toEqual({ kind: "robots" });
  });

  it("returns method-not-allowed for POST, even to a slug-shaped path", () => {
    expect(decideRoute("POST", "/K7M2X9A", "")).toEqual({ kind: "method-not-allowed" });
  });

  it("returns method-not-allowed for POST to robots.txt (checked before the robots case)", () => {
    expect(decideRoute("POST", "/robots.txt", "")).toEqual({ kind: "method-not-allowed" });
  });

  it("returns method-not-allowed for DELETE/PUT", () => {
    expect(decideRoute("DELETE", "/K7M2X9A", "")).toEqual({ kind: "method-not-allowed" });
    expect(decideRoute("PUT", "/K7M2X9A", "")).toEqual({ kind: "method-not-allowed" });
  });

  it("never returns the slug case for a path with an extra trailing slash making two segments worth of nothing", () => {
    // "/K7M2X9A/" — split+filter collapses the trailing empty segment, so
    // this is still exactly one segment and should still be a slug match.
    expect(decideRoute("GET", "/K7M2X9A/", "")).toEqual({ kind: "slug", slugUpper: "K7M2X9A" });
  });
});
