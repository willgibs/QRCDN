// qrcdn-redirect — the scan hot path. "Your code never dies" is the entire
// product promise this file exists to keep.
//
// Hard rules (restated verbatim — CLAUDE.md, docs/DECISIONS.md D1-D3):
//   1. Scan redirects: 302 + Cache-Control: no-store. NEVER 301. A cached
//      301 would pin users to a stale destination forever.
//   2. No per-scan writes to qr_codes (scan_count is rollup-only, D8).
//   3. Never store raw IPs — sha256(ip + daily salt) only.
//   4. Redirects must work even when Supabase is down — KV-first, graceful
//      degradation (D2).
//
// This file is a thin shell: every decision is made by a pure function
// elsewhere (route.ts, redirect-decision.ts, ingest-decision.ts) that takes
// plain data in and plain data out. This file's only job is I/O — reading
// the KV binding, calling Supabase REST, and building the Response.

import type { KvSlugRecord } from "@qrcdn/shared";
import { withSentry } from "@sentry/cloudflare";
import { decideRoute } from "./route";
import { handleKvSync } from "./kv-sync-endpoint";
import {
  buildKvBackfillRecord,
  decideRedirect,
  resolveCodeId,
  type RestLookupResult,
} from "./redirect-decision";
import { decideIngest } from "./ingest-decision";
import { lookupSlugInSupabase, type SupabaseRestEnv } from "./supabase";
import { ingestScan } from "./ingest";
import {
  buildRedirectResponse,
  methodNotAllowedResponse,
  permanentRedirect,
  robotsResponse,
} from "./responses";

export interface Env {
  /** qrcdn-redirect KV namespace, id 498cf67ed8f845b8aeef5133698f4041
   *  (wrangler.jsonc). Cache in front of Postgres (D2) — never the other
   *  way around. */
  KV: KVNamespace;
  /** Non-secret — the Supabase project's REST base URL. */
  SUPABASE_URL: string;
  /** Secret (`wrangler secret put SUPABASE_SECRET_KEY`) — sb_secret_...,
   *  used for the read-through query and scan-ingest insert, both of which
   *  bypass RLS by design (the Worker is a trusted first-party caller). */
  SUPABASE_SECRET_KEY: string;
  /** Secret (`wrangler secret put SCAN_SALT`) — combined with the current
   *  UTC date to build the daily-rotating ip-hash salt (scan-hash.ts). */
  SCAN_SALT: string;
  /** Secret (`wrangler secret put SYNC_SECRET`) — shared with the web app
   *  (its `KV_SYNC_SECRET` env var) to authenticate the first-party
   *  write-through endpoint (kv-sync-endpoint.ts). Optional: absent =
   *  endpoint disabled (404), retargets fall back to the 5-min TTL. */
  SYNC_SECRET?: string;
  /** Non-secret (wrangler.jsonc `vars`, not `wrangler secret put`) — a
   *  Sentry DSN is a publishable write-only ingestion endpoint identifier,
   *  not a credential (same posture as NEXT_PUBLIC_SENTRY_DSN in apps/web).
   *  P8-U2, no Sentry account exists yet. Optional: absent = `withSentry`
   *  below is a complete no-op — see its call site for how that's verified,
   *  not assumed. */
  SENTRY_DSN?: string;
}

