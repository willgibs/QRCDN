# Design system guide

Read this when touching tokens, themes, fonts, or shared UI components under `apps/web`.

## 3-layer token architecture (D13)

- **Layer 0/1 — plain CSS custom properties, per-brand.** Primitives + semantic vars (shadcn names verbatim, plus product-specific additions: `--surface-studio`, `--qr-fg`/`--qr-bg`, `--font-display`/`--font-body`/`--font-mono`... actually declared as `--brand-font-display`/`--brand-font-body`/`--brand-font-mono`) live under `[data-brand="..."]` selectors in `apps/web/app/themes/{precision,warmth,bold}.css`, with a `.dark [data-brand="..."]` / `.dark[data-brand="..."]` sibling block for dark values. A base `:root` / `.dark` pair in `globals.css` also exists as the shadcn-default fallback (used when no `data-brand` is set).
- **Layer 2 — `@theme inline`, written once.** In `apps/web/app/globals.css`, a single `@theme inline { ... }` block maps Tailwind v4 theme tokens (`--color-primary`, `--font-sans`, `--radius-lg`, etc.) to the Layer 1 variable names. **Never edit Layer 2 during theming/exploration** — it's brand-agnostic plumbing. Only Layer 0/1 values change per brand.
- **Semantic token *names* are frozen** (D13): `--primary`, `--card`, `--surface-studio`, `--qr-fg`, `--qr-bg`, `--chart-1..5`, etc. do not get renamed during exploration — only their per-brand *values* change. This is what lets `Layer 2` stay untouched while three brand directions coexist.

```
[data-brand="precision"] { --primary: oklch(...); ... }   /* Layer 0/1, per-brand */
.dark [data-brand="precision"] { --primary: oklch(...); } /* Layer 0/1 dark */
@theme inline { --color-primary: var(--primary); ... }     /* Layer 2, written once */
```

## Dark mode mechanics

- Class strategy: `@custom-variant dark (&:is(.dark *));` in `globals.css` — Tailwind's `dark:` variant fires off a `.dark` ancestor class, not `prefers-color-scheme` directly.
- `next-themes` (`apps/web/components/theme-provider.tsx` wraps `ThemeProvider` from `next-themes`) is mounted in `app/layout.tsx` with `attribute="class" defaultTheme="system" enableSystem`, so it toggles the `.dark` class on `<html>` and respects OS preference by default. `<html>` also has `suppressHydrationWarning` since the class is set client-side post-hydration.
- Brand + dark combine via the `.dark [data-brand="x"]` / `.dark[data-brand="x"]` selector pattern in each theme file (both the descendant and same-element forms are declared, since `data-brand` is set on a wrapper `<div>` inside `<body>`, not on `<html>` — see `app/explore/[brand]/page.tsx`: `<div data-brand={brand} className="min-h-screen ...">`).

## Current brand state (as of this doc)

- **Checkpoint A is open.** Founder chose "Precision instrument" as the anchor and asked for a refinement pass toward an Apple-esque register, formula extracted from lazy.so / genie.io / stellar.work (per `docs/STATUS.md`): one enormous plain-spoken headline owning the viewport; extreme restraint (single accent, hierarchy from scale/space only); quiet gray subcopy; one strong CTA; eyebrow-labeled benefit sections; product visuals in soft frames.
- `apps/web/app/themes/precision.css` is at "v2" (Inter display, violet-blue accent `oklch(0.51 0.23 268)`, deeper dark surfaces) and is the pending direction.
- `warmth.css` (editorial/serif, Fraunces + Hanken Grotesk) and `bold.css` (saturated/playful, Bricolage + Inter) are **archived alternatives** — kept only until the lock, not under active refinement.
- Do not add product features gated on a specific `data-brand` value; the exploration is temporary scaffolding for the lock decision, not permanent multi-tenancy.

## The D13 lock protocol

Once the founder approves the final direction (Checkpoint A close), a single pass does all of the following — do this as one coherent commit, not incrementally:

