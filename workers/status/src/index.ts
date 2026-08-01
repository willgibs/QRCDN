// qrcdn-status — a tiny, dependency-free Worker on its own subdomain
// (status.qrcdn.com) that runs three request-time probes against the real
// product and renders an honest, storage-free HTML page. Deliberately
// independent of both apps/web and workers/redirect: no shared code, no
// shared bindings, no shared account resources beyond the Cloudflare
// account itself (see wrangler.jsonc) — a failure in this Worker can never
// take either of them down, and a failure in either of them is exactly what
// this Worker exists to surface.
//
// P1/P2/P3 (evaluate.ts) run in parallel, each with its own timeout
// (probe.ts), so one slow target can't inflate the page's total latency
// beyond the timeout itself.

import { runProbe } from "./probe";
import { randomProbeSlug } from "./random-slug";
import {
  evaluateApexRedirect,
  evaluateApiAuthGate,
  evaluateMarketing,
  overallStatus,
  type ProbeResult,
} from "./evaluate";
import { renderStatusPage } from "./render";

const TIMEOUT_MS = 3000;
const USER_AGENT = "qrcdn-status-worker/1 (+https://status.qrcdn.com)";

async function runProbes(): Promise<ProbeResult[]> {
  // A fresh random slug per request (never a fixed fixture) — see
  // random-slug.ts's own doc comment for why.
  const slug = randomProbeSlug();
  const requestInit: RequestInit = { method: "GET", headers: { "User-Agent": USER_AGENT } };

  const [apex, marketing, apiAuthGate] = await Promise.all([
    runProbe(`https://qrcdn.com/${slug}`, requestInit, TIMEOUT_MS),
    runProbe("https://www.qrcdn.com/", requestInit, TIMEOUT_MS),
    runProbe("https://www.qrcdn.com/api/v1/codes", requestInit, TIMEOUT_MS),
  ]);

  return [
    evaluateApexRedirect(apex),
    evaluateMarketing(marketing),
    evaluateApiAuthGate(apiAuthGate),
  ];
}

const handler = {
  // No Env, no bindings — this Worker holds no KV, no secrets, no vars
  // (wrangler.jsonc). Every response is derived fresh from the three live
  // probes above; nothing is ever read from or written to storage.
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const results = await runProbes();
    const overall = overallStatus(results);
    const html = renderStatusPage(results, overall, new Date());

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // This page is a live check of the moment it was requested — never
        // cache-worthy, same reasoning the scan-redirect hot path applies
        // to itself (CLAUDE.md hard rule), even though this Worker's own
        // contract is otherwise unrelated to that one.
        "Cache-Control": "no-store",
      },
    });
  },
} satisfies ExportedHandler;

export default handler;
