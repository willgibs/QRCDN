import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect, trackActionFailures } from "./fixtures";
import type { BrowserContext, Page, ServerActionFailure } from "./fixtures";
import { mintSignInToken } from "./auth-token";
import { E2E_BASE_URL } from "./env";
import { manifestPath, type E2eFixtureManifest } from "./manifest";
import { createAdminClient } from "../lib/supabase/admin";

// Relative imports only in e2e/ (no "@/" — see env.ts's header note).

/**
 * The money path (P8-U1). Walks the Studio like a real Pro user in one
 * continuous, authenticated browser session — sign in, mint a dynamic code,
 * confirm the live redirect Worker actually serves it, retarget/pause/
 * resume it, lock it down with an expiry + password, bulk-create a batch,
 * check the dashboards, mint and revoke an API key — then asserts that NOT
 * ONE of those UI actions produced a >=500 response to a `next-action`
 * request (fixtures.ts's outage detector). That final assertion is the
 * whole point of this file: it's the one check that would have caught the
 * P7.5 outage (docs/STATUS.md) before it reached production.
 *
 * `test.describe.serial`: every step after sign-in depends on state a prior
 * step produced (the code's slug, its name, the minted API key), so the
 * group runs in order and stops after the first failure rather than
 * cascading into a wall of confusing downstream failures. One page is
 * created manually in `beforeAll` and shared across every `test()` below —
 * see fixtures.ts's `trackActionFailures` doc comment for why (the built-in
 * `page` fixture is test-scoped and would silently log the flow out between
 * steps).
 *
 * Trace/screenshot capture (playwright.config.ts's `use: {trace:
 * "retain-on-failure", screenshot: "only-on-failure"}`) still applies to
 * this manually-created context: confirmed empirically, not assumed — an
 * explicit `context.tracing.start()` call here throws "Tracing has been
 * already started", because Playwright's own harness already auto-starts
 * tracing on every context/page created from the `browser` fixture, not
 * only ones it creates itself via the `context`/`page` fixtures. A deliberate
 * failure during development confirmed a `trace.zip` was attached to the
 * failing test automatically, with no tracing code of this file's own
 * involved at all — see this unit's report for the exact repro.
 */

const RUN_ID = randomUUID().slice(0, 8);

const CODE_NAME = `E2E money path ${RUN_ID}`;
const ORIGINAL_DESTINATION = "https://example.com/e2e-original";
const RETARGETED_DESTINATION = "https://example.com/e2e-retargeted";
const DETAIL_PAGE_DESTINATION = "https://example.com/e2e-detail-page-retarget";

const BULK_NAME_1 = `E2E bulk one ${RUN_ID}`;
const BULK_NAME_2 = `E2E bulk two ${RUN_ID}`;
const BULK_DESTINATION_1 = "https://example.com/e2e-bulk-1";
const BULK_DESTINATION_2 = "https://example.com/e2e-bulk-2";

const ACCESS_PASSWORD = "e2e-access-pw-2026";

const API_KEY_NAME = `E2E key ${RUN_ID}`;

// example.com (RFC 2606-reserved for documentation/testing) is never a real
// destination, so nothing here can be mistaken for a live customer target.

/** A slug this app could actually mint: uppercase letters/digits, no
 *  0/1/I/L/O/U (lib/slug.ts's SLUG_CHARSET) — used only to pull the slug out
 *  of the confirmation card's rendered text, not to validate the app's own
 *  charset enforcement (that's already covered by lib/slug.test.ts). */
const MINTED_SHORT_URL_RE = /^HTTPS:\/\/QRCDN\.COM\/[A-Z0-9]{7}$/;
const REVEALED_API_KEY_RE = /^qrcdn_live_[0-9A-Za-z]{38}$/;

function futureLocalDateTimeValue(yearsFromNow: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsFromNow);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const FUTURE_EXPIRY = futureLocalDateTimeValue(1);

