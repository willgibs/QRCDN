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
    // (SiteNav/SiteFooter) doesn't even wrap.
    await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
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
    // P9.5-T3a copy deck v3 head ("Design it here. It's yours." — was
    // "Design one right now." pre-T3a).
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Design it here. It's yours." }) });
    await expect(playgroundSection.getByRole("status")).toContainText(/scannable/i);
  });

  test("playground preset shelf: renders 3 presets and applies one", async ({ page }) => {
    await page.goto("/");
    const playgroundSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Design it here. It's yours." }) });

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

    // The retired hero tagline's new home.
    await expect(section.getByText("the printed code never changes")).toBeVisible();

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