const handler = {
  // `request`/`ctx` are deliberately left without explicit type annotations
  // so they pick up the exact types `ExportedHandlerFetchHandler<Env>`
  // contextually supplies via `satisfies` below — in particular
  // `request.cf: IncomingRequestCfProperties<unknown> | undefined`.
  // Annotating `request: Request` directly would instead resolve the
  // generic default `Cf = CfProperties<CfHostMetadata>`, a wider union that
  // also includes `RequestInitCfProperties` (the outbound-fetch shape) and
  // doesn't structurally overlap with our narrow `CfGeo` read shape.
  async fetch(request, env: Env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const route = decideRoute(request.method, url.pathname, url.search);

    if (route.kind === "method-not-allowed") {
      return methodNotAllowedResponse();
    }
    if (route.kind === "robots") {
      return robotsResponse();
    }
    if (route.kind === "canonicalize") {
      return permanentRedirect(route.pathAndSearch);
    }
    if (route.kind === "kv-sync") {
      return handleKvSync(request, env.KV, env.SYNC_SECRET, route.slugUpper);
    }

    // route.kind === "slug" — the scan hot path.
    const { slugUpper } = route;
    const restEnv: SupabaseRestEnv = {
      supabaseUrl: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    };

    const kvRecord = await env.KV.get<KvSlugRecord>(slugUpper, { type: "json", cacheTtl: 60 });

    let restResult: RestLookupResult | null = null;
    if (!kvRecord) {
      // KV miss — Postgres is truth (D2). This is the ONLY place the Worker
      // calls out to Supabase on the redirect path itself; a slow or down
      // Supabase degrades to the unclaimed redirect (handled by
      // decideRedirect), it never blocks/errors the response.
      restResult = await lookupSlugInSupabase(restEnv, slugUpper);
      if (restResult.status === "found") {
        // Backfill KV so the next request for this slug is a hit. Fire-and-
        // forget via waitUntil — must not delay this response.
        //
        // expirationTtl caps staleness at 5 minutes even when the app-side
        // retarget write-through (apps/web/lib/kv-sync.ts) is unavailable or
        // unconfigured — without it, a backfilled entry would pin the old
        // destination FOREVER after a retarget that failed to sync (found
        // live in P5-U4 review). Cost: one extra Supabase read-through per
        // slug per 5 min — negligible; D2's staleness promise stays honest.
        const backfill = buildKvBackfillRecord(restResult.row);
        ctx.waitUntil(
          env.KV.put(slugUpper, JSON.stringify(backfill), { expirationTtl: 300 }),
        );
      }
    }

    const decision = decideRedirect(kvRecord, restResult);
    const response = buildRedirectResponse(decision, slugUpper);

    // Scan ingest (D3) — fire-and-forget, decided independently of the
    // redirect above (a scan against a paused code still counts as a scan).
    // MUST NOT delay `response`, which is already being returned below.
    const codeId = resolveCodeId(kvRecord, restResult);
    const ingest = decideIngest(request.method, request.headers.get("User-Agent"), codeId);
    if (ingest.shouldIngest) {
      ctx.waitUntil(
        ingestScan(restEnv, env.SCAN_SALT, {
          codeId: ingest.codeId,
          // CF-Connecting-IP is always present on real Cloudflare edge
          // traffic; the fallback only matters for local `wrangler dev`/
          // tests where it may be absent.
          ip: request.headers.get("CF-Connecting-IP") ?? "0.0.0.0",
          userAgent: request.headers.get("User-Agent"),
          referer: request.headers.get("Referer"),
          cf: request.cf,
        }),
      );
    }

    return response;
  },
} satisfies ExportedHandler<Env>;

// P8-U2 — error monitoring. `withSentry` initializes the SDK per-request
// from `env` (Workers have no module-scope access to vars/secrets, so the
// DSN can only be read here, not gated earlier) and wraps `handler.fetch`
// to auto-capture thrown/rejected errors and forward them to Sentry.
//
// Complete no-op when SENTRY_DSN is absent — verified against the installed
// @sentry/cloudflare v10.69.0 source, not assumed: returning `undefined`
// from the options callback is this SDK's own documented "skip init"
// signal, and even the literal `env.SENTRY_DSN` shorthand the SDK's own
// README recommends is safe here too — `Client`'s constructor
// (@sentry/core) only builds a transport `if (this._dsn)`, and an empty/
// missing dsn never throws or logs unless `debug: true` (never set here).
// Preserves `handler`'s `satisfies ExportedHandler<Env>` typing untouched
// (withSentry<...>(optionsCallback, handler): T returns the same type T it
// was given) and never touches the deliberately untyped `request`/`ctx`
// params inside `handler.fetch` above.
export default withSentry((env: Env) => {
  if (!env.SENTRY_DSN) {
    return undefined;
  }
  return {
    dsn: env.SENTRY_DSN,
    // No performance/tracing product is wanted yet — errors arriving
    // somewhere is the entire scope of P8-U2.
    tracesSampleRate: 0,
    // Explicit, not relied-on-as-default (D3, docs/DECISIONS.md — raw
    // IPs/destinations/scan data must never leave our infra). This also
    // activates Sentry's own default request-header/cookie redaction
    // (auth/token/secret/cookie/key-shaped names — see
    // @sentry/core's filtering-snippets.js), on top of which the explicit
    // `Sentry.captureException` call in ingest.ts's catch block (the
    // ctx.waitUntil() gap, see that file) is deliberately called with no
    // extra/context payload, so there's nothing app-specific left to leak.
    sendDefaultPii: false,
  };
}, handler);
