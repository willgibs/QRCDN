import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";

// Sentry error monitoring, browser side (P8-U2). Same guard as
// instrumentation.ts: no Sentry account exists yet, so this must be a
// complete no-op until NEXT_PUBLIC_SENTRY_DSN is set (Vercel project env —
// see apps/web/.env.example — never committed). `NEXT_PUBLIC_*` vars are
// inlined at build time, so an unset DSN collapses this whole block to dead
// code the bundler strips; `Sentry.init` is never called.
//
// This file (not sentry.client.config.ts) is the Next 16 convention —
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation-client.md — it runs after the HTML loads and before
// hydration, so it's in place before any user interaction can throw.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // No performance/tracing product is wanted yet — errors arriving
    // somewhere is the entire scope of P8-U2.
    tracesSampleRate: 0,
    // Explicit, not relied-on-as-default: D3 (docs/DECISIONS.md) — raw
    // IPs/destinations/scan data must never leave our infra.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    // Session Replay is opt-in in this SDK (it's never in the default
    // integration set — confirmed by reading @sentry/nextjs's client
    // bundle, not assumed) and deliberately not added here: it would
    // record DOM/input content, which is a much larger privacy surface
    // than anything scrubEvent guards, and D3 never approved it.
  });
}