1. Collapse the winning theme's Layer 0/1 values into the base `:root` and `.dark` blocks in `globals.css` (replacing the current shadcn-default placeholder values there).
2. Delete the losing theme files (`warmth.css`, `bold.css`, and their `@import`s in `globals.css`) and the winning theme's own now-redundant `[data-brand="..."]` file.
3. Remove `data-brand` entirely — the wrapper `<div data-brand={brand}>` in `app/explore/[brand]/page.tsx` and all `[data-brand=...]`/`.dark [data-brand=...]` selectors go away along with the `/explore/[brand]` route itself.
4. Delete unused fonts from `apps/web/app/fonts.ts` and `fontVariables` — keep only the winning brand's `--brand-font-display`/`--brand-font-body`/`--brand-font-mono` sources.
5. Leave Layer 2 (`@theme inline`) untouched — it was already brand-agnostic.

## Fonts (`apps/web/app/fonts.ts`)

All six fonts below are loaded during the P2 exploration phase; the comment in `fonts.ts` states the rest are deleted at lock (D13):

| Font | CSS variable | Used by |
|---|---|---|
| Inter | `--font-inter` | `precision` (display + body), `bold` (body) |
| JetBrains Mono | `--font-jetbrains-mono` | all three themes' `--brand-font-mono` |
| Fraunces | `--font-fraunces` | `warmth` (display) |
| Hanken Grotesk | `--font-hanken-grotesk` | `warmth` (body) |
| Bricolage Grotesque | `--font-bricolage` | `bold` (display) |
| Space Grotesk | `--font-space-grotesk` | **none** — see Outline discrepancies |

## Product tokens

- `--surface-studio` — background for the "studio" style-editing surface (used by `StudioSlice`'s outer `<section>`), distinct from `--background`/`--card`.
- `--qr-fg` / `--qr-bg` — **plain sRGB hex strings** (e.g. `#131316`, `#ffffff`), not oklch, even though every other Layer 1 token in the theme files is oklch. This is intentional and non-negotiable: exported QR assets must be sRGB hex, never oklch (D6, `CLAUDE.md` hard rule) — these two tokens are the bridge between the oklch-based UI theme and the hex-only `qr-engine` input (`QrStyle.fill`/`background` colors). `apps/web/lib/explore.ts`'s `brandQrBackdrop` map must be kept in sync with each theme's `--qr-bg` value by hand (there is no build-time check for this yet).
- `--brand-font-display` / `--brand-font-body` / `--brand-font-mono` — Layer 1 indirection so Layer 2's `--font-sans`/`--font-mono`/`--font-display`/`--font-heading` never need to change per brand.

## Component inventory

Vendored shadcn primitives already under `apps/web/components/ui/` (style `radix-nova`, see `apps/web/components.json`) — adopt these rather than hand-rolling: `badge`, `button`, `card`, `chart` (Recharts wrapper), `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `slider`, `sonner`, `switch`, `table`, `tabs`, `toggle-group`, `toggle`, `tooltip`.

Custom, domain-specific components built in P2 under `apps/web/components/explore/` (commit `5a74f86`) — these are the pattern to follow for future studio/dashboard work, not primitives to pull from shadcn:

| Component | File | What it does |
|---|---|---|
| Live QR preview | `qr-svg.tsx` (`QrSvg`) | Client-renders `renderQr` from `@qrcdn/qr-engine` directly — same engine as the server, theme-aware (light/dark style variant via `useTheme` + `useMounted`) |
| Shape pickers with real SVG swatches | `studio-slice.tsx` (`DotSwatch`, `EyeSwatch` inside `StudioSlice`) | Hand-drawn miniature SVGs (not icon-font glyphs) that visually preview each `dots.style` / `eyes.frame` option inside a `ToggleGroup` |
| Stat tiles | `dashboard-card.tsx` (`DashboardCard`) | Plain `Card`s showing "Total scans" / "Top country" as large numbers |
| (Table, not yet a true geo table) | `dashboard-card.tsx` (`DashboardCard`'s `topCodes` table) | Currently a top-codes-by-scan-count table (name/slug/scans); see Outline discrepancies — a real geo breakdown table doesn't exist yet |

**Not yet built** (called out in the outline as expected inventory, absent from the repo as of this doc — build these following the `QrSvg`/`StudioSlice` pattern when P4/P6 land): a color/gradient editor for `fill`, and logo upload + sanitization (client-side rasterization/validation before it becomes a `logoDataUri`).

## Chart approach

- Recharts v3 (`recharts@3.8.0` in `apps/web/package.json`) via the shadcn chart wrapper at `apps/web/components/ui/chart.tsx` (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartConfig` type). Don't import `recharts` primitives directly into a page — go through `ChartContainer` so tooltip/legend theming and the `--color-*` CSS-var bridge stay consistent.
- Series colors come from the `--chart-1` through `--chart-5` Layer 1 tokens (declared per-brand in each theme file, mapped through Layer 2 as `--color-chart-1..5`); `ChartConfig` entries reference them as `color: "var(--chart-1)"` and the wrapper exposes `var(--color-<key>)` per series.
- See Outline discrepancies below — the current P2 `DashboardCard` (with its Recharts `AreaChart`) is rendered directly on the `/explore/[brand]` marketing-style exploration page, which appears to conflict with a "charts only in dashboard routes, never marketing" rule.

