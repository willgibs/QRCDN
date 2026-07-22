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

- **Checkpoint A is closed.** "Precision instrument" won the three-way exploration — Apple-esque register, formula extracted from lazy.so / genie.io / stellar.work: one enormous plain-spoken headline owning the viewport; extreme restraint (single accent, hierarchy from scale/space only); quiet gray subcopy; one strong CTA; eyebrow-labeled benefit sections; product visuals in soft frames. The v4.2 hero is the codified quality floor for every future surface (see "The quality floor" below).
- The D13 lock protocol has executed: precision's Layer 0/1 values live directly in the base `:root`/`.dark` blocks in `apps/web/app/globals.css` (Inter display + body, JetBrains Mono accents, violet-blue accent `oklch(0.51 0.23 268)` light / `oklch(0.62 0.21 268)` dark, deeper dark surfaces). `warmth.css`/`bold.css` and their `[data-brand]` selectors are deleted, along with the Fraunces/Hanken Grotesk/Bricolage Grotesque/Space Grotesk font loaders — `apps/web/app/fonts.ts` now exports only `inter` and `jetbrainsMono`.
- `/explore/[brand]` persists post-lock as the P9 marketing-page seed (founder decision, not a lock-protocol exception): `BRANDS` in `lib/explore.ts` resolves to `["precision"]` only, with no `data-brand` plumbing left in the explore components.
- Product features still never gate on the `brand` route param — `/explore/[brand]` is a throwaway marketing-preview surface, not multi-tenancy.
- P4 (studio + generator) landed the Resend-grammar "luminous staging" restage on top of the locked precision tokens — see "Luminous staging grammar" and "Shared brand primitives" below. This is a visual-language extension, not a reopening of brand exploration.

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

P4 studio components, built under `apps/web/components/studio/` and `apps/web/components/qr/` (the color/gradient editor and logo upload the outline once called "not yet built" both landed here):

| Component | File | What it does |
|---|---|---|
| Shell | `studio-shell.tsx` (`StudioShell`) | Owns live `QrStyle` state, wires every control straight into `renderQr`/`scannabilityReport` (no round-trip), derives `inkHex`/`paperHex` for the preview stage |
| Preview stage | `preview-stage.tsx` (`PreviewStage`) | Live QR restaged as a floating luminous artifact — see "Luminous staging grammar" below |
| Controls rail | `controls-rail.tsx` (`ControlsRail`, `ColorField`) | Payload input, ink/paper color fields (swatch presets + free-hex text field, glow-tile selected states), shape `ToggleGroup`s, logo upload + size slider, SVG/PNG export |
| Shape swatches | `qr/shape-swatches.tsx` (`DotSwatch`, `EyeSwatch`) | Hand-drawn SVG previews for `dots.style` / `eyes.frame`, `currentColor`-filled so the glow-tile selected state tints them |
| Kit bar | `kit-bar.tsx` (`KitBar`) | Create/switch/save/delete brand kits, two-step delete confirm, default-kit toggle |
| Top bar | `top-bar.tsx` (`TopBar`) | Wordmark + account cluster + kit bar, directive-free presentational leaf |
| Scannability chip | `scannability-chip.tsx` (`ScannabilityChip`) | Live clean/warn/error status pill from `ScannabilityReport`, worst-issue-first |

## Shared brand primitives (`components/brand/`)

Cross-surface primitives — shared by studio, auth, and explore/marketing alike, which is why they live outside `components/explore/` (their P2 birthplace mischaracterized them as marketing-only). No barrel file: import each module directly (`@/components/brand/<name>`), preserving the server/client module split below.

