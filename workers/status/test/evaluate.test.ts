import { describe, expect, it } from "vitest";
import {
  evaluateApexRedirect,
  evaluateApiAuthGate,
  evaluateMarketing,
  overallStatus,
  type ProbeAttempt,
  type ProbeResult,
} from "../src/evaluate";

function attempt(overrides: Partial<ProbeAttempt> = {}): ProbeAttempt {
  return { latencyMs: 42, ...overrides };
}

describe("evaluateApexRedirect", () => {
  it("passes on 302 + Cache-Control: no-store — the unknown-slug contract verified against workers/redirect/src", () => {
    const result = evaluateApexRedirect(
      attempt({ response: { status: 302, headers: { "cache-control": "no-store" } } }),
    );
    expect(result.status).toBe("pass");
    expect(result.id).toBe("apex-redirect");
  });

  it("is case-insensitive about the Cache-Control value", () => {
    const result = evaluateApexRedirect(
      attempt({ response: { status: 302, headers: { "cache-control": "No-Store" } } }),
    );
    expect(result.status).toBe("pass");
  });

  it("fails on a non-302 status", () => {
    const result = evaluateApexRedirect(
      attempt({ response: { status: 404, headers: { "cache-control": "no-store" } } }),
    );
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("404");
  });

  it("fails on the one status the hard rule forbids outright: a cached 301", () => {
    const result = evaluateApexRedirect(
      attempt({ response: { status: 301, headers: { "cache-control": "no-store" } } }),
    );
    expect(result.status).toBe("fail");
  });

  it("fails when Cache-Control: no-store is missing", () => {
    const result = evaluateApexRedirect(attempt({ response: { status: 302, headers: {} } }));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("Cache-Control");
  });

  it("fails on a network error with no response, surfacing the error text", () => {
    const result = evaluateApexRedirect(attempt({ error: "timeout" }));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("timeout");
  });
});

describe("evaluateMarketing", () => {
  it("passes on 200", () => {
    expect(evaluateMarketing(attempt({ response: { status: 200, headers: {} } })).status).toBe("pass");
  });

  it("fails on a non-200 status", () => {
    const result = evaluateMarketing(attempt({ response: { status: 500, headers: {} } }));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("500");
  });

  it("fails on a network error", () => {
    expect(evaluateMarketing(attempt({ error: "connection refused" })).status).toBe("fail");
  });
});

describe("evaluateApiAuthGate", () => {
  it("passes on 401 for a keyless request — the gate refusing IS the healthy state", () => {
    const result = evaluateApiAuthGate(attempt({ response: { status: 401, headers: {} } }));
    expect(result.status).toBe("pass");
  });

  it("fails on 200 — a keyless request must never be served", () => {
    const result = evaluateApiAuthGate(attempt({ response: { status: 200, headers: {} } }));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("200");
  });

  it("fails on an unrelated error status too", () => {
    expect(evaluateApiAuthGate(attempt({ response: { status: 500, headers: {} } })).status).toBe("fail");
  });
});

describe("overallStatus", () => {
  const pass: ProbeResult = { id: "x", label: "X", status: "pass", detail: "", latencyMs: 1 };
  const fail: ProbeResult = { id: "y", label: "Y", status: "fail", detail: "", latencyMs: 1 };

  it("is ok when every probe passes", () => {
    expect(overallStatus([pass, pass, pass])).toBe("ok");
  });

  it("is attention when any single probe fails", () => {
    expect(overallStatus([pass, pass, fail])).toBe("attention");
  });

  it("is attention when every probe fails", () => {
    expect(overallStatus([fail, fail, fail])).toBe("attention");
  });
});
