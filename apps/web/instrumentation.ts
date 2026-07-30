import type { Instrumentation } from "next";

// Sentry error monitoring, server + edge side (P8-U2). No Sentry account
// exists yet (the board provisions one later) — every branch below
// early-returns when NEXT_PUBLIC_SENTRY_DSN is unset, so this file is a
// complete no-op until then: @sentry/nextjs is never even imported, so
// there's no network call, no console output, no behavior change. Same
// "unconfigured -> typed no-op" idiom as apps/web/lib/kv-sync.ts.
//
// File shape follows the Next 16 instrumentation.ts convention verbatim
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation.md): `register()` runs once per server instance for
// *both* the Node and Edge runtimes, branching on `NEXT_RUNTIME`; the
// dynamic `import()`s inside each branch are the docs' own recommended
// pattern for colocating side effects instead of importing at module scope.
// `onRequestError` is the documented hook for reporting errors the
// framework itself catches (Server Components, Route Handlers, Server
// Actions — including the exact "use server" 500 class that motivated this
// unit, see docs/STATUS.md P7.5 red-team entry).

async function initSentry(): Promise<void> {
  const [Sentry, { scrubEvent }] = await Promise.all([
    import("@sentry/nextjs"),
    import("./lib/sentry-scrub"),
  ]);
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // No performance/tracing product is wanted yet — errors arriving
    // somewhere is the entire scope of P8-U2.
    tracesSampleRate: 0,
    // Explicit, not relied-on-as-default: D3 (docs/DECISIONS.md) — raw
    // IPs/destinations/scan data must never leave our infra, and PII
    // collection defaults are exactly the kind of thing that changes
    // across SDK versions.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

export async function register(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  // Both runtimes get identical config today; the NEXT_RUNTIME branch is
  // kept explicit (rather than a single combined condition) because it's
  // the documented seam for runtime-specific divergence later, and it's
  // what the Next docs example itself shows.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await initSentry();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await initSentry();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
