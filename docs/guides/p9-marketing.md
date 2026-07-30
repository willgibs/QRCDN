# P9 spec — Marketing site

Read alongside: `CLAUDE.md`, `docs/guides/agent-playbook.md`,
`docs/guides/design-system.md` (the design authority for this phase),
`docs/DECISIONS.md` (D1 hosts, D3 privacy, D4 rendering, D13 tokens, D14 pricing).
UI units additionally load `.agents/skills/emil-design-eng` before writing a line of
JSX and pass the `.agents/skills/review-animations` gate before commit.

## Mission

Replace the create-next-app scaffold at `www.qrcdn.com/` with the real storefront:
landing `/`, `/pricing`, `/terms`, `/privacy`, a designed 404, real identity
(icons + OG), robots/sitemap — then delete `/explore` after harvesting it. The product
behind this site is finished and proven (P4–P8); the storefront must meet the same bar.

**Not a from-scratch design phase.** Checkpoint A locked "Precision instrument"; the
v4.2 hero at `/explore/precision` is the codified quality floor and the landing seed.
The Resend-inspired treatment adopted at P4 was scoped "studio + primitives now,
marketing at P9": `ArtifactStage` is the designated marketing staging rig,
`AccentText` was built for P9 and is still unused, and glows may take user-content hue
while chrome stays violet-only.

## Board decisions (2026-07-30, locked — do not relitigate)

- **Pro CTA pre-Stripe:** "Start free" → `/login`; one honest line that paid upgrades
  open at launch. No waitlist, no hidden Pro column.
- **Core pages only.** FAQ = pricing page's trust accordion. Contact = footer mailto
  `hello@qrcdn.com` (ops rider: CEO sets up Cloudflare Email Routing apex forward →
  founder inbox — additive MX on the apex, no conflict with Resend's `send.` subdomain
  or the Worker, which is HTTP-only). `/developers` remains the docs page.
- **Legal drafted honestly now** (D3/D14-grounded), counsel review queued to P10.
- **`/explore` deleted at end of phase** (after harvest — see U5 migration table).
- **Anonymous playground download approved** (SVG/PNG of a visitor-styled static code,
  no account — rides on the plan approval).

## Voice

Canonical copy seed: `lib/explore.ts` `brandCopy.precision` — headline
"One code.\nEvery destination", tagline "QR infrastructure, engineered.", sub "Set your
brand's QR identity once. Every code inherits it — served from the edge, retargetable
forever, measured to the scan." Rules observed across every shipped surface: short
declaratives · no exclamation points · mono for technical accents · the
"your code never dies" motif (lowercase, mono, as sign-off) · honest about limits
("We cap features, never your printed codes") — never hype. Every plan number renders
from `lib/entitlements.ts` imports; retyping a limit anywhere is a defect.

## Route architecture (verified against bundled Next 16 docs this session)

