import { test as base, expect } from "@playwright/test";
import type { BrowserContext, Page, Request } from "@playwright/test";

export type { BrowserContext, Page };

// Relative imports only in e2e/ (no "@/" — see env.ts's header note).

/**
 * The outage detector (P8-U1's entire reason for existing). P7.5's
 * red-team found every Studio server action returning 500 in production for
 * days while `tsc --noEmit`, `next build`, 385 vitest tests, CI, and manual
 * `/api/v1` checks all stayed green (docs/STATUS.md's P7.5 red-team entry,
 * fix `758511f`) — the failure existed only in the BUNDLED server-action
 * registry produced by `next build`, reachable only by a real browser
 * clicking a real button.
 *
 * Next.js 16 tags every server-action POST with a `next-action` request
 * header carrying the action's id — confirmed two ways, not assumed from
 * training data (apps/web/AGENTS.md: "this is NOT the Next.js you know"):
 *   1. Source-level, in the exact installed version: `ACTION_HEADER =
 *      'next-action'` (apps/web/node_modules/next/dist/esm/client/
 *      components/app-router-headers.js), read by
 *      `getServerActionRequestMetadata` in server/app-render/
 *      action-handler.js to resolve `actionId`.
 *   2. Empirically, against a real `next start` build on this branch: signed
 *      into a real Studio session, patched `window.fetch` to capture outgoing
 *      request headers, then clicked "Create dynamic code" and "Pause" for
 *      real. Both POST /studio requests carried a literal `next-action:
 *      <hex-string-id>` header (e.g. `60b1931439847a5ea1378db7bec0b4b1b302012fc5`
 *      — length isn't fixed, so this file doesn't assert one) alongside
 *      `next-router-state-tree`. See this unit's report for the full
 *      captured request.
 * Any response to such a request with status >= 500 means a server action
 * the UI just invoked crashed in the bundled registry — exactly the P7.5
 * outage class. If a future Next version changes this header name, that's
 * exactly the kind of drift AGENTS.md warns about — re-verify empirically
 * (open a real server-action request in a running build) rather than
 * assuming this comment still holds.
 */
export const NEXT_ACTION_HEADER = "next-action";

/** Response status floor that counts as "the action crashed," not merely
 *  "the action rejected the input" (which is a normal `ActionResult<{ok:
 *  false}>` 200 response the app's own error-copy mapping already handles). */
const FAILURE_STATUS_FLOOR = 500;

export interface ServerActionFailure {
  url: string;
  status: number;
  /** The `next-action` header's value — the bundled action id that crashed,
   *  useful for correlating against server logs when this fails. */
  actionId: string;
}

/**
 * Wires the detector onto `page`, pushing every match into `failures`.
 *
 * money-path.spec.ts shares ONE page across multiple `test()` blocks inside
 * a single `test.describe.serial` (the standard Playwright pattern for a
 * serial flow that must stay signed in across steps — the built-in `page`
 * fixture is test-scoped and would silently start a fresh, logged-out
 * context for every `test()`, and a worker-scoped fixture would leak state
 * across unrelated spec files instead of resetting per file). Because that
 * page is created manually (`browser.newContext()`/`context.newPage()` in
 * `beforeAll`, closed in `afterAll`), a `test.extend()` fixture can't attach
 * itself to it automatically — fixtures resolve before the page exists.
 * This helper is the explicit attach point specs call right after creating
 * that page, so the header name/threshold still stay single-sourced in this
 * file even though the wiring itself is manual rather than fixture-injected.
 */
export function trackActionFailures(page: Page, failures: ServerActionFailure[]): void {
  page.on("response", (response) => {
    const request: Request = response.request();
    const actionId = request.headers()[NEXT_ACTION_HEADER];
    if (actionId && response.status() >= FAILURE_STATUS_FLOOR) {
      failures.push({ url: request.url(), status: response.status(), actionId });
    }
  });
}

// Every spec imports `test`/`expect` from here rather than
// `@playwright/test` directly (P8-U1 brief) — today that's a plain
// re-export, but it keeps every spec's import already pointed at the one
// place the outage-detector contract (header name, failure threshold,
// `trackActionFailures`) lives, so a future fixture-based addition here
// doesn't require touching every spec's imports.
export const test = base;
export { expect };