/**
 * Opens the codes-list row's "Actions for {name}" dropdown.
 *
 * This used to need a defensive `Escape` first, because closing the Access
 * dialog left the dropdown it was opened from still open. That was a real
 * product bug — this suite found it — and it is now FIXED at the source
 * (codes-list.tsx closes the menu explicitly via controlled state). The
 * workaround is deliberately gone so this suite keeps proving the fix: if
 * the bug ever returns, these tests hang again rather than quietly papering
 * over it. Original diagnosis, kept because it explains the failure mode:
 * the Access dialog's own save-and-close assertion passes, well before the
 * next step even starts: the "Actions for…" menu is visibly open in that
 * screenshot despite nothing in this spec clicking it again. Root cause
 * appears to be Radix's dialog-close focus-return landing back on the
 * dropdown trigger and re-triggering it — cosmetic in a human session (an
 * extra click closes it) but fatal to automation: clicking an
 * already-showing trigger while its own popover/backdrop occupies the same
 * screen coordinates leaves Playwright's actionability check waiting for an
 * element to "receive pointer events" that never will while the popover's
 * click-outside layer sits on top, hanging for the full action timeout with
 * no error — until the test timeout force-closes the page. Escape is a safe
 * no-op when nothing is already open, so this guard costs nothing on the
 * steps that don't hit the dialog-reopen quirk.
 */
async function openCodeActionsMenu(page: Page, codeName: string): Promise<void> {
  await page.getByRole("button", { name: `Actions for ${codeName}` }).click();
}