- `app/(marketing)/` group under the **existing root layout** (single root layout — the
  multi-root-layout caveats don't apply). Group layout mounts `SiteNav` + `SiteFooter`;
  no data fetching, no dynamic APIs → all marketing pages must come out `○ (Static)` in
  `next build` output (check it).
- **Root 404**: `app/not-found.tsx`. Route-group layouts do NOT wrap it — it composes
  `SiteNav`/`SiteFooter` itself. Next auto-injects noindex on 404 responses; don't add
  a robots override.
- **Per-page metadata = `title` + `description` only.** Next's metadata merge is
  shallow — setting any part of `openGraph` on a page replaces the parent's whole
  object. File-based `opengraph-image.png` (+ `.alt.txt`) colocated per route owns the
  imagery; og:title/description fall back from page metadata automatically.
- **`metadataBase: new URL("https://www.qrcdn.com")`** in `app/layout.tsx` (D1: www is
  canonical; the Worker already 301s apex non-slugs to www).
- **Icons**: `app/icon.svg` (ModuleMark-derived, fixed sRGB hex — favicons have no CSS
  cascade; a `<style>` `prefers-color-scheme` block inside the SVG is allowed) +
  `app/apple-icon.png` (180×180 — apple-icon accepts no SVG). Stock `app/favicon.ico`
  is deleted, not kept as a third competing convention.
- **`proxy.ts` matcher** — the highest-risk edit of the phase. Metadata files must be
  excluded per Next's own proxy note; file-convention icons/OG serve at extensionless
  paths (`/icon`, `/apple-icon`, `/opengraph-image`), `sitemap.xml`/`robots.txt` at
  literal paths. Excluding `/` requires a bare `$` alternative in the negative
  lookahead (zero-width end-of-string — the only alternative that can match an empty
  remainder). Verify the current matcher in the file before editing; targets:

  U1 (interim — `/explore` still alive):
  ```
  /((?!_next/static|_next/image|favicon\.ico|icon|apple-icon|opengraph-image|sitemap\.xml|robots\.txt|explore|developers|u/[^/]+|p/[^/]+|api/v1|pricing|terms|privacy|$|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)
  ```
  U5 (final): same minus `explore|`.
- **U1 must not create `app/(marketing)/page.tsx`** — it would collide with the
  scaffold `app/page.tsx` (duplicate `/` = build error). The swap is U2's atomic move.

## Brand-image pipeline (U1, then reused by U3/U4)

`apps/web/scripts/generate-brand-images.ts`, run via `pnpm generate:brand-images`
(new devDeps on apps/web: `@resvg/resvg-js` — same version qr-engine pins — plus `tsx`
and `zxing-wasm`). This implements D4's anticipated "PNG via `@resvg/resvg-js` in the
web app only" line. The script:

1. Composes each image as a **plain hand-laid SVG string** (no satori/JSX): brand
   canvas + wordmark + copy + an engine-rendered QR via `renderQr` (sRGB hex only —
   hard rule).
2. The OG QR encodes **`HTTPS://QRCDN.COM`** (uppercase apex, QR alphanumeric mode —
   D1's densest form; the Worker 301s `/` to www, so scanning an OG card lands on the
   homepage).
3. Rasterizes with `Resvg` (committed Inter static TTFs via `font.fontFiles` — source
   from the official rsms/inter release, commit under `apps/web/scripts/assets/fonts/`
   WITH the OFL license file).
4. **Self-verifies before writing**: decodes the rasterized QR region with
   `zxing-wasm` and asserts the exact payload — a silent mis-render can never ship.
5. Writes committed outputs: `app/apple-icon.png`,
   `app/(marketing)/opengraph-image.png` + `.alt.txt` (U1); pricing + one shared legal
   OG (U3/U4). 1200×630 for OG. Deterministic committed bytes, never generated in
   `next build`. Each consuming page carries a header comment pointing at the script
   (regenerate when copy changes).

Chosen over runtime `ImageResponse`: satori rasterizing SVG-in-`<img>` for arbitrary
QR styles is undocumented territory; committed bytes match the pixel-perfect bar.

## Units

### U1 — Foundation (L)
`components/marketing/site-nav.tsx` + `site-footer.tsx` (real hrefs only — nav:
Pricing, API → `/developers`, Studio → `/login` for visitors, Sign in, primary
"Start free" → `/login`; footer: product/resources/legal columns, mailto, wordmark,
"your code never dies" mono sign-off, theme toggle); `app/(marketing)/layout.tsx`;
designed `app/not-found.tsx` at the `/u`-page register (glass card, mono receipt line,
restrained copy, CTA home); `metadataBase`; icons; the brand-image script + homepage
OG; proxy matcher v1. Acceptance: `next build` green with `/` untouched; all existing
suites green; new pages… none yet — chrome renders via 404.

### U2 — Landing (M–L)
Delete `app/page.tsx`; create `app/(marketing)/page.tsx`. Harvest-for-pattern (not
mechanical rename) from `components/explore/*` into fresh `components/marketing/*`:
Hero (v4.2 bones: enormous headline + `AccentText`, quiet subcopy, one strong CTA,
`ScanNetwork` with cycling destination chips) → **live playground** (StudioSlice
upgraded: `ColorField` picker, `DotSwatch`/`EyeSwatch` shapes, the instrument-panel
scannability readout from real engine metadata, `ArtifactStage` staging, and anonymous
SVG/PNG download via `lib/export.ts`) → framed product windows refreshed to **current
product truth** (module-scope static-render pattern; studio window shows the real
instrument panel, dashboard window the real `/codes` chart shapes) → never-dies
retarget moment → API section (curl snippet, mono, → `/developers`) → compact pricing
pair (figures via `entitlements.ts` import, → `/pricing`). Ends with **board review
round 1** on live production (both themes + mobile).

### U3 — Pricing (M)
`lib/pricing.ts`: every row derived from `PLAN_LIMITS`/`PRICING`; annual savings pct
derived (`Math.round((1 - 96/(12*12))*100)` — from the constants, never a literal);
co-located vitest proving derivation (change a limit → row changes).
`app/(marketing)/pricing/page.tsx`: annual-default toggle ("$8/mo billed annually" =
`annualUsd/12`), full feature matrix from `PRICING_ROWS`, downgrade honesty strip,
FAQ accordion (the P2 `FaqItem` grid-rows technique), Start-free CTA + the honest
pre-Stripe line. Its OG image via the U1 script.

### U4 — Legal (S)
`/terms` + `/privacy` prose at the floor register (measured column ~65ch, mono section
anchors, "Last updated" line, TOC if long). Terms: plain-language; the never-dies
commitments and their honest limits (free codes never deactivated, downgrade =
read-only never deletion — D14); malicious-use carve-out as the only kill switch;
acceptable use; no warranty/liability boilerplate in plain words. Privacy: D3 truth —
scan analytics use `sha256(ip + daily rotating salt)`, raw IPs never stored; coarse
geo from the edge; retention 30d/365d raw by plan (rollups persist); auth cookies only;
cookieless Vercel analytics; subprocessors: Vercel, Supabase, Cloudflare, Resend;
deletion = account cascade. Counsel-review flag recorded here + P10 checklist.

### U5 — Cleanup & unification (L — execute exactly this migration table)

| Item | Disposition |
|---|---|
| `components/explore/backdrop.tsx` (`HeroBackdrop`) | **Move → `components/brand/backdrop.tsx`** (cross-surface, like `magic.tsx`). Update all 5 consumers: `/login`, `/developers`, `/u/[slug]`, `/p/[slug]`, (explore, dying anyway). |
| `lib/explore.ts` `brandQrStyles` + `brandQrBackdrop` | **Move → new `lib/brand-qr.ts`** (keep together — same "must match `--qr-bg` by hand" constraint). ⚠️ `components/studio/studio-shell.tsx` — real product code — imports `brandQrBackdrop`; update it. |
| `lib/explore.ts` `BRANDS`/`isBrand`/`brandCopy` | Delete (superseded by U2/U3 copy in place). |
| `components/explore/qr-svg.tsx` (`QrSvg`) | Move → `components/qr/` (neutral QR-rendering home, beside `shape-swatches.tsx`). |
| Remaining `components/explore/*` + `app/explore/` | Delete once nothing imports them (fresh grep first — the table above was verified 2026-07-30; re-verify at execution). |

Then: `/developers` moves into `(marketing)` (URL unchanged; drops its hand-rolled
header for the shared chrome); proxy matcher v2; `app/robots.ts` (allow-all, disallow
`/api/`,`/auth/`, sitemap URL — `/login`·`/u`·`/p` keep their page-level noindex,
which requires crawlability, so no Disallow for them) + `app/sitemap.ts` (`/`,
`/pricing`, `/terms`, `/privacy`, `/developers`); `@vercel/analytics` `<Analytics/>`
in root layout (cookieless, Hobby-free 50k events/mo; dashboard toggle is an ops step).
Apex robots.txt stays Worker-owned (Disallow-all) — different host, no conflict.

### U6 — Proof & docs (S–M)
`apps/web/e2e/marketing.spec.ts` — plain independent tests (no serial machinery, no
fixture dependencies; e2e uses **relative imports**): each public page 200 +
`a[href="#"]` count 0 · Start-free CTA lands on `/login` · unknown route → custom 404
with 404 status · `/robots.txt` + `/sitemap.xml` respond · pricing numbers match
`import { PLAN_LIMITS, PRICING } from "../lib/entitlements"`. Keep it focused — the
suite is serial and every test extends CI wall-clock. Docs: this spec finalized,
STATUS entry + ledger, design-system component-inventory update (explore →
brand/marketing/qr split), D-log notes (D4 resvg line now real; D14 pricing page ships
from entitlements), board note. **Board review round 2** → phase close.

## Review cadence

P4 pattern: units land on `main`, deploy, board reviews live production. The current
`/` is a scaffold, so every deploy is a strict upgrade; the launch *moment* stays
Checkpoint C's. Round 1 after U2, round 2 at close.

## Verification bar (every unit)

`pnpm lint && pnpm typecheck && pnpm test` locally → commit (playbook conventions) →
push → CI watched by exact SHA. UI units: `review-animations` gate before commit;
verify `○ (Static)` on marketing routes in build output; reduced-motion paths exist.
Phase close-out: production click-through of every page, both themes + mobile
viewport; OG cards validated in the social debuggers; OG QR decode-checked.

## As-built amendments (2026-07-30)

Recorded at U6 close, against what actually shipped rather than what this spec
originally planned:

- **Nav ships without a "Studio → /login" link.** `SiteNav`'s link set is just
  Pricing/API + Sign in; the primary "Start free" CTA already goes to `/login`, so a
  redundant Studio link would just be the same destination twice. (The footer's
  Product column does carry a "Studio → /login" link — that one earns its place as
  a footer catch-all, not a nav duplicate.)
- **Execution order was U1 → U3 → U4 → U2 → U5 → U6**, not the numeric order this
  spec lays the units out in (`649f5ee` → `1109480` → `12bdd5b` → `14b926d` →
  `19022d6`). Consequence: by the time U2's board review round 1 happened, pricing
  and legal already existed too, so round 1 reviewed a materially complete site
  (landing + pricing + terms + privacy together), not landing in isolation.
- **U2 fix round (`d2af287`):** orchestrator review caught both instrument-bearing
  QR previews (the landing playground's default, the brand-system section's
  `StudioWindow` mock) opening with an honest-but-self-inflicted "inverted contrast"
  warning in dark mode, because both were staged on `brandQrStyles.precision[mode]` —
  ink AND paper flipping with the *site's* theme rather than staying print-true.
  Fixed by pinning both to their own explicit paper: dark ink on an explicit,
  non-transparent white mat, independent of site theme, matching the real Studio's
  own default new-kit style. Codified as a standing rule (see
  `docs/guides/design-system.md`'s print-truth rule, added this unit): **any surface
  carrying the scannability instrument or an export never opens criticizing our own
  default.** Decorative theme-flipped inversion is still fine — it's just hero-only
  now (the `ScanNetwork` tile carries no instrument and no download, so its dark-mode
  inversion was never the bug).
- **U5 fresh-grep deviations** (the migration table above was written before U1–U4
  landed; re-grepped at U5 execution, per its own "re-verify at execution" note):
  `components/brand/backdrop.tsx` (`HeroBackdrop`) had **6** real importers by then,
  not the 5 the table anticipated — `/login`, `/developers`, `/u/[slug]`, `/p/[slug]`
  as planned, plus `app/not-found.tsx` (U1) and `components/marketing/hero.tsx` (U2),
  both written after this table was drafted. `lib/brand-qr.ts` (`brandQrStyles`/
  `brandQrBackdrop`) landed with **5** importers: the 3 U2 components that stage a QR
  preview (`playground.tsx`, `scan-network.tsx`, `studio-window.tsx`), the
  pre-existing real-product consumer the table flagged (`studio-shell.tsx`), and
  `scripts/generate-brand-images.ts` (the OG script). `components/qr/qr-svg.tsx`
  (`QrSvg`) moved as planned and currently has **zero** importers — dead code by
  count, kept anyway as the neutral, non-marketing/non-studio QR-render primitive
  the component inventory now documents it as. The `Brand` union
  (`type Brand = (typeof BRANDS)[number]`) was dropped outright rather than moved:
  with `BRANDS` long collapsed to `["precision"] as const` (the D13 lock), it had
  decayed into a single-member union — dead generality, not a real abstraction worth
  carrying forward.
- **The `hello@qrcdn.com` Email Routing rider is DONE**: DNS verified (additive MX on
  the apex, Cloudflare Email Routing, no conflict with Resend's `send.` subdomain or
  the redirect Worker, which is HTTP-only) — pending only the founder's
  destination-verification click on his own inbox.
- **E2E retry-resilience fix** (this unit, Part 2): `apps/web/e2e/global-setup.ts`
  used to mint the sign-in suite's one magic-link token once, into the manifest.
  Single-use token + a serial-group retry that restarts from sign-in meant any
  mid-suite flake was guaranteed unrecoverable, not just possibly so — live evidence
  is the E2E check for `12bdd5b` itself, which needed a job-level re-run to go green
  (`docs/STATUS.md`'s P9 entry has the run detail). Fixed by minting fresh, at test
  time, on every sign-in attempt (`apps/web/e2e/auth-token.ts`'s `mintSignInToken`);
  the manifest now carries only `userId`/`email`/`createdAt`. Proved directly: two
  `mintSignInToken` calls in one process against the same email produced two distinct
  tokens, both exchanged successfully via `/auth/confirm` (simulating attempt 1 +
  retry), while re-exchanging the first token a second time was correctly rejected
  — confirming both the bug's premise (tokens really are single-use) and the fix
  (minting fresh sidesteps it every time).
