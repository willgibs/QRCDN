import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "./fixtures";
import { PLAN_LIMITS, PRICING } from "../lib/entitlements";
import { CHANGELOG_ENTRIES } from "../lib/changelog";
import { BLOG_POSTS } from "../lib/blog";
import { HELP_ARTICLES, HELP_CATEGORIES } from "../lib/help";

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
    // to its column headers. Scoped to the comparison table specifically
    // (P9.5-T-R rider): "Analytics" and "Access controls" are now ALSO
    // SiteNav's Features-dropdown labels, present in the DOM (mirrored
    // flat into the mobile disclosure, `inert` when closed but still a
    // real DOM node — Playwright's locator resolution counts matches
    // regardless of `display:none`/`inert`, which only govern the
    // eventual visibility/focusability check on an already-unique
    // locator, not strict-mode's match COUNT) — an unscoped page-wide
    // getByText now strict-mode-violates on those two bands specifically.
    const table = page.getByRole("table");
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

  // P9.5-T-F1: the two feature pages (/features/dynamic-codes,
  // /features/analytics) and the landing doorways that now point at them.

  test("features/dynamic-codes: renders the hero h1 and one section body marker", async ({
    page,
  }) => {
    await page.goto("/features/dynamic-codes");
    await expect(
      page.getByRole("heading", { level: 1, name: "Repoint anything you have printed." }),
    ).toBeVisible();
    // A section-body marker distinct from the hero: the RetargetTheatre
    // island (S2), the same reused component the landing's own #dynamic-
    // codes section renders — proves the page composes it, not a copy.
    await expect(
      page.getByRole("img", { name: "A printed QR code with three destinations; tap one to retarget it" }),
    ).toBeVisible();
  });

  test("features/dynamic-codes: honest plan table and FAQ render", async ({ page }) => {
    await page.goto("/features/dynamic-codes");
    await expect(page.getByRole("heading", { name: "What each plan holds." })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByText(String(PLAN_LIMITS.free.dynamicCodes), { exact: true })).toBeVisible();
    await expect(table.getByText(String(PLAN_LIMITS.pro.dynamicCodes), { exact: true })).toBeVisible();
    await expect(page.getByText("How fast is a retarget?")).toBeVisible();
  });

  test("features/analytics: renders the hero h1 and one section body marker", async ({ page }) => {
    await page.goto("/features/analytics");
    await expect(
      page.getByRole("heading", { level: 1, name: "Every scan, counted honestly." }),
    ).toBeVisible();
    // Section-body marker: DashboardWindow (S1), reused as-is from the
    // landing's own #analytics section.
    await expect(page.getByText("Scan activity")).toBeVisible();
  });

  test("features/analytics: retention line and FAQ render from entitlements", async ({ page }) => {
    await page.goto("/features/analytics");
    await expect(page.getByRole("heading", { name: "History that matches your plan." })).toBeVisible();
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
      page.getByRole("heading", { level: 1, name: "Design the code itself." }),
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
    await expect(page.getByRole("heading", { name: "What each plan holds." })).toBeVisible();
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
      page.getByRole("heading", { level: 1, name: "Decide who gets through." }),
    ).toBeVisible();
    // Section-body marker: StateCards' password card (S1, `only="password"`).
    await expect(page.getByText("This code is password-protected.")).toBeVisible();
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
    // lib/slug.ts.
    await expect(
      page.getByText("4-30 chars · charset skips 0 O 1 I L U · reserved words blocked"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "What each plan holds." })).toBeVisible();
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
    // Section 04 (dynamic codes) now carries two doorways side by side.
    await expect(
      page.locator("#dynamic-codes").getByRole("link", { name: "Explore dynamic codes" }),
    ).toHaveAttribute("href", "/features/dynamic-codes");
    await expect(
      page.locator("#dynamic-codes").getByRole("link", { name: "Explore access controls" }),
    ).toHaveAttribute("href", "/features/access-controls");
    // Section 06 (analytics).
    await expect(
      page.locator("#analytics").getByRole("link", { name: "Explore analytics" }),
    ).toHaveAttribute("href", "/features/analytics");
    // Sections 02 (studio/playground) and 03 (brand system) both link to
    // the SAME /features/brand-studio page with identical link text
    // (BRAND_STUDIO_DOORWAY_ENABLED flips true for both call sites this
    // unit) — scoped per-section (#studio / #brand-system) since an
    // unscoped locator would strict-mode-violate across both matches.
    await expect(
      page.locator("#studio").getByRole("link", { name: "Explore the brand studio" }),
    ).toHaveAttribute("href", "/features/brand-studio");
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
    await expect(page.getByRole("heading", { level: 1, name: "What changed, when." })).toBeVisible();
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
      ["Studio", "/login"],
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
    await expect(page.getByRole("heading", { level: 1, name: "How this actually works." })).toBeVisible();
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
    await expect(page.getByRole("heading", { level: 1, name: "Quick answers, not a maze." })).toBeVisible();
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
