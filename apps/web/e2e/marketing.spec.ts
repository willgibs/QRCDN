import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "./fixtures";
import { PLAN_LIMITS, PRICING } from "../lib/entitlements";
// Imported, never literalised: lib/e2e-safety.test.ts rejects every
// email-shaped literal under e2e/ that is not a throwaway fixture address,
// and that allowlist is worth more than the convenience of typing it here.
import { CONTACT_EMAIL } from "../lib/contact";
import { CHANGELOG_ENTRIES } from "../lib/changelog";
import { BLOG_POSTS } from "../lib/blog";
import { HELP_ARTICLES, HELP_CATEGORIES } from "../lib/help";
import { MAX_SLUG_LENGTH } from "../lib/slug";
import { COMPARISON_BANDS, COMPARISON_ROWS, LANDING_ROWS } from "../lib/comparison";
import { LANDING_INDEX } from "../lib/landing-index";
import { LOGO_EFFECTIVE_ERROR, LOGO_EFFECTIVE_WARN } from "@qrcdn/qr-engine";

// Relative imports only in e2e/ (no "@/" — see env.ts's header note).

/**
 * The marketing site (P9-U6). Unlike money-path.spec.ts, this is a set of
 * plain, independent tests: no `test.describe.serial`, no manually-created
 * shared page/context, no fixture-user dependency, no auth at all — every
 * test here uses the standard built-in `page`/`request` fixtures and could
 * run in any order or in isolation. The whole suite still executes in one
 * worker, sequentially (playwright.config.ts: `workers: 1`), so test count
 * is kept lean on purpose — every test here adds to the same wall-clock
 * money-path.spec.ts's 14 tests already spend.
 *
 * Scope is deliberately narrow: this proves the public site is reachable,
 * honest (no dead `href="#"` placeholders — docs/guides/p9-marketing.md's
 * "real hrefs only" rule for SiteNav/SiteFooter), and numerically
 * truth-coupled to `lib/entitlements.ts` (CLAUDE.md's hard rule: entitlement
 * limits live there and nowhere else). It does not re-test product features
 * the (app) routes already cover.
 */

const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/developers",
  // P9.8-B4: /studio is public — anonymous static-code studio.
  "/studio",
  "/features/dynamic-codes",
  "/features/analytics",
  "/features/brand-studio",
  "/features/access-controls",
  "/changelog",
  "/blog",
  "/help",
] as const;

/**
 * Recursively collects every file under `dir` (P9.5-T8, "no shiki client
 * chunk" test below). Same shape as `lib/no-em-dash.test.ts`'s
 * `collectSourceFiles` — a plain recursive walk, no assumption that
 * `.next/static/chunks` stays a flat directory forever (it is today, but a
 * future Next version or route shape could nest it).
 */
function collectFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

