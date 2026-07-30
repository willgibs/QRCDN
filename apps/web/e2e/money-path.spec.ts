import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect, trackActionFailures } from "./fixtures";
import type { BrowserContext, Page, ServerActionFailure } from "./fixtures";
import { E2E_BASE_URL } from "./env";
import { manifestPath, type E2eFixtureManifest } from "./manifest";

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
 * Opens the codes-list row's "Actions for {name}" dropdown. Presses Escape
 * first as a deliberate, empirically-motivated defensive step: closing the
 * Access dialog (opened from a DropdownMenuItem two levels down — Actions
 * button -> dropdown -> "Access…" item -> Dialog) leaves THIS SAME dropdown
 * reopened afterward. Confirmed by screenshotting the page immediately after
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
  await page.keyboard.press("Escape");
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

  // Defensive, applies between every step: closing ANY dialog opened from a
  // DropdownMenuItem (Access…) leaves that dropdown reopened afterward (see
  // openCodeActionsMenu's doc comment) — and that stray-open dropdown, left
  // alone, goes on to break whatever the NEXT step clicks, not just a
  // repeat "Actions for…" click (confirmed: it broke the unrelated
  // "Bulk create" button in the very next test during development). Escape
  // is a safe no-op when nothing is open.
  test.afterEach(async () => {
    await page.keyboard.press("Escape").catch(() => {});
  });

  test("signs in via the magic-link confirm route and lands on /studio authenticated", async () => {
    await page.goto(
      `${E2E_BASE_URL}/auth/confirm?token_hash=${encodeURIComponent(manifest.hashedToken)}&type=magiclink&next=/studio`,
    );
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
    await expect(page.getByText(CODE_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText(BULK_NAME_1, { exact: true })).toBeVisible();
    await expect(page.getByText(BULK_NAME_2, { exact: true })).toBeVisible();
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
});