test.describe.serial("money path", () => {
  let context: BrowserContext;
  let page: Page;
  const actionFailures: ServerActionFailure[] = [];
  let manifest: E2eFixtureManifest;
  let mintedShortUrl = "";
  let slug = "";

  test.beforeAll(async ({ browser }) => {
    manifest = JSON.parse(await readFile(manifestPath(), "utf8")) as E2eFixtureManifest;

    context = await browser.newContext({ baseURL: E2E_BASE_URL });
    page = await context.newPage();
    trackActionFailures(page, actionFailures);
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test("signs in via the magic-link confirm interstitial and lands on /studio authenticated", async () => {
    // Minted HERE, at test time, on every attempt — not read from a token
    // global-setup pre-minted once (P9-U6; see e2e/auth-token.ts's header
    // for the retry-cascade this fixes: a serial-group retry re-runs this
    // exact test, and a single pre-minted token would already be consumed).
    //
    // type=email (not the deprecated magiclink) — the exact shape the live
    // dashboard template now produces (P9.5-T0):
    // `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
    const hashedToken = await mintSignInToken(manifest.email);
    // waitUntil: "commit" (not the default "load") — hands control back to
    // this test as soon as the navigation commits, rather than after the
    // full page (JS included) has loaded. Empirically necessary, not just
    // defensive: against a local `next start` talking to real production
    // Supabase, the default "load" wait let hydration + the auto-submit
    // effect + the confirmSignInAction round trip + the redirect to /studio
    // all complete BEFORE this test regained control at all — the very next
    // line's assertion then found a fully-loaded, already-authenticated
    // /studio page instead of the interstitial, failing with "element(s)
    // not found" (the button had already been replaced by an entirely
    // different page). "commit" wins that race reliably: the button is
    // present in the server-rendered initial HTML regardless (React hasn't
    // hydrated yet at commit time), so `toBeVisible()`'s own auto-retry
    // catches it well before the auto-submit round trip can finish.
    await page.goto(
      `${E2E_BASE_URL}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=email&next=/studio`,
      { waitUntil: "commit" },
    );
    // /auth/confirm is now a Server Component interstitial (app/auth/confirm/
    // page.tsx), not a redirecting route handler — this asserts it actually
    // rendered (the no-JS-fallback button, app/auth/confirm/auto-submit.tsx)
    // before the client-side auto-submit (same component) carries it the
    // rest of the way to /studio.
    await expect(page.getByRole("button", { name: "Confirm sign-in" })).toBeVisible();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByLabel("Destination")).toBeVisible();
  });

  test("mints a dynamic code with a unique name", async () => {
    await page.getByLabel("Destination").fill(ORIGINAL_DESTINATION);
    await page.getByRole("button", { name: "Create dynamic code" }).click();
    await page.getByLabel("New dynamic code name").fill(CODE_NAME);
    await page.getByRole("button", { name: "Create dynamic code" }).click();

    // role="status" + aria-label added to create-code.tsx's confirmation
    // card (P8-U1) — the raw text alone collides with PreviewStage's own
    // "Live preview" region, which renders the same short URL once it
    // becomes the working payload (studio-shell.tsx's handleCodeCreated).
    const shortUrlLocator = page.getByRole("status", { name: "New short URL" });
    await expect(shortUrlLocator).toHaveText(MINTED_SHORT_URL_RE);
    mintedShortUrl = ((await shortUrlLocator.textContent()) ?? "").trim();
    slug = mintedShortUrl.slice(mintedShortUrl.lastIndexOf("/") + 1);
    expect(slug).toHaveLength(7);
  });

  test("the new code appears in the studio codes list", async () => {
    await expect(page.getByRole("button", { name: `Actions for ${CODE_NAME}` })).toBeVisible();
  });

  test("the live redirect Worker serves the new slug correctly on first hit", async () => {
    // D2: KV is a cache, Postgres is truth — a brand-new slug read-throughs
    // to Supabase on its first hit, so this is correct without any warm-up
    // delay. Exact contract asserted against workers/redirect/src/
    // responses.ts's scanRedirectToDestination: 302, Cache-Control:
    // no-store (never 301 — the hard rule), the exact destination Location,
    // and the Referrer-Policy that branch specifically sets.
    const response = await fetch(`https://qrcdn.com/${slug}`, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(ORIGINAL_DESTINATION);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer-when-downgrade");
  });

  test("retargets the code", async () => {
    await openCodeActionsMenu(page, CODE_NAME);
    await page.getByRole("menuitem", { name: "Retarget…" }).click();
    const destinationInput = page.getByLabel(`New destination for ${CODE_NAME}`);
    await destinationInput.fill(RETARGETED_DESTINATION);
    await page.getByRole("button", { name: "Confirm retarget" }).click();
    await expect(destinationInput).toBeHidden();
  });

  test("pauses the code", async () => {
    await openCodeActionsMenu(page, CODE_NAME);
    await page.getByRole("menuitem", { name: "Pause" }).click();
    await expect(page.getByText("Paused")).toBeVisible();
  });

  test("resumes the code", async () => {
    await openCodeActionsMenu(page, CODE_NAME);
    await page.getByRole("menuitem", { name: "Resume" }).click();
    await expect(page.getByText("Paused")).toBeHidden();
  });

  test("sets an expiry and a password via the Access dialog", async () => {
    await openCodeActionsMenu(page, CODE_NAME);
    await page.getByRole("menuitem", { name: "Access…" }).click();
    await expect(page.getByRole("heading", { name: "Access controls" })).toBeVisible();

    await page.getByLabel("Expires").fill(FUTURE_EXPIRY);
    await page.getByLabel("Password").fill(ACCESS_PASSWORD);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Access controls" })).toBeHidden();
  });

  test("reopening the Access dialog reflects the saved expiry and password state", async () => {
    await openCodeActionsMenu(page, CODE_NAME);
    await page.getByRole("menuitem", { name: "Access…" }).click();
    await expect(page.getByRole("heading", { name: "Access controls" })).toBeVisible();

    // DialogDescription renders `${"Protected"|"Not protected"} · ${expires
    // .../no expiry}` — capital-P "Protected" only appears on the true
    // branch ("Not protected" always has a lowercase p), so this is
    // unambiguous proof the password round-tripped; the repopulated Expires
    // input is the same proof for the expiry.
    await expect(page.getByText(/^Protected · expires/)).toBeVisible();
    await expect(page.getByLabel("Expires")).toHaveValue(FUTURE_EXPIRY);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Access controls" })).toBeHidden();
  });

  test("bulk creates 2 valid codes and 1 invalid line, and reports partial success", async () => {
    await page.getByRole("button", { name: "Bulk create" }).click();
    await expect(page.getByRole("heading", { name: "Bulk create" })).toBeVisible();

    const draft = [
      `${BULK_NAME_1} | ${BULK_DESTINATION_1}`,
      `${BULK_NAME_2} | ${BULK_DESTINATION_2}`,
      // No scheme -> fails destinationUrlSchema (lib/validation.ts) -> a
      // per-item failure that must NOT abort the other two lines.
      "not-a-valid-destination",
    ].join("\n");
    await page.getByLabel("Bulk destinations").fill(draft);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("2 created")).toBeVisible();
    await expect(page.getByText("1 failed")).toBeVisible();
    await expect(page.getByText(BULK_NAME_1, { exact: true })).toBeVisible();
    await expect(page.getByText(BULK_NAME_2, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { name: "Bulk create" })).toBeHidden();
  });

  test("the /codes dashboard renders the codes this run created", async () => {
    await page.goto(`${E2E_BASE_URL}/codes`);
    await expect(page.getByRole("heading", { name: "Codes" })).toBeVisible();

    // P9.6-U2 follow-up: the table redesign that first shipped here rendered
    // every code TWICE (a real <table> at md+, a parallel card list below
    // md), which meant a viewport-agnostic locator like this one had to be
    // scoped to whichever variant was actually visible. That two-variant
    // shape was itself the root cause of a real /codes byte-size defect
    // (measured, fixed the same follow-up: see codes-table.tsx's own doc
    // comment) — CodesTable now renders each code's row exactly ONCE,
    // reflowing via CSS (grid at md+, a stacked card below it) rather than
    // duplicating markup, so a plain unscoped locator is correct again.
    await expect(page.getByText(CODE_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText(BULK_NAME_1, { exact: true })).toBeVisible();
    await expect(page.getByText(BULK_NAME_2, { exact: true })).toBeVisible();
  });

  test("/codes shows the Create button, and the row pause toggle flips the status text and back", async () => {
    // P9.5-T7. Header button: an honest plain link to /studio (the real
    // create entry point — there is no separate create route).
    await expect(page.getByRole("link", { name: "Create code" })).toHaveAttribute("href", "/studio");

    // Scope to CODE_NAME's own row so this can't accidentally match one of
    // the two bulk-created rows also on this page. CodesTable's rows are
    // `role="row"` (explicit ARIA, not a native <tr> — see that file's own
    // doc comment), which `getByRole("row")` matches identically either way.
    const row = page.getByRole("row").filter({ hasText: CODE_NAME });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Pause" }).click();
    await expect(row.getByText("Paused", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Resume" }).click();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
  });

  // P9.6-U3: /codes/[slug] rebuilt from an analytics-only page into the
  // code's real home — the artifact itself, plus all four actions. Each
  // sub-test below exercises exactly one action from THIS page (not the
  // Studio rail, which the earlier tests above already cover), reusing the
  // same fixture code/slug the rest of this file already minted.
  test("code detail page: shows the artifact and its identity", async () => {
    await page.goto(`${E2E_BASE_URL}/codes/${slug}`);
    await expect(page.getByRole("heading", { name: CODE_NAME })).toBeVisible();
    await expect(page.getByRole("link", { name: "← Codes" })).toHaveAttribute("href", "/codes");

    // Rendered server-side from the code's frozen style snapshot
    // (app/(app)/codes/[slug]/page.tsx, via lib/preview.ts's renderPreview) —
    // this is the assertion that would fail if the style/QR fetch 500'd.
    await expect(page.getByRole("img", { name: `QR code for ${CODE_NAME}` })).toBeVisible();

    // Short link + copy affordance (U2's shortUrl helper + CopyButton).
    // lib/short-url.ts's shortUrl() only lowercases the HOST constant, not
    // the slug itself (slugs are minted uppercase, lib/slug.ts's
    // SLUG_CHARSET) — "qrcdn.com/<SLUG-AS-MINTED>" is the exact rendered
    // text, not a fully-lowercased mintedShortUrl.
    await expect(page.getByText(`qrcdn.com/${slug}`)).toBeVisible();
    await expect(page.getByRole("button", { name: `Copy short link for ${CODE_NAME}` })).toBeVisible();

    // The destination, shown as an outbound link distinct from the short
    // link — still RETARGETED_DESTINATION at this point in the run (the
    // studio-driven retarget test above already changed it once).
    await expect(page.getByRole("link", { name: RETARGETED_DESTINATION })).toBeVisible();
  });

  test("code detail page: retargets the code and the new destination renders", async () => {
    await page.getByRole("button", { name: "Retarget…" }).click();
    const destinationInput = page.getByLabel(`New destination for ${CODE_NAME}`);
    await destinationInput.fill(DETAIL_PAGE_DESTINATION);
    await page.getByRole("button", { name: "Confirm retarget" }).click();

    // A real assertion, not a proxy for one: this reloads the page
    // (code-actions-panel.tsx's documented, pause-toggle-button.tsx-proven
    // mechanism), so seeing the NEW destination render is proof the
    // retarget actually persisted server-side, not just that a client
    // state update happened.
    await expect(page.getByRole("link", { name: DETAIL_PAGE_DESTINATION })).toBeVisible();
  });

  test("code detail page: pause/resume flips the status pill and back", async () => {
    await expect(page.getByText("Active", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Resume" }).click();
    // exact:true, unlike the Studio-rail equivalent of this assertion
    // (this file's "resumes the code" test above, which has no adjacent
    // "Download" button to collide with): a non-exact getByText("Paused")
    // is a case-insensitive SUBSTRING match, and this page's action row
    // puts "Pause" immediately before a "Download" button — their
    // concatenated accessible text, "PauseDownload", itself contains
    // "paused" as a substring once lowercased. Found by running this
    // suite locally, not assumed: the non-exact version failed here with
    // exactly that false match.
    await expect(page.getByText("Paused", { exact: true })).toBeHidden();
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
  });

  test("code detail page: Access controls opens and reflects the saved expiry and password", async () => {
    await page.getByRole("button", { name: "Access…" }).click();
    const dialog = page.getByRole("dialog");
    await expect(page.getByRole("heading", { name: "Access controls" })).toBeVisible();

    // Same proof shape as the Studio's own re-open assertion earlier in
    // this file: capital-P "Protected" only appears once a password is
    // actually set, and this dialog is the SAME lifted CodeAccessDialog
    // component reading the SAME code's real persisted state — not a
    // second copy that could silently disagree. Scoped to the dialog
    // itself: code-actions-panel.tsx's own static summary line (shown
    // beside the "Access…" trigger even before it's clicked) renders the
    // same "Protected · expires <date>" prefix in a shorter date format,
    // so an unscoped match against the whole page hits both and strict
    // mode rejects the ambiguity — found by running this suite locally.
    await expect(dialog.getByText(/^Protected · expires/)).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Access controls" })).toBeHidden();
  });

  test("code detail page: exports the code as an SVG download", async () => {
    await page.getByRole("button", { name: "Download" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);
  });

  /**
   * Standing regression guard (P9.6-U3 review round 1) for two real bugs
   * found by the orchestrator's own device testing, not by this suite:
   *
   * 1. /codes/[slug] overflowed horizontally at 390px — a `<main>` grid,
   *    and two nested grids inside CodeAnalyticsPanel, all missing an
   *    explicit base `grid-cols-N`. Without one, Tailwind never applies
   *    ANY `grid-template-columns` below the breakpoint it's prefixed at,
   *    so the browser falls back to an implicit, content-sized column
   *    instead of one clamped to the viewport. A related bug in the same
   *    fix used a bare `1fr` in a custom `grid-cols-[320px_1fr]` value,
   *    which has the same "no minimum clamp" problem `minmax(0,1fr)`
   *    exists to prevent.
   * 2. A SEPARATE overflow, found while chasing #1 with a full-width
   *    sweep rather than trusting the single reported width: the
   *    breakdown grid's `lg:grid-cols-4` squeezed each column to ~124px
   *    at the narrow end of the `lg:` range (1024px viewport) — less
   *    than a BreakdownRow's fixed parts alone need (label + count + gaps
   *    = 168px, before the flexible bar gets anything). 390px alone would
   *    NOT have caught this one (verified: reintroducing it locally left
   *    a 390px-only version of this test green) — hence checking a
   *    representative width from every breakpoint below, not just the
   *    originally-reported one.
   *
   * Both fixed at the CSS level; this test is what stops either from
   * shipping silently again.
   *
   * Deliberately does NOT reuse the near-empty CODE_NAME fixture code
   * as-is: that code has no seeded scan_daily rows, so its breakdown
   * grids render their "No data yet" empty state — which never had this
   * bug (there's nothing to overflow) and would make this guard pass
   * whether or not the CSS regressed. A couple of scan_daily rows with
   * deliberately long labels and large numbers (same shape as the
   * orchestrator's own repro) are seeded directly here so this test
   * actually exercises the code path that broke.
   *
   * Runs in its OWN context/page rather than resizing the shared `page`
   * above: every other test in this file expects Playwright's default
   * desktop viewport, and this keeps that assumption safe regardless of
   * what order tests run in within this file. Re-signs in with a fresh
   * magic-link token (mintSignInToken is single-use, same reasoning the
   * top-of-file sign-in test documents) — cheap, and keeps this test able
   * to run standalone if this file's structure changes later.
   */
  test("code detail page: /codes and /codes/[slug] never scroll horizontally, at any breakpoint", async ({ browser }) => {
    const admin = createAdminClient();
    const { data: dbCode, error: lookupError } = await admin
      .from("qr_codes")
      .select("id")
      .eq("slug", slug)
      .single();
    if (lookupError || !dbCode) {
      throw new Error(`[e2e] couldn't look up code id for slug ${slug}: ${lookupError?.message}`);
    }

    // Yesterday, not today: scan_daily's own `[start, end)` range query
    // (lib/analytics.ts's rangeWindowUtc) excludes today by design — the
    // rollup only covers completed days (D8) — so a row dated today would
    // silently never appear in the default 30d window this page queries.
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const { error: seedError } = await admin.from("scan_daily").insert({
      code_id: dbCode.id,
      day: yesterday,
      scans: 87_000,
      uniques: 50_000,
      by_country: { US: 45_000, GB: 12_000, DE: 8_000 },
      by_device: { mobile: 60_000, desktop: 20_000, tablet: 7_000 },
      by_referer: {
        direct: 40_000,
        "instagram.com": 15_000,
        "some-very-long-referrer-host.example.com": 32_000,
      },
      by_city: { "New York": 20_000, London: 15_000, "San Francisco Bay Area": 10_000 },
    });
    if (seedError) {
      throw new Error(`[e2e] couldn't seed scan_daily for the overflow guard: ${seedError.message}`);
    }

    // One representative width per Tailwind breakpoint band this page's
    // grids branch on (base/sm/md/lg/xl), not just the 390px originally
    // reported — bug #2 above is exactly why a single width isn't enough.
    const WIDTHS_TO_CHECK = [390, 640, 768, 1024, 1280, 1600];

    const mobileContext = await browser.newContext({ baseURL: E2E_BASE_URL });
    try {
      const probePage = await mobileContext.newPage();
      const hashedToken = await mintSignInToken(manifest.email);
      await probePage.goto(
        `${E2E_BASE_URL}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=email&next=/codes`,
        { waitUntil: "commit" },
      );
      // A predicate on url.pathname, NOT a regex against the full URL
      // string — found by running this exact test locally: the
      // interstitial's OWN URL is .../auth/confirm?token_hash=...&next=/codes,
      // which as a raw string also ends in "/codes", so /\/codes$/ matched
      // immediately on the pre-redirect URL rather than waiting for the
      // real client-side auto-submit + redirect. That let every check below
      // run against an unauthenticated (redirected-to-/login) session,
      // which never overflows — the guard silently checked the wrong page
      // and always passed regardless of the CSS underneath it.
      await probePage.waitForURL((url) => url.pathname === "/codes", { timeout: 30000 });

      for (const width of WIDTHS_TO_CHECK) {
        await probePage.setViewportSize({ width, height: 900 });
        for (const path of ["/codes", `/codes/${slug}`]) {
          await probePage.goto(`${E2E_BASE_URL}${path}`, { waitUntil: "networkidle" });
          const { scrollWidth, clientWidth } = await probePage.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          expect(
            scrollWidth,
            `${path} scrollWidth (${scrollWidth}) vs clientWidth (${clientWidth}) at ${width}px`,
          ).toBeLessThanOrEqual(clientWidth + 1);
        }
      }
    } finally {
      await mobileContext.close();
    }
  });

  test("/api-keys: mints a key and the reveal-once card shows a qrcdn_live_ key", async () => {
    await page.goto(`${E2E_BASE_URL}/api-keys`);
    await page.getByLabel("New API key name").fill(API_KEY_NAME);
    await page.getByRole("button", { name: "Create key" }).click();

    const revealedKeyLocator = page.getByText(REVEALED_API_KEY_RE);
    await expect(revealedKeyLocator).toBeVisible();
    const fullKey = ((await revealedKeyLocator.textContent()) ?? "").trim();
    expect(fullKey).toMatch(/^qrcdn_live_/);

    await page.getByRole("button", { name: "Done" }).click();
  });

  test("/api-keys: revokes the key", async () => {
    await page.getByRole("button", { name: "Revoke" }).click();
    await page.getByRole("button", { name: "Confirm revoke" }).click();
    await expect(page.getByText("Revoked")).toBeVisible();
  });

  test("no server action returned a 5xx to a next-action request", () => {
    // THE assertion this whole suite exists for — see fixtures.ts and this
    // file's own header. A non-empty list here means a Studio/API-keys
    // server action crashed in the bundled action registry somewhere above,
    // exactly the P7.5 class every other gate (tsc, next build, vitest, CI)
    // stayed green through.
    expect(actionFailures).toEqual([]);
  });

  // P9.5-T7. This suite's one fixture user is minted pro (global-setup.ts's
  // setProfileToPro) — there is no separate free-tier fixture, so proving
  // the /api-keys free-plan showcase renders means flipping THIS user's
  // plan partway through the run.
  //
  // INVARIANT, load-bearing, read before moving this test: it flips
  // `profiles.plan` pro -> free directly via the admin client and never
  // flips it back. That is safe ONLY because of two properties of this
  // suite, and breaks silently if either stops holding:
  //   1. playwright.config.ts pins `workers: 1` + `fullyParallel: false` —
  //      this is the ONLY session that will ever touch this fixture user
  //      for the life of this run, so nothing else can observe or race the
  //      mutation.
  //   2. This is the LAST test in this file. Nothing below this line reads
  //      or depends on `plan === "pro"`, and global-teardown.ts deletes
  //      this fixture user outright once the run ends, so there is nothing
  //      to restore for a future run either.
  // If you're adding a test below this one: stop. Either your new test
  // must not depend on plan === "pro", or this test needs to move below
  // yours, or — if it genuinely must run mid-flow for some new reason — it
  // needs a try/finally that restores plan: "pro" before anything else
  // runs. An earlier draft of this test restored the plan inline with no
  // guard; a failed assertion between the flip and the restore would have
  // left the fixture on "free" for every Pro-dependent step still to come,
  // turning one honest failure into a cascade of unrelated ones. Moving
  // this step to last deletes that failure mode instead of guarding it.
  test("/api-keys shows the free-tier showcase once the fixture flips to the free plan", async () => {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ plan: "free" }).eq("id", manifest.userId);
    if (error) {
      throw new Error(`[e2e] failed to flip the fixture user to the free plan: ${error.message}`);
    }

    await page.goto(`${E2E_BASE_URL}/api-keys`);
    await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();

    // The curl sample (lib/api-reference.ts's create-code request, rendered
    // through the shiki CodeBlock) and the honest CTA — no create-key form,
    // since this account cannot mint one on the free plan.
    await expect(page.getByText(/curl -X POST/)).toBeVisible();
    await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    await expect(page.getByLabel("New API key name")).toBeHidden();
  });
});
