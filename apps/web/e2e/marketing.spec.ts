import { test, expect } from "./fixtures";
import { PLAN_LIMITS, PRICING } from "../lib/entitlements";

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

const PUBLIC_PAGES = ["/", "/pricing", "/terms", "/privacy", "/developers"] as const;

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

  test("nav CTA: Start free lands on /login", async ({ page }) => {
    await page.goto("/");
    // Scoped to the page's one <header> (role=banner) — the landing page
    // repeats "Start free" in several sections (hero, playground, pricing
    // teaser); the nav's is the one this test means.
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
    // to its column headers.
    for (const band of [
      "Codes & limits",
      "Design & export",
      "Analytics",
      "Access controls",
      "API & bulk",
    ]) {
      await expect(page.getByText(band, { exact: true })).toBeVisible();
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
  });

  test("landing playground opens scannable (print-truth default, d2af287)", async ({ page }) => {
    await page.goto("/");
    // Scoped to the Playground section specifically — P9.5-T3b's
    // RetargetTheatre (section 04) also renders a role="status" region (its
    // destination readout), so an unscoped role query would match more than
    // one element and trip Playwright's strict mode. Heading text is the
    // Copy deck v3 head, heads-v4 amendment (P9.5-T3c): "Try the studio
    // right here." — was "Design it here. It's yours." (T3a), before that
    // "Design one right now." (pre-T3a).
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Try the studio right here." }) });
    await expect(playgroundSection.getByRole("status")).toContainText(/scannable/i);
  });

  test("playground preset shelf: renders 3 presets and applies one", async ({ page }) => {
    await page.goto("/");
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Try the studio right here." }) });

    // All 3 named presets render (text-based, not role-based — avoids
    // coupling the test to Radix ToggleGroup's exact internal role choice).
    await expect(playgroundSection.getByText("Café Norte", { exact: true })).toBeVisible();
    await expect(playgroundSection.getByText("Second Story", { exact: true })).toBeVisible();
    await expect(playgroundSection.getByText("Personal", { exact: true })).toBeVisible();

    // Clicking one actually applies it: Café Norte's sizeRatio (0.88) shows
    // up in the Module size readout once the ~300ms control transition
    // settles (Playwright's toBeVisible auto-retries past that).
    await playgroundSection.getByText("Café Norte", { exact: true }).click();
    await expect(playgroundSection.getByText("88%", { exact: true })).toBeVisible();
  });

  test("dynamic codes: RetargetTheatre responds to a tap and state-cards render", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#dynamic-codes");

    // Three destination chips, hue-labeled per destination-hues.ts.
    const chips = section.getByRole("button", { name: /Retarget the code to/ });
    await expect(chips).toHaveCount(3);

    // Idle hint shows before any tap.
    await expect(section.getByText("tap a destination")).toBeVisible();

    // Tapping a chip flips the destination readout beneath the stage —
    // wait for the packet travel (≤800ms per spec) to land.
    const first = chips.first();
    const label = await first.getAttribute("aria-label");
    await first.click();
    await expect(section.getByText(/302 · no-store ·/)).toBeVisible({ timeout: 2000 });
    if (label) {
      const destination = label.replace("Retarget the code to ", "");
      await expect(section.getByText(`302 · no-store · ${destination}`)).toBeVisible();
    }

    // The retired hero tagline's new home. Exact match: the section's own
    // lede ("...and the printed code never changes. Pause it...") contains
    // this exact phrase as a substring, which a non-exact getByText also
    // matches — a real strict-mode violation caught by CI, not a feature bug.
    await expect(section.getByText("the printed code never changes", { exact: true })).toBeVisible();

    // Truthful state-cards: /u fallback, /p gate, dashboard "Expired" pill.
    await expect(section.getByText(/^\/u\//)).toBeVisible();
    await expect(section.getByText(/^\/p\//)).toBeVisible();
    await expect(section.getByText("Expired")).toBeVisible();
  });

  test("analytics window: breakdown rows and retention row render from entitlements", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#analytics");
    await expect(section.getByText("Top countries")).toBeVisible();
    await expect(section.getByText("Devices")).toBeVisible();
    await expect(section.getByText("Today so far")).toBeVisible();
    await expect(
      section.getByText(
        `${PLAN_LIMITS.free.analyticsRetentionDays}-day history free · ${PLAN_LIMITS.pro.analyticsRetentionDays}-day + city-level on Pro`,
      ),
    ).toBeVisible();
  });

  // P9.5-T3c: the four sections that complete the 01-11 ordinal sequence.

  test("guardrails: the threshold plot renders with two threshold lines", async ({ page }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "We measured what actually scans." }) });

    // Scoped to its own accessible name, not just "svg" — the section also
    // carries two decorative ModuleMark svgs (the Eyebrow glyph and the
    // MonoStrip icon below), so an unscoped `section.locator("svg")` over-
    // matches at 3 elements instead of the one real plot.
    const plot = section.getByRole("img", { name: /Threshold plot of the real decode campaign/ });
    await expect(plot).toHaveCount(1);
    // The two dashed warn/fail threshold lines are the only <line> elements
    // carrying a stroke-dasharray (axis baseline + tick marks are solid).
    await expect(plot.locator("line[stroke-dasharray]")).toHaveCount(2);

    // The pass/fail dot-legend sits in the figure's first <div> (a sibling
    // BEFORE the plot-frame div that wraps the svg), so scoping there keeps
    // this off the svg's own "fail" threshold-line label entirely — an
    // unscoped `section.getByText("fail", { exact: true })` strict-mode-
    // violates at 2 elements (the legend's "fail" span AND the svg's <text>
    // label both have "fail" as their exact trimmed content). "pass" has no
    // svg-internal counterpart (only "warn"/"fail" label the threshold
    // lines), so it happened to resolve to 1 match either way — scoped here
    // too anyway, for the same reason and so the two assertions read as a
    // matched pair rather than one accidentally-safe and one not.
    const legend = section.locator("figure > div").first();
    await expect(legend.getByText("pass", { exact: true })).toBeVisible();
    await expect(legend.getByText("fail", { exact: true })).toBeVisible();

    await expect(
      section.getByText(
        "160+ style combinations · 2 adversarial decode campaigns · warn 0.395 · fail 0.412",
      ),
    ).toBeVisible();
  });

  test("API console: clicking a tab switches the visible pane", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#api");

    // Create is the default pane (POST /codes).
    await expect(section.getByRole("tabpanel", { name: "Create" })).toBeVisible();
    await expect(section.getByRole("tabpanel", { name: "Create" })).toContainText("POST");

    await section.getByRole("tab", { name: "Retarget" }).click();
    const retargetPanel = section.getByRole("tabpanel", { name: "Retarget" });
    await expect(retargetPanel).toBeVisible();
    // Regex, not a string literal — lib/e2e-safety.test.ts's static scan
    // flags any hardcoded uppercase run inside e2e/'s SLUG_CHARSET as a
    // potential real-slug literal; "PATCH" is an HTTP method, not a slug,
    // but a regex literal is exempt by construction (never a value sent
    // anywhere) rather than needing an allowlist entry for a false positive.
    await expect(retargetPanel).toContainText(/PATCH/);
    await expect(section.getByRole("tab", { name: "Retarget" })).toHaveAttribute("aria-selected", "true");
    await expect(section.getByRole("tab", { name: "Create" })).toHaveAttribute("aria-selected", "false");
  });

  test("comparison: renders 4 columns and the load-bearing footnote", async ({ page }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Not another QR generator." }) });

    // Review round 1 split the table into two DOM variants (mobile QRCDN-
    // first, desktop QRCDN-last), toggled via md:hidden / hidden md:block —
    // `:visible` picks whichever one the current viewport is actually
    // showing (desktop, at this suite's default viewport) rather than
    // matching both and strict-mode-violating.
    const table = section.locator("table:visible");
    // 4 real columns + 1 blank corner cell above the row labels.
    await expect(table.locator("thead th")).toHaveCount(5);
    for (const column of [
      "Free QR generators",
      "Link-shortener add-ons",
      "Enterprise QR platforms",
    ]) {
      await expect(table.getByText(column, { exact: true })).toBeVisible();
    }
    // "QRCDN" as a regex, not a string literal — lib/e2e-safety.test.ts's
    // static scan flags any hardcoded uppercase run inside e2e/'s
    // SLUG_CHARSET as a potential real-slug literal; the product name isn't
    // a slug, but a regex literal is exempt by construction rather than
    // needing an allowlist entry for a false positive (same reasoning as
    // the /PATCH/ regex above).
    await expect(table.getByText(/^QRCDN$/)).toBeVisible();
    // Footnote is never omitted — deck copy verbatim.
    await expect(
      section.getByText("Category patterns, not claims about any specific vendor."),
    ).toBeVisible();
  });

  test("comparison: the elevated column leads the mobile order", async ({ page }) => {
    // Review round 1: the elevated column has to be visible without
    // scrolling on a narrow viewport, so mobile reorders it first (desktop
    // keeps the deck's own QRCDN-last order — covered by the test above).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Not another QR generator." }) });

    const table = section.locator("table:visible");
    // Header index 0 is the blank corner cell above the row labels; index 1
    // is the first real data column — "QRCDN" regex for the same
    // e2e-safety reason as the desktop test above.
    await expect(table.locator("thead th").nth(1)).toHaveText(/^QRCDN$/);
  });

  test("open-source: #open-source anchor exists and the pillar strip chip points to it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#open-source")).toBeVisible();
    await expect(
      page.locator("#open-source").getByRole("heading", { name: "Read the source." }),
    ).toBeVisible();

    const strip = page.locator('nav[aria-label="Jump to a section"]');
    await expect(strip.getByRole("link", { name: "open source" })).toHaveAttribute(
      "href",
      "#open-source",
    );
  });

  test("manifesto: three commitments present", async ({ page }) => {
    await page.goto("/");
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Your code never dies." }) });

    await expect(section.getByText("Free codes are never deactivated.")).toBeVisible();
    await expect(section.getByText("A downgrade makes codes read-only, never dead.")).toBeVisible();
    await expect(
      section.getByText("Redirects run at the edge, independent of our app and database."),
    ).toBeVisible();
  });

  test("heads v4: the four amended section heads are live", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Try the studio right here." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every code inherits your kit." })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Change the destination after printing." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Free codes never stop redirecting." }),
    ).toBeVisible();
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

  test("pillar strip: renders 5 doorway links on desktop, hidden on mobile", async ({ page }) => {
    await page.goto("/");
    // Plain CSS locator, not getByRole — the mobile half of this test needs
    // to find the element even while `display:none` hides it from the
    // accessibility tree, which getByRole's matching can't guarantee.
    const strip = page.locator('nav[aria-label="Jump to a section"]');
    await expect(strip.getByRole("link")).toHaveCount(5);

    // Board round 5: hidden below md — it was pushing ScanNetwork/OrbitStage
    // down, and the board wants the orbit stage higher above the fold on
    // mobile. Unchanged (still 5 links) at the desktop viewport above.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(strip).toBeHidden();
  });

  test("hero tagline is removed", async ({ page }) => {
    // P9.5-T3a: the old "destination updated live..." mono caption under
    // the network/orbit artwork is gone from every breakpoint — its
    // content resurfaces inside section 04 instead (not asserted here,
    // T3b's job once that body copy lands).
    await page.goto("/");
    await expect(page.getByText("destination updated live")).toHaveCount(0);
  });
});
