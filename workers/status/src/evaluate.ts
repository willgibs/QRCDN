// Pure probe-evaluation logic — no fetch, no Request/Response, no timers.
// Takes the raw outcome of a probe (a response, or a network failure) and
// decides pass/fail plus a short, honest detail line. Fully unit-testable
// with plain vitest — the same "pure decision layer, thin I/O shell" split
// workers/redirect uses for its own route.ts/redirect-decision.ts.

/** What actually happened when the Worker tried to reach a probe target:
 *  either a response came back (status + the few headers each evaluator
 *  reads), or the fetch itself failed (network error, DNS failure, or the
 *  AbortController timeout in probe.ts firing before a response arrived). */
export interface ProbeAttempt {
  latencyMs: number;
  response?: {
    status: number;
    /** Lower-cased header name -> value, only the headers each probe's
     *  evaluator actually reads (Headers.get() is already case-insensitive;
     *  probe.ts stores lower-cased keys purely for a predictable shape
     *  here). */
    headers: Record<string, string>;
  };
  /** Set when fetch threw — network failure, DNS, or the timeout. Absent
   *  whenever `response` is present, and vice versa. */
  error?: string;
}

export type ProbeVerdict = "pass" | "fail";

export interface ProbeResult {
  id: string;
  label: string;
  status: ProbeVerdict;
  /** One short, honest sentence: what was checked and what came back. */
  detail: string;
  latencyMs: number;
}

function failedAttempt(
  base: { id: string; label: string; latencyMs: number },
  attempt: ProbeAttempt,
): ProbeResult {
  return {
    ...base,
    status: "fail",
    detail: `Request failed: ${attempt.error ?? "unknown error"}.`,
  };
}

/**
 * P1 — apex redirect contract.
 *
 * Verified directly against workers/redirect/src/{route,redirect-decision,
 * responses}.ts, not assumed: a slug-shaped path with no matching code is
 * NOT a 404. `decideRedirect`'s fallthrough for "KV miss, REST not-found"
 * returns `{ kind: "unclaimed" }`, and `buildRedirectResponse` turns that
 * into the exact same 302 + `Cache-Control: no-store` contract every real
 * scan gets — just pointed at the `/u/{slug}` unclaimed page instead of a
 * destination. That is what makes an unknown slug a valid, stable thing to
 * probe: the healthy state for a nonexistent code IS a 302, not a 404.
 *
 * This evaluator checks exactly the two invariants the redirect Worker's
 * own hard rule guarantees — status 302 and `Cache-Control: no-store` — and
 * deliberately NOT the `Location` value. Today that value is
 * `https://www.qrcdn.com/u/{slug}`, but pinning it here would make this
 * monitor fail on a purely presentational change to the unclaimed page's
 * URL shape, when the actual contract (a live, non-cached redirect) still
 * held. The random slug itself (random-slug.ts) is what guarantees this
 * probe is exercising the "unknown slug" branch and not accidentally
 * hitting a real code.
 */
export function evaluateApexRedirect(attempt: ProbeAttempt): ProbeResult {
  const base = { id: "apex-redirect", label: "Apex redirect contract", latencyMs: attempt.latencyMs };
  if (!attempt.response) return failedAttempt(base, attempt);

  const { status, headers } = attempt.response;
  const cacheControl = headers["cache-control"] ?? "";
  const statusOk = status === 302;
  const cacheOk = cacheControl.toLowerCase().includes("no-store");

  if (statusOk && cacheOk) {
    return {
      ...base,
      status: "pass",
      detail:
        "302 with Cache-Control: no-store for an unknown slug, exactly as the redirect contract requires for every scan, known or not.",
    };
  }

  const problems: string[] = [];
  if (!statusOk) problems.push(`expected 302, got ${status}`);
  if (!cacheOk) {
    problems.push(`expected Cache-Control: no-store, got "${cacheControl || "(missing)"}"`);
  }
  return { ...base, status: "fail", detail: `${problems.join("; ")}.` };
}

/** P2 — marketing. The site at www.qrcdn.com should simply be up. */
export function evaluateMarketing(attempt: ProbeAttempt): ProbeResult {
  const base = { id: "marketing", label: "Marketing site", latencyMs: attempt.latencyMs };
  if (!attempt.response) return failedAttempt(base, attempt);

  const { status } = attempt.response;
  if (status === 200) {
    return { ...base, status: "pass", detail: "200 from www.qrcdn.com." };
  }
  return { ...base, status: "fail", detail: `Expected 200, got ${status}.` };
}

/**
 * P3 — API auth gate. Verified against apps/web/lib/api-auth.ts's
 * `authenticateApiRequest`: a request with no (or a malformed) Authorization
 * header returns `{ status: 401, body: { error: "unauthorized", ... } }`
 * before any code-core logic ever runs. A keyless request being REFUSED is
 * therefore the healthy state — 401 is what "pass" looks like here, not a
 * failure code to tolerate.
 */
export function evaluateApiAuthGate(attempt: ProbeAttempt): ProbeResult {
  const base = { id: "api-auth-gate", label: "API auth gate", latencyMs: attempt.latencyMs };
  if (!attempt.response) return failedAttempt(base, attempt);

  const { status } = attempt.response;
  if (status === 401) {
    return {
      ...base,
      status: "pass",
      detail: "401 for a keyless request: the API correctly refused to serve it.",
    };
  }
  return {
    ...base,
    status: "fail",
    detail: `Expected 401 (a keyless request must be refused, not served), got ${status}.`,
  };
}

export type OverallStatus = "ok" | "attention";

/** Vacuously "ok" on an empty list — never exercised in production (index.ts
 *  always evaluates exactly 3 probes), documented here rather than left as
 *  an unconsidered accident of `Array.prototype.every`. */
export function overallStatus(results: readonly ProbeResult[]): OverallStatus {
  return results.every((result) => result.status === "pass") ? "ok" : "attention";
}
