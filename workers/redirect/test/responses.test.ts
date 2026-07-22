import { describe, expect, it } from "vitest";
import {
  buildRedirectResponse,
  methodNotAllowedResponse,
  permanentRedirect,
  robotsResponse,
} from "../src/responses";
import { decideRedirect, type RestLookupResult } from "../src/redirect-decision";
import type { KvSlugRecord } from "@qrcdn/shared";

// The single most load-bearing invariant in this Worker (CLAUDE.md hard
// rule, docs/DECISIONS.md D2): scan redirects are 302 + no-store, never 301.
// A cached 301 would pin users to a stale destination forever.
describe("scan redirects are 302 no-store, never 301", () => {
  it("the destination decision responds 302 with Cache-Control: no-store", () => {
    const response = buildRedirectResponse(
      { kind: "destination", destination: "https://example.com/landing" },
      "K7M2X9A",
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBe("https://example.com/landing");
  });

  it("the unclaimed decision also responds 302 with Cache-Control: no-store", () => {
    const response = buildRedirectResponse({ kind: "unclaimed" }, "K7M2X9A");
    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/u/K7M2X9A");
  });

  it("the active/destination redirect also sets Referrer-Policy: no-referrer-when-downgrade", () => {
    const response = buildRedirectResponse(
      { kind: "destination", destination: "https://example.com" },
      "K7M2X9A",
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer-when-downgrade");
  });
});

// Exhaustively drive every REST/KV combination through decideRedirect →
// buildRedirectResponse and assert none of them ever produces a 301 for a
// valid slug — only the host-canonicalization path (permanentRedirect,
// exercised separately below) is allowed to.
describe("no code path returns 301 for a valid slug", () => {
  const SLUG = "K7M2X9A";
  const ACTIVE_ROW = { id: "code-1", destination_url: "https://example.com", status: "active" };
  const PAUSED_ROW = { ...ACTIVE_ROW, status: "paused" };
  const ARCHIVED_ROW = { ...ACTIVE_ROW, status: "archived" };

  const cases: Array<{ name: string; kv: KvSlugRecord | null; rest: RestLookupResult | null }> = [
    { name: "KV hit, active", kv: { destination: "https://example.com", paused: false }, rest: null },
    { name: "KV hit, paused", kv: { destination: "https://example.com", paused: true }, rest: null },
    { name: "KV miss, REST found active", kv: null, rest: { status: "found", row: ACTIVE_ROW } },
    { name: "KV miss, REST found paused", kv: null, rest: { status: "found", row: PAUSED_ROW } },
    { name: "KV miss, REST found archived", kv: null, rest: { status: "found", row: ARCHIVED_ROW } },
    { name: "KV miss, REST not-found", kv: null, rest: { status: "not-found" } },
    { name: "KV miss, REST unreachable", kv: null, rest: { status: "unreachable" } },
  ];

  it.each(cases)("$name → never 301", ({ kv, rest }) => {
    const decision = decideRedirect(kv, rest);
    const response = buildRedirectResponse(decision, SLUG);
    expect(response.status).not.toBe(301);
    expect(response.status).toBe(302);
  });
});

describe("permanentRedirect (host canonicalization — NOT a scan)", () => {
  it("is a 301 to the www host, preserving path and query", () => {
    const response = permanentRedirect("/some/path?x=1");
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://www.qrcdn.com/some/path?x=1");
  });
});

describe("robotsResponse", () => {
  it("serves a 200 disallow-all body so scan URLs are never indexed", async () => {
    const response = robotsResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toBe("User-agent: *\nDisallow: /\n");
  });
});

describe("methodNotAllowedResponse", () => {
  it("is a 405 with an Allow header listing GET and HEAD", () => {
    const response = methodNotAllowedResponse();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });
});