| Module | Exports | Server-safe? | What it's for |
|---|---|---|---|
| `magic.tsx` | `EASE_OUT`, `useRevealVariants`, `Reveal`, `ModuleMark`, `Eyebrow` | No (`"use client"`, uses `motion/react` + `useReducedMotion`) | Shared motion language (entrance variants, scroll reveal) + the eyebrow/module-mark brand mark, used by login, studio, and every explore section |
| `artifact-stage.tsx` | `ArtifactStage` | **Yes** — presentational, no hooks | Glow-layer wrapper for a floating "luminous artifact" (first consumer: the studio QR preview). See "Luminous staging grammar" below |
| `accent-text.tsx` | `AccentText` | **Yes** — presentational, no hooks | Gradient accent-word span for headlines. Built for P9; not applied to any live surface yet |
| `glow-tile.ts` | `glowTileOn`, `glowSwatchSelected` | N/A (plain string constants, not components) | Class recipes for "lit" selected states — composed into vendored Radix `ToggleGroupItem`/swatch `className`s, never baked into `ui/toggle*.tsx` itself |

## Luminous staging grammar (Resend reference)

The Resend-grammar restage (P4): a product artifact staged on a recessed near-black floor, glowing under its own ambient bloom, with a seamless paper-colored card instead of a glass gradient-border frame. First applied to the studio QR preview (`preview-stage.tsx` + `ArtifactStage`); the primitives are reusable for P9 marketing surfaces.

- **Grammar.** Floating artifact (no visible frame seam) + recessed stage floor (`--surface-studio` sits below `--background`, not above it) + glowing selected controls + generous vertical rhythm. This is the same register as Resend's product screenshots and pricing cards — luminosity and depth substitute for the borders/gradients the pre-P4 studio used.
- **Glow layer recipe** (`ArtifactStage`, `components/brand/artifact-stage.tsx`), stacked in one `aria-hidden pointer-events-none absolute inset-0 -z-10` wrapper. P4 design-iteration note 5 (founder: the original single centered bloom "reads as haze... almost feels like my eyes are creating the blur") restructured this from one symmetric ink bloom into an **authored** rig — five layers, each doing one specific job instead of one layer doing all of them:
  1. **Base violet bloom** (always on, brand-locked, never re-hues) — `rounded-full bg-primary blur-3xl opacity-[0.08] dark:opacity-[0.13]`, sized ~140%/130% of the stage wrapper, centered via `-translate-x-1/2 -translate-y-1/2`. Guarantees the stage reads as luminous even with the schema-default near-black `#111111` ink. Opacity trimmed slightly from the original single-bloom version (was `0.10`/`0.16`) now that two ink-tinted layers sit on top of it.
  2. **Outer field** — the wide ink-tinted bloom, `~120%/110%` of the stage wrapper, `blur-3xl`, `opacity-[0.20] dark:opacity-[0.28]` — but **offset downward** (`top-[57%]` instead of `top-1/2`, same `-translate-y-1/2` anchor) so it pools below the artifact like cast light instead of sitting as a symmetric vignette centered on the object.
  3. **Inner halo** — a second, *tighter* ink-tinted layer: sized just beyond the card (`~108%/108%`), `blur-xl` (not `blur-3xl`), at higher opacity (`opacity-[0.14] dark:opacity-[0.30]`) and centered (not offset). Reads as light emitting directly from the object's edge — the outer field alone read as ambient haze with no sense of *where* the light originates; this layer gives it a source.
  4. **Floor-shadow ellipse** (unchanged) — `inset-x-8 -bottom-5 h-8 rounded-[50%] bg-black/20 blur-2xl dark:bg-black/55`, anchoring the artifact to the floor.
  5. **Reflection streak** — the strongest authored cue, and the one most responsible for killing the "haze" read: a thin specular line `~1.5rem` below the card (`absolute inset-x-0 -bottom-6 mx-auto h-px w-3/5`), built from `bg-gradient-to-r from-transparent via-current to-transparent` with `style={{ color: ink }}`, `blur-[1px]`, `opacity-[0.25] dark:opacity-[0.40]`. Reads as light catching the stage floor's surface directly beneath the object, the way a real product photo would show a faint reflection.