## `useMounted` hook pattern (`apps/web/hooks/use-mounted.ts`)

```ts
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
```

Returns `false` during SSR and the initial hydration pass, `true` after. Use it to gate any output that depends on client-only state (most commonly `resolvedTheme` from `next-themes`) — e.g. `QrSvg` and `StudioSlice` both use `mounted && resolvedTheme === "dark"` before picking the dark style variant.

Why not `useState` + `useEffect`: 
1. **Hydration mismatch** — the server has no way to know the resolved color scheme (it depends on `localStorage`/OS preference), so rendering theme-dependent output during SSR produces markup that won't match the client's first paint.
2. **`react-hooks/set-state-in-effect` lint** — the naive fix (`useState(false)` + `useEffect(() => setMounted(true), [])`) trips this rule. `useSyncExternalStore` with a no-op subscribe and different server/client snapshots is the React-sanctioned way to express "different value before vs. after hydration" without a state-in-effect pattern.

## Outline discrepancies

- **Space Grotesk is loaded but unused.** `apps/web/app/fonts.ts` exports `spaceGrotesk` and includes `--font-space-grotesk` in `fontVariables`, but no theme file (`precision.css`, `warmth.css`, `bold.css`) references it anywhere. `docs/STATUS.md` notes precision was "refined toward" Inter display in its "v2" pass — Space Grotesk was almost certainly precision's pre-v2 display font, left orphaned in `fonts.ts` after the refinement. Flag for removal now or fold into the D13 lock cleanup rather than waiting.
- **Chart placement rule — resolved.** "Charts only in dashboard routes, never marketing" is a *bundle-size* rule from the design-system research (recharts ≈150–200 KB min) that applies to the **real P9 marketing site**: the production homepage must show analytics as a static screenshot/pre-rendered visual, not a live Recharts import. The `/explore/[brand]` pages are throwaway exploration surfaces (deleted at D13 lock) and are exempt — their live chart exists to judge chart theming per direction.
- **"Geo table" doesn't exist yet.** The only table in the current codebase (`DashboardCard`'s `topCodes`) is a top-codes-by-volume list (name, slug, scan count), not a geography breakdown. A geo table is plausible future P6 (dashboard + analytics rollups) scope but isn't present to document as-built.

## Testing note: browser-pane screenshots vs motion

The Claude browser pane reports `document.visibilityState === "hidden"`, so Chrome
freezes rAF-driven `motion/react` animations at their initial frame (opacity 0) and
throttles intervals. Pages look "invisible/broken" in screenshots but are fine in real
visible tabs. Before screenshotting, neutralize frozen states via JS:
`document.querySelectorAll('[style]').forEach(el => { const o = el.style.opacity; if (o !== "" && parseFloat(o) < 1) { el.style.opacity = "1"; el.style.transform = "none"; } })`
— and expect to re-run it right before the capture (motion can re-apply styles).
Programmatic scrolling doesn't repaint in the hidden pane; use a tall viewport
(`resize_window` to e.g. 1280×2900) to capture full pages instead.