test.describe("marketing site", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path}: responds 200 with no placeholder hrefs`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `GET ${path}`).toBe(200);
      // Real hrefs only (P9-U1 SiteNav/SiteFooter brief) — a literal
      // `href="#"` anywhere on a public page is a defect, not a placeholder.
      await expect(page.locator('a[href="#"]')).toHaveCount(0);
    });
  }

  test("/studio anonymous: the working studio, its two incentives, and no app shell (P9.8-B4)", async ({
    page,
  }) => {
    // No auth fixtures in this file (see the header) — the standard context
    // IS the anonymous visitor. The full authed studio stays covered by
    // money-path.spec.ts.
    await page.goto("/studio");

    // The real tool renders: a design control, the payload input, and a
    // working export affordance (the whole chain is client-side).
    await expect(page.getByLabel("Destination")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download SVG" })).toBeVisible();
    await expect(page.getByText("Module size")).toBeVisible();

    // P9.8-R3: the Destination field starts EMPTY (no wall-of-W's example
    // value; the worst-case payload still drives the preview evaluation
    // behind it), and exports are disabled until a real destination exists —
    // an export must never encode the evaluation placeholder.
    await expect(page.getByLabel("Destination")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    await expect(page.getByText("Enter a destination to export.")).toBeVisible();
    await page.getByLabel("Destination").fill("https://example.com/menu");
    await expect(page.getByRole("button", { name: "Download SVG" })).toBeEnabled();
    await expect(page.getByText("Enter a destination to export.")).toHaveCount(0);

    // The two account incentives, both routing to /login: the bar's Start
    // free and the rail's make-it-dynamic line. Scoped queries: the public
    // nav also carries a "Start free".
    await expect(
      page.getByRole("link", { name: "Make it dynamic: change where it points after printing. Start free →" }),
    ).toHaveAttribute("href", "/login");
    await expect(page.getByText("no account, no watermark", { exact: false })).toBeVisible();

    // No authenticated chrome leaks into the anonymous state.
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    await expect(page.getByText("Save changes")).toHaveCount(0);
  });

  test("nav CTA: Start free lands on /login", async ({ page }) => {
    await page.goto("/");
    // Scoped to the page's one <header> (role=banner) — "Start free"
    // repeats in later sections (pricing teaser et al.; the hero's CTA row
    // retired at P9.10-D1 in favor of the URL form); the nav's is the one
    // this test means.
    await page.getByRole("banner").getByRole("link", { name: "Start free" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("unknown route renders the custom 404 with a 404 status", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-route-p9");
    expect(response?.status()).toBe(404);
    // Distinctive copy from app/not-found.tsx — not Next's generic default
    // 404 ("This page could not be found."), which route-group chrome
    // (SiteNav/SiteFooter) doesn't even wrap. P9.5-T4: the h1 is now the
    // display-scale "404" glyph itself, with the explanatory sentence as a
    // separate line below it and two real links (home, support).
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(
      page.getByText("This page doesn't exist, or the link is broken."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back home" })).toHaveAttribute("href", "/");
    // Regex, not a string literal — lib/e2e-safety.test.ts's static scan
    // flags any email-shaped string literal under e2e/ that isn't an
    // e2e.qrcdn.test fixture address (this repo's e2e suite runs against
    // real cloud Supabase, so that guard is intentionally strict). This is
    // a real support address baked into the product's own served markup,
    // not a test-fixture address, so it's asserted via a regex literal —
    // exempt by construction, per the scanner's own documented carve-out
    // (same "PATCH"/"QRCDN" precedent already used elsewhere in this file).
    await expect(page.getByRole("link", { name: "Contact support" })).toHaveAttribute(
      "href",
      /^mailto:hello@qrcdn\.com$/,
    );
  });

  // P9.5-T4: /pricing v2's banded matrix + guarantee band, and /login's lg+
  // value panel.

  test("pricing page renders the banded matrix and the guarantee strip", async ({ page }) => {
    await page.goto("/pricing");

    // Every band header from PRICING_MATRIX_BANDS (lib/pricing.ts) — text-
    // based, not role-based: a colgroup-scoped <th>'s ARIA role mapping
    // isn't consistent enough across engines to depend on, the same
    // reasoning comparison-section.tsx's own e2e coverage already applies
    // to its column headers. Scoped to the comparison table specifically
    // (P9.5-T-R rider): "Analytics" and "Access controls" are now ALSO
    // SiteNav's Features-dropdown labels, present in the DOM (mirrored
    // flat into the mobile disclosure, `inert` when closed but still a
    // real DOM node — Playwright's locator resolution counts matches
    // regardless of `display:none`/`inert`, which only govern the
    // eventual visibility/focusability check on an already-unique
    // locator, not strict-mode's match COUNT) — an unscoped page-wide
    // getByText now strict-mode-violates on those two bands specifically.
    // P9.9-C3: /pricing now carries THREE tables (this matrix plus the full
    // comparison sheet's two DOM variants at #compare), and "Design &
    // export" is a band name in BOTH tables — scope to the matrix's own
    // section before touching band text.
    const table = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Free and Pro, side by side" }) })
      .getByRole("table");
    for (const band of [
      "Codes & limits",
      "Design & export",
      "Analytics",
      "Access controls",
      "API & bulk",
    ]) {
      await expect(table.getByText(band, { exact: true })).toBeVisible();
    }

    // The deck-04 guarantee line, verbatim (dynamic-codes-section.tsx's own
    // sentence, reused here per the T4 spec's "band Section" guarantee strip).
    await expect(
      page.getByText(
        "free codes are never deactivated, and a downgrade never breaks a printed code.",
      ),
    ).toBeVisible();
  });

  test("login: value panel shows at desktop viewport, hidden at mobile", async ({ page }) => {
    await page.goto("/login");
    // Default project viewport (Desktop Chrome, 1280x720) is well above the
    // lg breakpoint the panel gates on.
    await expect(page.getByText("Free codes never stop redirecting.")).toBeVisible();
    await expect(page.getByText("No card, no trial clock.")).toBeVisible();
    await expect(page.getByText("MIT open source.")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText("Free codes never stop redirecting.")).toBeHidden();
    // The single-column auth card is unaffected at the mobile viewport.
    await expect(page.getByRole("heading", { name: "Sign in or sign up" })).toBeVisible();
  });

  test("login: mono sign-off renders exactly once at desktop viewport (P9.5-T5 rider)", async ({
    page,
  }) => {
    // Pre-fix, the card's own sign-off and the lg+ value panel's sign-off
    // both rendered "your code never dies" at once: two copies visible in
    // the same viewport. Both <p> elements still exist in the DOM (the
    // card's is lg:hidden, not removed), so this scopes to :visible rather
    // than plain getByText, the same `:visible` CSS pseudo-class technique
    // comparison-section.tsx's own e2e coverage already established for
    // picking "whichever DOM variant the current viewport actually shows".
    await page.goto("/login");
    const signOffs = page.locator("p", { hasText: "your code never dies" });
    await expect(signOffs).toHaveCount(2);
    await expect(page.locator("p:visible", { hasText: "your code never dies" })).toHaveCount(1);

    // Below lg, the value panel is display:none, so the card's own
    // sign-off (unaffected by this rider) is the only one anywhere, DOM or
    // visible.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("p:visible", { hasText: "your code never dies" })).toHaveCount(1);
  });

  test("/robots.txt allows crawling and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBe(true);
    const body = await response.text();
    expect(body).toContain("Sitemap:");
  });

  test("/sitemap.xml lists the marketing routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    const body = await response.text();
    expect(body).toContain("/pricing");
    // P9.5-T-F1: both new feature pages.
    expect(body).toContain("/features/dynamic-codes");
    expect(body).toContain("/features/analytics");
    // P9.5-T-F2: the second pair.
    expect(body).toContain("/features/brand-studio");
    expect(body).toContain("/features/access-controls");
    // P9.10-D7: /contact.
    expect(body).toContain("/contact</loc>");
    // P9.5-T-R: /blog + every real post, /help + every real article.
    expect(body).toContain("/blog</loc>");
    for (const post of BLOG_POSTS) {
      expect(body).toContain(`/blog/${post.slug}`);
    }
    expect(body).toContain("/help</loc>");
    for (const article of HELP_ARTICLES) {
      expect(body).toContain(`/help/${article.slug}`);
    }
  });

  test("pricing page numbers are read from entitlements.ts, not retyped", async ({ page }) => {
    await page.goto("/pricing");

    // The full compare table (lib/pricing.ts's PRICING_ROWS) renders
    // unconditionally — the "Dynamic codes" row's two cells prove the count
    // caps came from PLAN_LIMITS rather than a hand-typed matrix.
    const dynamicCodesRow = page.getByRole("row", { name: /Dynamic codes/ });
    await expect(
      dynamicCodesRow.getByRole("cell", { name: String(PLAN_LIMITS.free.dynamicCodes), exact: true }),
    ).toBeVisible();
    await expect(
      dynamicCodesRow.getByRole("cell", { name: String(PLAN_LIMITS.pro.dynamicCodes), exact: true }),
    ).toBeVisible();

    // The monthly price only renders once the Monthly tab is selected
    // (PricingPlans defaults to annual, `$${ANNUAL_MONTHLY_EQUIV_USD}`).
    await page.getByRole("tab", { name: "Monthly" }).click();
    await expect(page.getByText(`$${PRICING.monthlyUsd}`)).toBeVisible();

    // P9.8-B0: the free-plan summary's kit line, asserted with count-driven
    // noun agreement. The deferred ledger's entry 10 predicted exactly this
    // drift ("2 brand kit") when the limit moved off 1; the copy and this
    // assertion both derive the noun from the same value, so a future limit
    // change cannot re-open the gap in either direction.
    const kitNoun = PLAN_LIMITS.free.brandKits === 1 ? "kit" : "kits";
    await expect(
      page.getByText(
        `${PLAN_LIMITS.free.brandKits} brand ${kitNoun} · ${PLAN_LIMITS.free.analyticsRetentionDays}-day analytics`,
      ),
    ).toBeVisible();
  });

  // P9.9-C2: both playground interaction tests retargeted from "/" to
  // /features/brand-studio — the full Playground island's sole remaining
  // home after the landing's 03 restage (StudioSection/StudioDials has its
  // own test below). Section located by the feature page's own S2 heading.
  test("playground opens scannable (print-truth default, d2af287)", async ({ page }) => {
    await page.goto("/features/brand-studio");
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Try it, no account" }) });
    await expect(playgroundSection.getByRole("status")).toContainText(/scannable/i);
  });

  test("playground preset shelf: renders 3 presets and applies one", async ({ page }) => {
    await page.goto("/features/brand-studio");
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Try it, no account" }) });

    // All 3 named presets render (text-based, not role-based — avoids
    // coupling the test to Radix ToggleGroup's exact internal role choice).
    // "Ember" is the P9.9-C1 board rename of the lead demo identity
    // (was "Café Norte").
    await expect(playgroundSection.getByText("Ember", { exact: true })).toBeVisible();
    await expect(playgroundSection.getByText("Second Story", { exact: true })).toBeVisible();
    await expect(playgroundSection.getByText("Personal", { exact: true })).toBeVisible();

    // Clicking one actually applies it: Ember's sizeRatio (0.88) shows
    // up in the Module size readout once the ~300ms control transition
    // settles (Playwright's toBeVisible auto-retries past that).
    await playgroundSection.getByText("Ember", { exact: true }).click();
    await expect(playgroundSection.getByText("88%", { exact: true })).toBeVisible();
  });

  test("dynamic codes: the constant holds while the counter climbs (P9.10-D5)", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page.locator("#dynamic-codes");

    // The constant: one printed code carrying one short address, and it is
    // the same code the filmstrip follows at 01.
    await expect(section.getByText("qrcdn.com/cafe")).toBeVisible();

    // Three destinations, one business — hue-labeled per destination-hues.ts.
    const chips = section.getByRole("button", { name: /Point the code at/ });
    await expect(chips).toHaveCount(3);
    for (const dest of ["yourcafe.com/menu", "yourcafe.com/winter", "yourcafe.com/order"]) {
      await expect(
        section.getByRole("button", { name: `Point the code at ${dest}` }),
      ).toBeVisible();
    }

    // THE contract of this device: the visitor drives the left number and the
    // right one never moves. That pair is the unlimited-retargets guarantee
    // (D14) demonstrated rather than asserted, so it is what CI pins.
    const readout = section.locator('[role="status"]');
    await expect(readout).toContainText("0 retargets");
    await expect(readout).toContainText("0 reprints");

    await chips.nth(0).click();
    await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(readout).toContainText("1 retarget");

    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(readout).toContainText("2 retargets");
    // Never moves, whatever the left number does.
    await expect(readout).toContainText("0 reprints");
    await expect(readout).toContainText("302");

    // The four claims that replaced the two mono strips.
    for (const name of [
      "Retarget anytime",
      "Never cached",
      "Live at the edge",
      "Your code never dies",
    ]) {
      await expect(section.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test("access controls: three controls and the states a visitor meets (P9.7-V4)", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Control who can visit" }) });

    // Password and expiry are Pro; pause deliberately is not, because
    // setCodePausedCore has no plan gate at all.
    for (const name of ["Password", "Expiry", "Pause"]) {
      await expect(section.getByRole("heading", { name, exact: true })).toBeVisible();
    }

    // The two scan-facing states moved here from #dynamic-codes with the
    // cards themselves: the /p gate and the /u neutral page.
    await expect(section.getByText(/^\/p\//)).toBeVisible();
    await expect(section.getByText(/^\/u\//)).toBeVisible();

    // The honest limit is on the page, not just in a code comment.
    await expect(section.getByText("A gate, not a vault.")).toBeVisible();
  });

  test("analytics window: breakdown rows and retention row render from entitlements", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#analytics");
    await expect(section.getByText("Top countries", { exact: true })).toBeVisible();
    // exact: the headline's "1,669 unique devices" is a substring match for a
    // non-exact "Devices" locator, so this strict-mode-violates without it.
    await expect(section.getByText("Devices", { exact: true })).toBeVisible();
    // "Today so far" was a DashboardWindow stat tile and went with it at
    // P9.7-V5: it held a full tile on the landing and read 0 for most of any
    // day. DashboardWindow still renders it on /features/analytics.
    await expect(section.getByText(/scans · 30 days ·/)).toBeVisible();
    await expect(
      section.getByText(
        `${PLAN_LIMITS.free.analyticsRetentionDays}-day history free · ${PLAN_LIMITS.pro.analyticsRetentionDays}-day + city-level on Pro`,
      ),
    ).toBeVisible();
  });

  // P9.5-T3c: the four sections that complete the 01-11 ordinal sequence.

  test("scannability: the gauge draws the engine's own thresholds inside the campaign gap", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Know it scans before you print it" }) });

    // P9.7-V5 replaced GuardrailsPlot here. Its scatter was authored rather
    // than measured (the source record keeps only the campaign's aggregate
    // boundary), so the most eye-catching thing in the section was the part
    // carrying no information. The gauge draws the two real endpoints instead.
    //
    // Scoped by accessible name, not "svg": the section also carries
    // decorative ModuleMark glyphs in the eyebrow and the mono strip.
    const gauge = section.getByRole("img", { name: /Effective knockout ratio/ });
    await expect(gauge).toHaveCount(1);

    // The drawn thresholds must be the ones the engine actually enforces,
    // read from the engine here rather than retyped, so this fails if the
    // figure ever hardcodes a number that drifts from guardrails.ts.
    await expect(gauge).toHaveAccessibleName(
      new RegExp(`warn threshold sits at ${LOGO_EFFECTIVE_WARN}`),
    );
    await expect(gauge).toHaveAccessibleName(
      new RegExp(`fail threshold sits at ${LOGO_EFFECTIVE_ERROR}`),
    );
    // Scoped to the gauge: these strings now also appear in the instrument
    // panel beside it and in the mono strip below, so an unscoped locator
    // strict-mode-violates at 3 matches. That is three places reading one
    // pair of engine constants, which is the point.
    await expect(gauge.getByText(`warn ${LOGO_EFFECTIVE_WARN}`)).toBeVisible();
    await expect(gauge.getByText(`fail ${LOGO_EFFECTIVE_ERROR}`)).toBeVisible();

    // The argument of the section, stated precisely, because the two
    // thresholds do NOT sit in the same relationship to the campaign and an
    // earlier draft of the figcaption flattened them into one claim that was
    // false for the fail line. Warn is below the best observed pass; fail is
    // inside the gap between the best pass and the worst fail, where nothing
    // was ever observed. Both are conservative, differently.
    expect(LOGO_EFFECTIVE_WARN).toBeLessThan(0.407);
    expect(LOGO_EFFECTIVE_ERROR).toBeGreaterThan(0.407);
    expect(LOGO_EFFECTIVE_ERROR).toBeLessThan(0.418);
    await expect(gauge.getByText(/last pass ~0\.407/)).toBeVisible();
    await expect(gauge.getByText(/first fail ~0\.418/)).toBeVisible();

    // The honest limit is on the page, not only in a code comment: these
    // campaigns were software decodes, never a phone reading a printed sheet.
    await expect(section.getByText("Measured by a decoder, not by a camera.")).toBeVisible();

    await expect(
      section.getByText(
        `160+ style combinations · 2 adversarial decode campaigns · warn ${LOGO_EFFECTIVE_WARN} · fail ${LOGO_EFFECTIVE_ERROR}`,
      ),
    ).toBeVisible();
  });

  test("09 the constant print: five accordion verbs, the mat never dies (P9.10-D2)", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#api");
    await expect(section).toHaveCount(1);

    // The tabs island retired to native details/summary — zero tab
    // semantics remain in the section.
    await expect(section.getByRole("tab")).toHaveCount(0);

    // Five verbs; Create server-rendered open with its panes visible.
    // Uppercase HTTP methods stay REGEX literals (lib/e2e-safety.test.ts's
    // static scan flags hardcoded uppercase runs in e2e/ as potential
    // real-slug literals; a regex literal is exempt by construction —
    // same convention the retired tab test used).
    const verbs = section.locator("details.api-verb");
    await expect(verbs).toHaveCount(5);
    await expect(verbs.nth(0)).toContainText(/POST/);
    await expect(verbs.nth(0)).toHaveAttribute("open", "");
    await expect(verbs.nth(0).getByText("Request", { exact: true })).toBeVisible();

    // Opening Retarget closes Create: native exclusive accordion via the
    // details name group — the proof no client island is doing this.
    await expect(verbs.nth(3)).toContainText(/PATCH/);
    await verbs.nth(3).locator("summary").click();
    await expect(verbs.nth(3)).toHaveAttribute("open", "");
    await expect(verbs.nth(0)).not.toHaveAttribute("open", "");
    await expect(verbs.nth(3).getByText("Response", { exact: true })).toBeVisible();

    // The rail: one real engine render on the white mat, the green
    // active light beside it.
    await expect(section.locator("[data-slot=api-mat] svg")).toHaveCount(1);
    await expect(section.getByText("active", { exact: true })).toBeVisible();

    // The heading's primary doorway + the eight-feature capability grid
    // (quota text renders from entitlements.ts — asserted via the same
    // formatted value, never a second hand-typed copy).
    await expect(section.getByRole("link", { name: "Read the docs" })).toHaveAttribute(
      "href",
      "/developers",
    );
    await expect(section.locator("[data-slot=api-feature]")).toHaveCount(8);
    await expect(
      section.getByText(`${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString("en-US")} req/mo`),
    ).toBeVisible();
  });

  test("comparison: the landing cut on the lit bench (P9.9-C3)", async ({ page }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Industry-leading features" }) });

    // Two DOM tables from one data source (mobile QRCDN-first, desktop
    // QRCDN-last, toggled via md:hidden / hidden md:block) — pinned as a
    // count, then `:visible` picks whichever one this viewport shows
    // (desktop here) rather than matching both and strict-mode-violating.
    await expect(section.locator("table")).toHaveCount(2);
    const table = section.locator("table:visible");
    // 4 real columns + 1 blank corner cell above the row labels.
    await expect(table.locator("thead th")).toHaveCount(5);
    for (const column of ["Free generators", "Shortener add-ons", "Enterprise platforms"]) {
      await expect(table.getByText(column, { exact: true })).toBeVisible();
    }
    // "QRCDN" as a regex, not a string literal — lib/e2e-safety.test.ts's
    // static scan flags any hardcoded uppercase run inside e2e/'s
    // SLUG_CHARSET as a potential real-slug literal; the product name isn't
    // a slug, but a regex literal is exempt by construction rather than
    // needing an allowlist entry for a false positive (same reasoning as
    // the /PATCH/ regex above).
    await expect(table.getByText(/^QRCDN$/)).toBeVisible();

    // The 12-row cut with the agreed grading census — every count derived
    // from the same module the section renders (lib/comparison.ts), so a
    // future row change keeps these pins honest instead of stale.
    await expect(table.locator("tbody tr")).toHaveCount(LANDING_ROWS.length);
    await expect(table.locator('tbody tr[data-kind="lead"]')).toHaveCount(
      LANDING_ROWS.filter((row) => row.kind === "lead").length,
    );
    await expect(table.locator('tbody tr[data-kind="gap"]')).toHaveCount(
      LANDING_ROWS.filter((row) => row.kind === "gap").length,
    );

    // Board edits: terse labels and bare chips, with every note riding a
    // data-tip attribute (pure-CSS hover bubble) plus an sr-only twin. The
    // instrument row's label carries the full claim.
    await expect(
      table.locator('[data-tip*="calibrated on real decodes"]').first(),
    ).toBeVisible();

    // The bench decor: three server-rendered engine mats, aria-hidden and
    // lg-only, tucked behind the panel (z-0 vs the panel's z-10).
    await expect(section.locator("[data-decor] svg")).toHaveCount(3);

    // Footnote is never omitted — deck copy verbatim — and the doorway to
    // the comprehensive surface is a real link, not a promise (C3-R1: the
    // design system's LearnMoreLink, per the board's "maintain the design
    // system" directive).
    await expect(
      section.getByText("Category patterns, not claims about any specific vendor."),
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: "See the full sheet on pricing" }),
    ).toHaveAttribute("href", "/pricing#compare");
  });

  test("pricing: the full comparison sheet at #compare (P9.9-C3)", async ({ page }) => {
    await page.goto("/pricing#compare");
    const section = page.locator("section#compare");
    await expect(section.getByRole("heading", { name: "The full sheet" })).toBeVisible();

    const table = section.locator("table:visible");
    // One tbody per band, every band populated — structure and counts
    // derived from lib/comparison.ts, the same module the sheet renders.
    await expect(table.locator("tbody")).toHaveCount(COMPARISON_BANDS.length);
    for (const band of COMPARISON_BANDS) {
      const slug = band.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
      // +1: the band's own rowgroup header row.
      await expect(table.locator(`tbody[data-band="${slug}"] tr`)).toHaveCount(
        band.rows.length + 1,
      );
    }
    await expect(table.locator("tbody tr[data-kind]")).toHaveCount(COMPARISON_ROWS.length);

    // The sheet is the no-hover-needed surface: receipts and notes are
    // visible text here, including the gap band's honest concession.
    await expect(table.getByText("read the engine yourself")).toBeVisible();
    await expect(table.getByText("built for teams, SSO at contract tier")).toBeVisible();
  });

  test("comparison: the elevated column leads the mobile order", async ({ page }) => {
    // Review round 1: the elevated column has to be visible without
    // scrolling on a narrow viewport, so mobile reorders it first (desktop
    // keeps the deck's own QRCDN-last order — covered by the test above).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Industry-leading features" }) });

    const table = section.locator("table:visible");
    // Header index 0 is the blank corner cell above the row labels; index 1
    // is the first real data column — "QRCDN" regex for the same
    // e2e-safety reason as the desktop test above.
    await expect(table.locator("thead th").nth(1)).toHaveText(/^QRCDN$/);
  });

  test("open-source: #open-source anchor exists (cross-linked from /features/brand-studio)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#open-source")).toBeVisible();
    await expect(
      page.locator("#open-source").getByRole("heading", { name: "Verify our platform yourself" }),
    ).toBeVisible();
  });

  test("trust and privacy: the paper band, its three guarantees and a code that scans (P9.10-D6)", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Lifetime guarantees" }) });

    // The surface is the round's whole point, so it is pinned: this is the
    // page's ONE light plate, and a future round must not silently revert it.
    await expect(section).toHaveAttribute("data-surface", "paper");
    await expect(page.locator('section[data-surface="paper"]')).toHaveCount(1);
    // Ink retired with the move — 12 was its only consumer anywhere.
    await expect(page.locator('section[data-surface="ink"]')).toHaveCount(0);

    await expect(section.getByText("We never switch off a free code.")).toBeVisible();
    await expect(
      section.getByText("Stop paying and your codes go read-only, never dark."),
    ).toBeVisible();
    await expect(
      section.getByText("If our site goes down, your codes keep redirecting."),
    ).toBeVisible();

    // The code printed on the sheet is a real engine render pointed at a real
    // page (the citations above send you to the terms), not decoration.
    await expect(section.getByText("scan for the terms")).toBeVisible();
    await expect(page.locator("#terms-code")).toHaveCount(1);
  });

  test("heads: the amended section heads are live (P9.7-V1 IA rewrite)", async ({ page }) => {
    await page.goto("/");
    // P9.9-C2: 03 restaged — the historic pre-T3a head returns with the
    // dials body (was "Customize your brand design").
    await expect(page.getByRole("heading", { name: "Design one right now" })).toBeVisible();
    // P9.9-C1: section 04 takes the stronger claim the P9.8 hard-sync
    // reversal made true (was "Every code starts from your kit.").
    await expect(page.getByRole("heading", { name: "Every code syncs instantly" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Update a destination anytime" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Start free, pay when you print at scale" }),
    ).toBeVisible();
  });

  // P9.10-D7 — section 13 rebuilt as three plan columns over a contact row,
  // and the landing's ending rebuilt with it. These pin the things the
  // round actually fixed, not the chrome:
  //
  //  - THREE DISTINCT ACTIONS. The old section shipped "Start free" twice
  //    in one row (free card and Pro card, same words, same href) while the
  //    Pro footnote said checkout was not open. Pro now sends readers to
  //    the full comparison instead of pretending to sell.
  //  - ONE "Start free" in the whole ending, down from three.
  //  - Every plan number still arrives from entitlements.ts.
  test("pricing: three plan columns, three distinct actions (P9.10-D7)", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Start free, pay when you print at scale" }),
    });

    for (const plan of ["Free", "Pro", "Enterprise"]) {
      await expect(section.getByRole("heading", { name: plan, exact: true })).toBeVisible();
    }

    // The three CTAs go three different places. Enterprise and the row
    // beneath both reach the page built for them in this same round.
    await expect(section.getByRole("link", { name: "Start free" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(section.getByRole("link", { name: "See everything in Pro" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    await expect(section.getByRole("link", { name: "Talk to us" })).toHaveAttribute(
      "href",
      "/contact",
    );
    await expect(section.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "/contact",
    );

    // Numbers from entitlements.ts, never retyped (CLAUDE.md hard rule).
    await expect(section.getByText(`${PLAN_LIMITS.free.brandKits} brand kits`)).toBeVisible();
    await expect(
      section.getByText(`${PLAN_LIMITS.pro.dynamicCodes.toLocaleString("en-US")} dynamic codes`),
    ).toBeVisible();

    // The ending carries ONE "Start free" per section now. It used to put
    // two in this row alone (free card and Pro card, same words, same
    // href) plus a third in the closing. NOT asserted page-wide: the nav's
    // own banner CTA says "Start free" too and always has, which is why
    // the nav test above scopes itself to role=banner.
    await expect(section.getByRole("link", { name: "Start free", exact: true })).toHaveCount(1);
    const ending = page.locator("section").filter({ hasText: "your code never dies" });
    await expect(ending.getByRole("link", { name: "Start free", exact: true })).toHaveCount(1);
  });

  // The landing's closing is its own component now (LandingClosing) so the
  // four feature pages keep ClosingSection unchanged. It carries the aurora
  // budget's closing placement and the drifting code field behind it.
  test("closing: the kissed CTA and the code field (P9.10-D7)", async ({ page }) => {
    await page.goto("/");
    const closing = page.locator("section").filter({ hasText: "your code never dies" });

    const cta = closing.getByRole("link", { name: "Start free", exact: true });
    await expect(cta).toHaveClass(/cta-kiss/);
    await expect(cta).toHaveClass(/aurora-edge/);
    // Matches the hero: composing .aurora-breathe is what makes both ends
    // of the page run one animation list, including the 4.5s breath.
    await expect(cta).toHaveClass(/aurora-breathe/);

    // Six real engine renders drifting behind the ask, no more and no
    // fewer, and the glow they float in.
    await expect(closing.locator(".closing-mat")).toHaveCount(6);
    await expect(closing.locator(".closing-glow")).toHaveCount(1);

    // The heading breaks evenly at desktop rather than wrapping ragged.
    await expect(closing.getByText("Create your first", { exact: true })).toBeVisible();
    await expect(closing.getByText("code in minutes", { exact: true })).toBeVisible();
  });

  // /contact exists because section 13 points at it twice, and the site's
  // standing rule is real hrefs only. Deliberately not a form: no endpoint,
  // no inbox, no bot protection, and a form that drops mail is worse than
  // an address that works.
  test("/contact reaches a real page with a working address (P9.10-D7)", async ({ page }) => {
    await page.goto("/contact");
    await expect(
      page.getByRole("heading", { name: "A person, not a form", level: 1 }),
    ).toBeVisible();

    const mailtos = page.locator(`a[href^="mailto:${CONTACT_EMAIL}"]`);
    expect(await mailtos.count()).toBeGreaterThanOrEqual(5);

    // Every "before you write" pointer resolves somewhere real.
    await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    await expect(page.getByRole("link", { name: "Check status" })).toHaveAttribute(
      "href",
      "https://status.qrcdn.com",
    );

    // Reachable from every page, not only from the section that needed it.
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Contact", exact: true }),
    ).toHaveAttribute("href", "/contact");
  });

  test("brand system: the sync theatre stages the hard-sync flagship (P9.9-C1)", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page.locator("#brand-system");
    // The kit card (the control) and its identity.
    await expect(section.getByText("Ember", { exact: true })).toBeVisible();
    await expect(section.getByText("attached codes", { exact: true })).toBeVisible();
    // Three print artifacts (the simple mat form, board call at C1 close),
    // each carrying three engine-render layers (day + mono + glacier)
    // inside a [data-qr] wrapper = 9 engine svgs.
    await expect(section.locator("figure")).toHaveCount(3);
    expect(await section.locator("figure [data-qr] svg").count()).toBe(9);
    await expect(section.getByText("qrcdn.com/menu", { exact: true })).toBeVisible();
    await expect(section.getByText("qrcdn.com/events", { exact: true })).toBeVisible();
  });

  test("studio dials: the wall converges on a dial turn (P9.9-C2)", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#studio");
    // Four floating mats, one engine render each, resting in a RANGE of
    // four different kits (two white-paper, two inverted showpieces).
    await expect(section.locator("figure")).toHaveCount(4);
    expect(await section.locator("figure [data-qr] svg").count()).toBe(4);
    // The CTA is the /studio product doorway, carrying that page's promise.
    await expect(section.getByRole("link", { name: "Open the studio" })).toHaveAttribute(
      "href",
      "/studio",
    );
    await expect(section.getByText("free · no account · no watermark")).toBeVisible();
    // Turn the ink dial to teal: the whole wall adopts the config — the
    // poster mat's inverted rest paper (#18181b) converges to white. The
    // 500ms paper transition settles inside toHaveCSS's auto-retry.
    const poster = section.locator("figure").filter({ hasText: "qrcdn.com/gallery" });
    await expect(poster).toHaveCSS("background-color", "rgb(24, 24, 27)");
    await section.locator('label:has(input[value="#0f766e"])').click();
    await expect(section.getByRole("radio", { name: "#0f766e ink" })).toBeChecked();
    await expect(poster).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(section.getByText("every mat follows your pick")).toBeVisible();
  });

  test("hero h1: renders the v4 headline and never SSRs at opacity 0", async ({ page, request }) => {
    // Raw, unrendered HTML (no JS) — the actual bytes the server sent, not
    // a browser's post-hydration computed style (which could self-correct
    // via JS even if the initial markup shipped broken). The hard rule:
    // the h1 (the hero's LCP candidate) must never carry a static
    // opacity:0 anywhere in its own served markup — only the `hero-enter`
    // keyframes' 0% frame (an external stylesheet rule, not inline on the
    // element) may say opacity:0.
    const response = await request.get("/");
    const html = await response.text();
    const h1Match = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/);
    expect(h1Match, "expected exactly one <h1> in the served HTML").toBeTruthy();
    expect(h1Match?.[0]).not.toMatch(/opacity\s*:\s*0(?!\.)/);

    // Text content, not markup structure: "The modern" / "QR platform" are
    // two separate block-level spans (P9.5-T3a hero v4; the trailing period
    // was dropped at board round 5), so there is no space character between
    // them in `textContent` even though they render on separate lines —
    // assert with optional whitespace between the two halves rather than a
    // literal single-space string. `\.?` stays optional rather than
    // removed outright so this doesn't re-break if a period ever returns.
    await page.goto("/");
    const h1Text = await page.locator("h1").first().textContent();
    expect(h1Text?.replace(/\s+/g, " ").trim()).toMatch(/The modern\s*QR platform\.?/);
  });

  test("hero: the aurora URL form seeds the studio, the docs doorway stands, three real mats (P9.10-D1)", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });

    // The old CTA row is retired — its jobs moved into the input (create)
    // and the LearnMoreLink doorway (the API), per the D1 board pick.
    await expect(hero.getByRole("link", { name: "Start building" })).toHaveCount(0);
    await expect(hero.getByRole("link", { name: "See the API" })).toHaveCount(0);
    const docs = hero.getByRole("link", { name: "Read the API docs" });
    await expect(docs).toHaveAttribute("href", "/developers");

    // Three engine renders on paper mats (QR solidity rule: real
    // renderPreview output server-side, so the SVGs are in the DOM with
    // no client JS involved).
    await expect(hero.locator(".hero-paper svg")).toHaveCount(3);

    // The honest-input contract: typing a URL and submitting is a real
    // GET form to /studio, and the studio seeds it into the Destination
    // field (app/studio/page.tsx reads ?url=, StudioShell prefills).
    const form = hero.locator("form");
    await expect(form).toHaveAttribute("action", "/studio");
    await form.getByRole("textbox", { name: /destination url/i }).fill("https://example.com/menu");
    await form.getByRole("button", { name: "Make it" }).click();
    await expect(page).toHaveURL(/\/studio\?url=https%3A%2F%2Fexample\.com%2Fmenu/);
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(
      "https://example.com/menu",
    );
  });

  test("02 the index wall: six rows, each feeding a real anchor at its true ordinal (P9.10-D4)", async ({
    page,
  }) => {
    await page.goto("/");

    // The wall replaced the highlights bento, which had replaced the hero's
    // pillar strip; it inherits that navigation contract and extends it by
    // one, since the bento never linked open source.
    const rows = page.locator('[data-slot="index-wall-row"]');
    await expect(rows).toHaveCount(LANDING_INDEX.length);
    expect(LANDING_INDEX.length).toBe(6);

    for (const row of LANDING_INDEX) {
      const link = rows.filter({ hasText: row.receipt });
      await expect(link).toHaveAttribute("href", `#${row.id}`);
      // A dead fragment is not an href="#", so the no-empty-anchor sweep
      // would not catch a renamed section. Assert the target really exists.
      await expect(page.locator(`#${row.id}`)).toHaveCount(1);

      // THE contract of this section. `lib/landing-index.ts` records the
      // ordinal and the name the target section renders, but the ordinals
      // are owned by app/(marketing)/page.tsx and the names by each section
      // file, so nothing in the type system stops those three drifting
      // apart — the exact failure P9.7-V1 fixed for the eyebrows themselves.
      // Comparing the row against the eyebrow the target ACTUALLY renders
      // makes drift a red test instead of a wrong number on production.
      const eyebrow = page
        .locator(`#${row.id} [data-slot="section-heading-main"] p`)
        .first();
      // Read the two halves separately rather than the joined string: the
      // ordinal and the label are siblings separated by a flex `gap`, not by
      // whitespace, so `textContent` returns "03Studio" with no separator to
      // split on.
      await expect(eyebrow.locator("span").first()).toHaveText(row.ordinal);
      const full = ((await eyebrow.textContent()) ?? "").trim();
      expect(full.slice(row.ordinal.length).trim()).toBe(row.name);
    }

    // The zone's order, which D4 swapped: the run leads, the wall follows.
    const headings = page.locator('section[data-slot="section"] h2');
    await expect(headings.nth(0)).toHaveText("Make codes that last forever");
    await expect(headings.nth(1)).toHaveText("Our full-stack platform");

    // The bento and the strip before it are gone from every breakpoint.
    await expect(page.getByText("Everything you need in one place")).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Jump to a section"]')).toHaveCount(0);

    // D4's de-duplication, pinned — refined at D5. The original pin counted
    // the string `yourcafe.com/winter`, which was a fine proxy while the
    // bento and the filmstrip were the only two things drawing it. D5 gave
    // section 05 the same café's destinations on purpose (one business
    // repointing one code, threaded to the filmstrip's own repoint), so the
    // STRING now legitimately appears twice: once as the filmstrip's story,
    // once as a choice in 05's picker. What must stay unique is the
    // ARTWORK — a struck-through old URL over a live one. Only the
    // filmstrip draws that.
    await expect(page.locator(".line-through", { hasText: "yourcafe.com/menu" })).toHaveCount(1);
  });

  test("hero tagline is removed", async ({ page }) => {
    // P9.5-T3a: the old "destination updated live..." mono caption under
    // the network/orbit artwork is gone from every breakpoint — its
    // content resurfaces inside section 04 instead (not asserted here,
    // T3b's job once that body copy lands).
    await page.goto("/");
    await expect(page.getByText("destination updated live")).toHaveCount(0);
  });

  // P9.5-T5: /developers content ascent (Quickstart + comprehensive
  // per-endpoint reference) plus the /pricing h1 LCP rider.

  test("developers quickstart: five steps, each copy-pasteable sample has a copy button", async ({
    page,
  }) => {
    await page.goto("/developers");
    const quickstart = page.locator("#quickstart");
    await expect(quickstart.getByRole("heading", { level: 3 })).toHaveCount(5);
    // Steps 2 and 5 each render a request + response CodeBlock (2 copy
    // buttons apiece); steps 1/3/4 are prose/inline-code only, 4 total,
    // matching the spec's own "≥4" proof line exactly.
    const copyButtons = quickstart.getByRole("button", { name: "Copy code" });
    expect(await copyButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test("developers quickstart: steps link down to their full reference entries", async ({ page }) => {
    await page.goto("/developers");
    const quickstart = page.locator("#quickstart");
    await expect(quickstart.getByRole("link", { name: "POST /codes" })).toHaveAttribute(
      "href",
      "#create-code",
    );
    // Regex, not a string literal: lib/e2e-safety.test.ts's static scan
    // flags a hardcoded uppercase run inside e2e/'s SLUG_CHARSET as a
    // potential real-slug literal; "PATCH" is an HTTP method, not a slug,
    // exempt by construction as a regex (same "PATCH"/"QRCDN" precedent
    // already used elsewhere in this file).
    await expect(quickstart.getByRole("link", { name: /PATCH \/codes/ })).toHaveAttribute(
      "href",
      "#update-code",
    );
    await expect(
      quickstart.getByText("Scan the same print again. New destination, same code."),
    ).toBeVisible();
  });

  test("developers reference: every endpoint renders a parameters table", async ({ page }) => {
    await page.goto("/developers");
    // The 5 real endpoints under app/api/v1/** as of P9.5-T5 (verified
    // against the actual route handlers, not assumed): list/create/get/
    // update codes, plus per-code analytics.
    for (const id of ["list-codes", "create-code", "get-code", "update-code", "code-analytics"]) {
      const endpoint = page.locator(`#${id}`);
      await expect(endpoint.getByText("Parameters", { exact: true })).toBeVisible();
      await expect(endpoint.locator("table").first()).toBeVisible();
      await expect(endpoint.getByText("Response fields", { exact: true })).toBeVisible();
      await expect(endpoint.getByText("Errors", { exact: true })).toBeVisible();
    }
  });

  test("developers reference: the 404 property is documented as a feature", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByText("By design", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Ownership and nonexistence look identical from the outside, on purpose."),
    ).toBeVisible();
  });

  test("pricing h1: renders without opacity:0 in served HTML (P9.5-T5 rider)", async ({ request }) => {
    // Same technique as the hero h1 test above: raw served bytes, not a
    // post-hydration computed style. SectionHeading defaults to a
    // scroll-triggered Reveal, which SSRs a static opacity:0 on whatever
    // it wraps. /pricing's own doc comment now says reveal={false} on this
    // one call for exactly this reason (P9.5-T4 flagged the gap; T5 closes
    // it).
    const response = await request.get("/pricing");
    const html = await response.text();
    const h1Match = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/);
    expect(h1Match, "expected an <h1> in the served HTML").toBeTruthy();
    expect(h1Match?.[0]).not.toMatch(/opacity\s*:\s*0(?!\.)/);
    expect(h1Match?.[0]).toContain("Two plans");
  });

  // P9.7-U1: the whole-document version of the two h1-scoped opacity checks
  // above. `SectionHeading`/`SectionBody` no longer ship a `Reveal`
  // (motion/react whileInView) wrapper at all — the CSS `section-reveal`
  // keyframes replacing it never render `opacity:0` as markup on ANY of
  // the ~40+ reveal wrappers the landing renders, not just the hero/page
  // h1. Raw served HTML via request.get(), not a rendered page: the actual
  // bytes the server sent, same technique as the h1-scoped tests above.

  test("/ never SSRs opacity:0 anywhere in the document (P9.7-U1)", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();
    expect(html).not.toMatch(/opacity\s*:\s*0(?!\.)/);
  });

  // P9.9-C0.6 (board directive, superseding C0.5's marketing-only scope the
  // same day): the WHOLE product is dark-only. A visitor whose OS prefers
  // LIGHT must get the dark register everywhere — marketing, auth, and the
  // public studio alike. The `dark` class is server-rendered (static in the
  // root layout, no theme provider), so it must be present in the html
  // element's class list before any client JS runs; `color-scheme` follows
  // from the `html { color-scheme: dark }` rule; the body paints dark off
  // the `.dark` tokens.
  test("the whole product renders dark for a light-preference visitor (P9.9-C0.6)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    try {
      for (const path of ["/", "/pricing", "/login", "/studio"]) {
        await page.goto(path);
        const { hasDarkClass, scheme, bodyBg } = await page.evaluate(() => ({
          hasDarkClass: document.documentElement.classList.contains("dark"),
          scheme: getComputedStyle(document.documentElement).colorScheme,
          bodyBg: getComputedStyle(document.body).backgroundColor,
        }));
        expect(hasDarkClass, `${path} static dark class`).toBe(true);
        expect(scheme, `${path} UA color-scheme`).toBe("dark");
        expect(bodyBg, `${path} body background`).not.toBe("rgb(255, 255, 255)");
      }
    } finally {
      await context.close();
    }
  });

  // The static class is in the SERVER-RENDERED bytes, not applied by a
  // client script: no theme flash is possible even pre-hydration / JS-off.
  test("the dark class ships in the raw served HTML (P9.9-C0.6)", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();
    expect(html).toMatch(/<html[^>]*class="[^"]*\bdark\b[^"]*"/);
  });

  test("/pricing never SSRs opacity:0 anywhere in the document (P9.7-U1)", async ({ request }) => {
    const response = await request.get("/pricing");
    const html = await response.text();
    expect(html).not.toMatch(/opacity\s*:\s*0(?!\.)/);
  });

  test("/login never SSRs opacity:0 anywhere in the document (P9.7 close-out)", async ({
    request,
  }) => {
    // The close-out audit found /login was the one page still shipping the
    // pattern: the motion `Reveal` around the sign-in card SSR'd it at
    // opacity:0, so the card was invisible pre-hydration and with JS off —
    // while the round's own claim said "every page ships zero opacity:0".
    // The card now uses the CSS `.mount-enter` pattern; this sweep keeps it
    // that way. (Also exercises the auth_error branch, which renders a
    // server-visible error line that used to be a motion element too.)
    const response = await request.get("/login?auth_error=link_invalid");
    const html = await response.text();
    expect(html).not.toMatch(/opacity\s*:\s*0(?!\.)/);
    expect(html).toContain("Sign in or sign up");
  });

  // P9.5-T-F1: the two feature pages (/features/dynamic-codes,
  // /features/analytics) and the landing doorways that now point at them.

  test("features/dynamic-codes: renders the hero h1 and one section body marker", async ({
    page,
  }) => {
    await page.goto("/features/dynamic-codes");
    await expect(
      page.getByRole("heading", { level: 1, name: "Repoint anything you have printed" }),
    ).toBeVisible();
    // A section-body marker distinct from the hero: the RetargetPlate island
    // (S2), the same reused component the landing's own #dynamic-codes
    // section renders — proves the page composes it, not a copy. P9.10-D5
    // retired the theatre's `role="img"` stage (its bezier wires went with
    // it), so the marker is the plate's own constant, which only that
    // component draws.
    await expect(page.getByText("qrcdn.com/cafe")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Point the code at yourcafe.com/menu" }),
    ).toBeVisible();
  });

  test("features/dynamic-codes: honest plan table and FAQ render", async ({ page }) => {
    await page.goto("/features/dynamic-codes");
    await expect(page.getByRole("heading", { name: "What each plan holds" })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByText(String(PLAN_LIMITS.free.dynamicCodes), { exact: true })).toBeVisible();
    await expect(table.getByText(String(PLAN_LIMITS.pro.dynamicCodes), { exact: true })).toBeVisible();
    await expect(page.getByText("How fast is a retarget?")).toBeVisible();
  });

  test("features/analytics: renders the hero h1 and one section body marker", async ({ page }) => {
    await page.goto("/features/analytics");
    await expect(
      page.getByRole("heading", { level: 1, name: "Every scan, counted honestly" }),
    ).toBeVisible();
    // Section-body marker: DashboardWindow (S1), reused as-is from the
    // landing's own #analytics section.
    await expect(page.getByText("Scan activity")).toBeVisible();
  });

  test("features/analytics: retention line and FAQ render from entitlements", async ({ page }) => {
    await page.goto("/features/analytics");
    await expect(page.getByRole("heading", { name: "History that matches your plan" })).toBeVisible();
    await expect(
      page.getByText(
        `Free keeps ${PLAN_LIMITS.free.analyticsRetentionDays} days of scan history`,
        { exact: false },
      ),
    ).toBeVisible();
    await expect(page.getByText("Do you use cookies or fingerprinting?")).toBeVisible();
    await expect(page.getByRole("link", { name: "per-code series and breakdowns" })).toHaveAttribute(
      "href",
      "/developers#code-analytics",
    );
  });

  // P9.5-T-F2: the second pair of feature pages (/features/brand-studio,
  // /features/access-controls) and the now-fully-live landing doorways.

  test("features/brand-studio: renders the hero h1 and one section body marker", async ({
    page,
  }) => {
    await page.goto("/features/brand-studio");
    await expect(
      page.getByRole("heading", { level: 1, name: "Design the code itself" }),
    ).toBeVisible();
    // A section-body marker distinct from the hero: GuardrailsPlot (S3),
    // the same reused component the landing's own guardrails section
    // renders — proves the page composes it, not a copy.
    await expect(
      page.getByRole("img", {
        name: "Threshold plot of the real decode campaign: passing and failing style combinations plotted by effective knockout ratio, against the warn and fail guardrail thresholds",
      }),
    ).toBeVisible();
  });

  test("features/brand-studio: honest plan table, truth-gate G1 copy, and FAQ render", async ({
    page,
  }) => {
    await page.goto("/features/brand-studio");
    await expect(page.getByRole("heading", { name: "What each plan holds" })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByText(String(PLAN_LIMITS.free.brandKits), { exact: true })).toBeVisible();
    await expect(table.getByText(String(PLAN_LIMITS.free.dynamicCodes), { exact: true })).toBeVisible();
    await expect(table.getByText(String(PLAN_LIMITS.pro.dynamicCodes), { exact: true })).toBeVisible();
    // TRUTH-GATE G1 (warn-only, does not block export) — proven against
    // studio-shell.tsx/controls-rail.tsx, see this page's own file header.
    // Standing regression guard: the shipped copy must keep matching the
    // variant the source actually proves.
    await expect(page.getByText("warns before you export, while you decide")).toBeVisible();
    await expect(page.getByText("Can a logo break my code?")).toBeVisible();
  });

  test("features/access-controls: renders the hero h1 and one section body marker", async ({
    page,
  }) => {
    await page.goto("/features/access-controls");
    await expect(
      page.getByRole("heading", { level: 1, name: "Decide who gets through" }),
    ).toBeVisible();
    // Section-body marker: StateCards' password card (S1, `only="password"`).
    await expect(page.getByText("This code is password-protected.")).toBeVisible();
    // The expired card, whose status pill imports `statusMeta` from the real
    // dashboard so it can never drift from what /codes renders. This
    // assertion moved here when the card left the landing at P9.7-V4 — the
    // close-out audit found it had been dropped rather than moved, leaving
    // the statusMeta coupling untested on every surface.
    await expect(page.getByText("Expired", { exact: true })).toBeVisible();
  });

  test("features/access-controls: truth-gate mono lines, honest plan table, and FAQ render", async ({
    page,
  }) => {
    await page.goto("/features/access-controls");
    // TRUTH-GATE G2 (variant A: server-checked, destination absent from the
    // gate's HTML) — proven against workers/redirect/src/responses.ts +
    // app/p/[slug]/{page,actions}.ts, see this page's own file header.
    await expect(
      page.getByText("password checked server-side · destination never in the gate's HTML"),
    ).toBeVisible();
    // TRUTH-GATE G3 — the real vanity-slug charset/length rule, read from
    // lib/slug.ts. MAX_SLUG_LENGTH imported (not hand-typed) so this
    // verbatim-string assertion can never silently drift from the page's
    // own interpolated MonoStrip text (P9.8-B3).
    await expect(
      page.getByText(`4-${MAX_SLUG_LENGTH} chars · charset skips 0 O 1 I L U · reserved words blocked`),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "What each plan holds" })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByText("Included", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("What if someone forgets the password?")).toBeVisible();
    // TRUTH-GATE G4 — an expired code is revived by clearing/extending its
    // expiry, read from lib/codes-core.ts + lib/validation.ts + lib/access.ts.
    await expect(page.getByText("Can an expired code come back?")).toBeVisible();
    await expect(
      page.getByText("Clear or extend its expiry and the code picks up exactly where it left off"),
    ).toBeVisible();
  });

  test("landing doorways: all four /features/* doorways are live", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("#dynamic-codes").getByRole("link", { name: "Explore dynamic codes" }),
    ).toHaveAttribute("href", "/features/dynamic-codes");
    // P9.7-V4: the access-controls doorway used to sit in #dynamic-codes as a
    // second link. Access controls has its own section now, so the doorway
    // went with it. That section carries no id, so it is located by heading.
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Control who can visit" }) })
        .getByRole("link", { name: "Explore access controls" }),
    ).toHaveAttribute("href", "/features/access-controls");
    // Analytics.
    await expect(
      page.locator("#analytics").getByRole("link", { name: "Explore analytics" }),
    ).toHaveAttribute("href", "/features/analytics");
    // P9.9-C2: the brand-studio doorway is down to ONE call site (section
    // 04). The restaged #studio section closes on the /studio product CTA
    // instead — asserted in the studio-dials test, not here.
    await expect(
      page.locator("#brand-system").getByRole("link", { name: "Explore the brand studio" }),
    ).toHaveAttribute("href", "/features/brand-studio");
  });

  // P9.5-T6: /changelog + its RSS feed (both read the same lib/changelog.ts
  // array the test imports directly, so this proves the rendered page and
  // feed against the actual data rather than a hand-copied expectation),
  // plus the new footer/developers repo links (Changelog, Status, GitHub).

  test("changelog: renders the head/lede and every entry with its real date and tags", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.getByRole("heading", { level: 1, name: "What changed, when" })).toBeVisible();
    await expect(
      page.getByText("Real dates, real changes, written as they shipped. No backfilled marketing."),
    ).toBeVisible();

    // Every entry from the single source of truth renders, anchored at its
    // own id, with its real date and full summary sentence — not a
    // truncated or re-typed copy.
    for (const entry of CHANGELOG_ENTRIES) {
      const row = page.locator(`#${entry.id}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(entry.summary);
      await expect(row.locator("time")).toHaveAttribute("datetime", entry.date);
    }

    // Public-safety rule re-checked at the rendered-page level (data-level
    // coverage already lives in lib/changelog.test.ts): no internal phase
    // code like "P6" or "T3a" ever reaches served HTML.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bP\d{1,2}(?:\.\d)?-[A-Z]/);
  });

  test("changelog/rss.xml: a valid feed carrying every entry as an item", async ({ request }) => {
    const response = await request.get("/changelog/rss.xml");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("xml");
    const body = await response.text();
    expect(body).toContain('<rss version="2.0">');
    // Regex, not a string literal: lib/e2e-safety.test.ts's static scan
    // flags "QRCDN" as an isolated uppercase run inside e2e/'s
    // SLUG_CHARSET (Q/R/C/D/N are all in it) as a potential real-slug
    // literal. It's the product name, not a slug, but a regex literal is
    // exempt by construction (never a value sent anywhere) rather than
    // needing an allowlist entry for a false positive (same "PATCH"/"QRCDN"
    // precedent already used elsewhere in this file).
    expect(body).toMatch(/<title>QRCDN changelog<\/title>/);
    for (const entry of CHANGELOG_ENTRIES) {
      expect(body).toContain(`#${entry.id}`);
      expect(body).toContain(entry.summary);
    }
  });

  test("footer: Changelog, Status, and GitHub links render with real hrefs", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Changelog" })).toHaveAttribute("href", "/changelog");
    await expect(footer.getByRole("link", { name: "Status" })).toHaveAttribute(
      "href",
      "https://status.qrcdn.com",
    );
    // Regex, not a string literal, for the same e2e-safety reason as the
    // RSS title assertion above: "QRCDN" is an isolated uppercase run
    // inside the slug charset.
    await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/willgibs\/QRCDN$/,
    );
  });

  test("developers: a repo link to GitHub renders near the intro", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByRole("link", { name: "View the source on GitHub" })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/willgibs\/QRCDN$/,
    );
  });

  // P9.5-T-R: nav/footer evolution (Features dropdown, Docs rename, Blog
  // link, the full footer resource map) and the new /blog + /help surfaces.

  test("nav: Features dropdown opens with the 4 feature links, Docs/Pricing/Blog stay plain links", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Primary" });
    // "API" renamed to "Docs," same /developers destination.
    await expect(nav.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/developers");
    await expect(nav.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    await expect(nav.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");

    await nav.getByRole("button", { name: "Features" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Dynamic codes" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Brand studio" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Analytics" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Access controls" })).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveCount(4);

    await menu.getByRole("menuitem", { name: "Access controls" }).click();
    await expect(page).toHaveURL(/\/features\/access-controls$/);
  });

  test("nav mobile: the disclosure mirrors Features + Docs/Pricing/Blog flat, no submenu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const disclosure = page.locator("#site-nav-disclosure");
    // All 7 items are plain sibling links (never nested inside a
    // role="menu") — that IS "flat": no Radix dropdown re-appears here.
    await expect(disclosure.getByRole("menu")).toHaveCount(0);
    const flatLinks = [
      "Dynamic codes",
      "Brand studio",
      "Analytics",
      "Access controls",
      "Docs",
      "Pricing",
      "Blog",
    ];
    for (const label of flatLinks) {
      await expect(disclosure.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("footer: full resource map renders (Product/Resources/Open source/Legal)", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    // Product: the 4 feature pages + Pricing + Studio. exact: true
    // throughout — role-name matching is substring-based by default, and
    // "Studio" alone would otherwise also match "Brand studio"'s link.
    for (const [label, href] of [
      ["Dynamic codes", "/features/dynamic-codes"],
      ["Brand studio", "/features/brand-studio"],
      ["Analytics", "/features/analytics"],
      ["Access controls", "/features/access-controls"],
      ["Pricing", "/pricing"],
      ["Studio", "/studio"],
    ] as const) {
      await expect(footer.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    }

    // Resources: Docs, Help, Blog, Changelog, Status.
    await expect(footer.getByRole("link", { name: "Docs", exact: true })).toHaveAttribute(
      "href",
      "/developers",
    );
    await expect(footer.getByRole("link", { name: "Help", exact: true })).toHaveAttribute("href", "/help");
    await expect(footer.getByRole("link", { name: "Blog", exact: true })).toHaveAttribute("href", "/blog");

    // Open source: GitHub, License, Security (real repo files, not
    // in-app pages — regex literals for the "QRCDN" e2e-safety reason
    // this file's own GitHub assertions already establish).
    await expect(footer.getByRole("link", { name: "License", exact: true })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/willgibs\/QRCDN\/blob\/main\/LICENSE$/,
    );
    await expect(footer.getByRole("link", { name: "Security", exact: true })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/willgibs\/QRCDN\/blob\/main\/SECURITY\.md$/,
    );

    // Legal: unchanged.
    await expect(footer.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute(
      "href",
      "/terms",
    );
    await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  test("blog index: renders every post from BLOG_POSTS with its real date, dek, and tags", async ({
    page,
  }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1, name: "How this actually works" })).toBeVisible();
    for (const post of BLOG_POSTS) {
      await expect(page.getByRole("link", { name: post.title })).toHaveAttribute(
        "href",
        `/blog/${post.slug}`,
      );
      // exact: true — the dek's own <p> has no other content, unlike its
      // <li> ancestor (date + tags + title + dek combined), which would
      // otherwise also satisfy a non-exact substring match.
      await expect(page.getByText(post.dek, { exact: true })).toBeVisible();
      for (const tag of post.tags) {
        await expect(page.getByText(tag, { exact: true }).first()).toBeVisible();
      }
    }
  });

  test("blog post: renders byline, date, tags, and every [V] pull-quote verbatim", async ({ page }) => {
    const post = BLOG_POSTS.find((p) => p.slug === "what-actually-scans")!;
    await page.goto(`/blog/${post.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();
    // `exact: true` throughout this test: Playwright's text engine matches
    // every ANCESTOR whose subtree also contains the target string (e.g.
    // the byline row's own wrapper div contains "Will Gibson · August 1,
    // 2026" as one string, which trivially contains "Will Gibson" as a
    // substring too) — exact match against a leaf whose own full text
    // equals the target is what disambiguates a single element instead of
    // strict-mode-violating across parent and child.
    await expect(page.getByText("Will Gibson", { exact: true })).toBeVisible();
    await expect(page.locator("time")).toHaveAttribute("datetime", post.date);
    for (const tag of post.tags) {
      await expect(page.getByText(tag, { exact: true })).toBeVisible();
    }
    // The deck's own [V] line, byte-verbatim, rendered as its own
    // blockquote (whose full text equals the quote exactly, unlike its
    // <article> ancestor).
    await expect(
      page.getByText(
        "A QR code that scans on your monitor and dies on a menu is worse than an ugly one.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "← Back to the blog" })).toHaveAttribute("href", "/blog");
  });

  test("blog: an unknown slug 404s", async ({ page }) => {
    const response = await page.goto("/blog/not-a-real-post");
    expect(response?.status()).toBe(404);
  });

  test("blog/rss.xml: a valid feed carrying every real post", async ({ request }) => {
    const response = await request.get("/blog/rss.xml");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("xml");
    const body = await response.text();
    expect(body).toContain('<rss version="2.0">');
    // Regex, not a string literal — same e2e-safety reason as the
    // changelog feed's own title assertion.
    expect(body).toMatch(/<title>QRCDN blog<\/title>/);
    for (const post of BLOG_POSTS) {
      expect(body).toContain(`/blog/${post.slug}`);
      expect(body).toContain(post.title);
    }
  });

  test("help index: every category renders with its real articles", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: "Quick answers, not a maze" })).toBeVisible();
    for (const category of HELP_CATEGORIES) {
      await expect(page.getByRole("heading", { name: category })).toBeVisible();
    }
    for (const article of HELP_ARTICLES) {
      await expect(page.getByRole("link", { name: article.title })).toHaveAttribute(
        "href",
        `/help/${article.slug}`,
      );
    }
  });

  test("help article: renders numbered Do-it steps, a What-to-expect note, and cross-links", async ({
    page,
  }) => {
    const article = HELP_ARTICLES.find((a) => a.slug === "create-a-dynamic-code")!;
    await page.goto(`/help/${article.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: article.title })).toBeVisible();
    await expect(page.getByText("Do it", { exact: true })).toBeVisible();
    await expect(page.getByText("What to expect", { exact: true })).toBeVisible();
    // Scoped to `ol > li` (not a bare getByText(step)): each step's text
    // sits inside a <span> nested in a numbered <li>, and Playwright's text
    // engine matches every ancestor whose subtree contains the string too,
    // so an unscoped getByText(step) strict-mode-violates against both the
    // <li> and its inner <span>. Indexed .nth() locators avoid that.
    const steps = page.locator("ol > li");
    await expect(steps).toHaveCount(article.doIt.length);
    for (const [i, step] of article.doIt.entries()) {
      await expect(steps.nth(i)).toContainText(step);
    }
    for (const link of article.crossLinks) {
      await expect(page.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
    await expect(page.getByRole("link", { name: "← All help articles" })).toHaveAttribute("href", "/help");
  });

  test("help: the account-deletion article states the honest current path (hello@, not self-serve)", async ({
    page,
  }) => {
    const article = HELP_ARTICLES.find((a) => a.slug === "delete-your-account-and-your-data")!;
    await page.goto(`/help/${article.slug}`);
    // Same ol>li scoping as the create-a-dynamic-code test above — this is
    // the T-R deck's own truth-check target: the deletion path is a
    // request to hello@, not a self-serve flow, verified against the real
    // (app) routes (no /settings or /account page exists) before writing
    // this article, so the rendered page must say so plainly, not imply a
    // product button that doesn't exist.
    // Regex literal, not a string literal, for "hello@qrcdn.com" — same
    // e2e-safety reason as this file's other hello@/GitHub assertions
    // (lib/e2e-safety.test.ts's static scan flags any bare email-shaped
    // string literal that isn't an e2e.qrcdn.test fixture address; a
    // regex is exempt by construction, since it's never a value sent
    // anywhere, only a pattern matched against already-rendered content).
    const steps = page.locator("ol > li");
    await expect(steps.nth(0)).toContainText(/hello@qrcdn\.com/);
    await expect(steps.nth(1)).toContainText("Self-serve deletion isn't in the product yet");
    // Tag-scoped `p` locator + hasText: restricts candidates to actual <p>
    // elements (the whatToExpect paragraph is the only one on this page
    // with this substring), sidestepping the ancestor-also-matches
    // behavior a bare getByText would hit here (a bare substring, not this
    // <p>'s full exact text, so `exact: true` alone wouldn't disambiguate).
    await expect(
      page.locator("p", { hasText: "permanently removed at the database level" }),
    ).toHaveCount(1);
  });

  test("help: an unknown slug 404s", async ({ page }) => {
    const response = await page.goto("/help/not-a-real-article");
    expect(response?.status()).toBe(404);
  });

  // P9.5-T8 item 1 — the phase's one real remaining proof gap (the ascent
  // spec's own scope-reality check: grepping every e2e spec for
  // shiki/highlight returned nothing before this unit). lib/highlight.ts's
  // whole claim is server-side syntax highlighting with zero client shiki
  // chunks (`import "server-only"` as its first line, verified by hand at
  // T1b/T3c/T5 via a post-build grep each time — see docs/STATUS.md). Two
  // tests close the gap: the markup actually reaching the browser in the
  // server response, and shiki itself never reaching a client bundle.

  test("developers: shiki-highlighted markup is present in the raw served HTML", async ({
    request,
  }) => {
    // request.get(), not page.goto(): the actual bytes the server sent,
    // not a post-hydration DOM a client script could in theory have
    // rewritten — same technique as the hero/pricing h1 opacity tests
    // above. /developers is the CodeBlock-heaviest static page (Quickstart
    // + the full endpoint reference), so a regression anywhere in the
    // highlighting pipeline shows up here.
    //
    // The asserted shape is the REAL emitted one, read off lib/code-theme.ts
    // (the shiki theme) and confirmed against lib/highlight.test.ts's own
    // snapshot and the actual prerendered .next/server/app/developers.html
    // — not a guessed class name: shiki wraps output in
    // `<pre class="shiki qrcdn-code" ...>` and colors every token with an
    // inline `style="color:var(--code-KIND)"` span. A plain, unhighlighted
    // `<pre><code>{code}</code></pre>` (what CodeBlock would emit if
    // `highlight()` stopped highlighting and just returned escaped text)
    // satisfies neither assertion below — proven directly, not assumed:
    // this test was run against a temporarily stubbed lib/highlight.ts
    // that returned exactly that plain shape, failed on both assertions,
    // then the stub was reverted and this test re-confirmed green. See
    // this unit's report for the captured failure output.
    const response = await request.get("/developers");
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('class="shiki qrcdn-code"');
    // At least one real per-token color span, not just the frame class
    // above — the frame class alone would still be true of an empty or
    // unhighlighted-but-relabeled block, so this is the actual proof that
    // individual tokens were colored.
    expect(html).toMatch(/<span style="color:var\(--code-[a-z-]+\)">/);
  });

  test("no shiki client chunk ships to the browser (server-only highlighting)", async () => {
    // Companion to the test above, and the design guide's "zero client
    // chunks" claim for shiki made into a standing check instead of a
    // manual per-unit grep. `.next/static/chunks/**` is what the browser
    // actually downloads; `.next/server/**` is server-only render output
    // and legitimately DOES contain "shiki" (the prerendered HTML itself,
    // including the very markup the test above asserts on) — this check
    // is scoped to the client directory specifically, never the server one.
    //
    // Filesystem read, not a page fetch: safe because `next build` always
    // runs as its own CI step immediately before `next start`/this suite
    // in the same job (.github/workflows/e2e.yml: `pnpm --filter web
    // build` then `pnpm --filter web test:e2e`), and playwright.config.ts's
    // own `webServer` comment already documents that this suite never
    // builds the app itself — only starts an already-built one. So
    // `.next/static/chunks` is guaranteed to exist and reflect the exact
    // build this suite is testing.
    const chunksDir = join(__dirname, "..", ".next", "static", "chunks");
    const files = collectFiles(chunksDir);
    // Canary: if this ever reports a handful of files or fewer, something
    // is wrong with the path/build (wrong directory, a build that didn't
    // actually run) and the assertion below would pass by finding nothing
    // to check rather than because the codebase is clean — the same
    // "don't ship a silently-vacuous check" discipline
    // lib/no-em-dash.test.ts's own canary test already established.
    expect(files.length).toBeGreaterThan(10);

    const offenders = files
      .filter((file) => readFileSync(file, "utf8").includes("shiki"))
      .map((file) => relative(chunksDir, file));
    expect(offenders, `shiki leaked into client chunk(s): ${offenders.join(", ")}`).toEqual([]);
  });
});