- **Accent policy:** brand chrome is violet-only; ambient glows may take their hue from user content where it exists. The base bloom is always `--primary` (D13 precision lock — never a second brand hue); the outer field, inner halo, and reflection streak all re-hue together from the same `ink` value, and only from the user's own kit data (the QR's ink color), never from an arbitrary palette.
- **Solid/current-color-under-blur technique:** the outer field and inner halo are solid `background-color` under blur, not `radial-gradient` — `background-color` interpolates smoothly across a CSS transition, gradients don't, which is what lets both layers re-hue live as the user edits their ink color instead of hard-cutting between colors. The reflection streak extends the same trick to `color`: its gradient uses `via-current`, so transitioning `color` (not `background-color`) re-hues the whole streak the same way, because the gradient recomputes live from the interpolated `currentColor` on every frame of the transition.
- **Light-mode adaptation:** every glow layer's opacity roughly halves (or more) in light mode — base bloom `0.08` light / `0.13` dark, outer field and inner halo carry the widest light/dark gap (inner halo `0.14` light / `0.30` dark, roughly 2×) since light surfaces need much less glow to read as luminous before they wash out, reflection streak `0.25` light / `0.40` dark. Tune further in live review; worst case a layer drops to `opacity-0` in light mode and the stage leans on the layers below it.
- **Glow-opacity family vs. the texture ceiling:** glow opacities (`0.08`–`0.40` across the five layers) are a distinct, much stronger family than the ≤0.035 quiet-texture ceiling used for background motifs like `ModuleGridBackdrop`'s QR-module grid (`preview-stage.tsx`) — don't conflate the two. Texture is barely-there; glow is the focal luminosity effect.
- **Frames stay reserved for window-chrome.** The glass gradient-border frame treatment (still used by `ProductWindow`, browser-chrome mockups) is for surfaces that need to read as a *window onto* a product screen. A staged artifact that *is* the product (the QR itself) uses `ArtifactStage` + a seamless paper-hex mat instead — don't reach for a frame here.

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

## Motion & the taste toolchain (checkpoint A v4)

- **Skills are law for design work:** any agent touching UI/motion loads `.agents/skills/emil-design-eng/SKILL.md` first; all motion code must pass the `review-animations` skill gate before commit (it runs as an adversarial review pass — expect Block verdicts to be fixed, not argued). `transitions.dev` patterns are the preferred source for standard transitions: copy from the catalog (`.agents/skills/transitions-dev/`) rather than inventing.
- **Motion tokens** live in `globals.css`: `--motion-ease-out/in-out/drawer`, `--duration-press/fast/normal/slow`, bridged to Tailwind as `ease-(--motion-ease-out)` etc. No ad-hoc curves/durations. `components/brand/magic.tsx` exports `EASE_OUT` for motion/react usage; always animate full `transform` strings, never x/y/scale shorthands.
- **Known pitfall (verified live):** shadcn variants shipping `transition-all` silently override the press-feedback system — `transition-all` was removed from `button.tsx`/`toggle.tsx` variants; never reintroduce it.
- **App-phase transition mapping** (P4/P6, from the transitions.dev catalog): Modal open/close (create/edit dialogs), Toast (Sonner already themed), Panel reveal (studio side panels), Success check (code created/saved), Skeleton loader and reveal (analytics loading), Input clear with dissolve + Error state shake (form validation), Tabs sliding (code-type/pricing toggles), Toggle switch (settings), Notification badge (scan alerts), Number pop-in/Spinning counter (dashboard stats).
- **Reference set for marketing craft** (founder-endorsed): lazy.so, genie.io (framed product windows, alternating sections), withpipeline.com (connective line-art + centered icon hero — our ScanNetwork descends from this), stellar.work (scale + restraint), transitions.dev (micro-interactions).

## The quality floor (founder-set, checkpoint A close)

The v4.2 hero (scan-network artwork + atmosphere + framed product windows + token-clean
motion) is the **minimum quality floor for every future surface** — marketing sections,
app screens, emails. A section that "works" but lacks this craft level is not done.
Verification for design rounds: breakpoint matrix AND a live pass in the founder's
Chrome (claude-in-chrome MCP — he has authorized this) AND an adversarial
"reads-as-broken" audit (orphaned decoration, dead space, text orphans, rhythm gaps).
Review rounds always happen against a production build (`next start`), never dev.
