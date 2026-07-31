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

### D13 amendment (P9.5-T1b): additive token families

Layer 2 is closed to per-brand *value* changes — that rule is unchanged. What's new: token
*families* the original `@theme inline` block never had (spacing, type scale, containers, code
colors) land as an additive extension in a **second, clearly-commented `@theme` block**,
immediately below the original in `globals.css`. This is not a reopening of "never edit Layer 2
during theming" — the original block's existing color/radius/motion mappings stay
byte-for-byte untouched; the new block only adds namespaces the old one never touched. The two
blocks compose additively (a documented Tailwind v4 mechanism, verified against the installed
`tailwindcss@4.3.3`), so there's no practical difference between "one bigger block" and "two
adjacent blocks" other than keeping the diff reviewable.

Every new family, with its usage rules:

- **Fluid spacing** (`--spacing-gutter/section-tight/section/section-air/block`) —
  `clamp(min, preferred, max)`, min/max always rem-anchored (WCAG 1.4.4 Resize Text: a pure-`vw`
  value ignores the user's OS/browser text-size setting; rem tracks it). `gutter` is the page's
  horizontal inset (`px-gutter`, paired with `max-w-page`); `section-tight`/`section`/
  `section-air` are vertical rhythm, mapped 1:1 to `Section`'s `rhythm` prop
  (`tight`/`standard`/`air`) below; `block` is spacing *within* a section's own content, not
  between sections.
- **Containers** (`--container-page/copy/lede/docs/prose`) — fixed max-widths, not fluid: a text
  measure either fits its purpose or it doesn't, there's no min/max range to bound. `page`
  (1152px) is the outer frame every `Section` uses. `copy` (544px) and `lede` (672px) are narrow
  text measures — pair a `copy`-measure block with an `aside` or a full-measure visual below it
  (`Section`'s dead-measure ban, below). `docs` (736px) is the docs content column beside a TOC
  rail (the `/developers` pilot). `prose` (65ch, a character-count unit on purpose) is for
  long-form article/blog body copy (future blog unit).
- **Type scale** (`--text-display/h1/h2/h3/lede/eyebrow/code`) — each size's declaration bundles
  a paired `--text-<name>--line-height`/`--text-<name>--letter-spacing` (a Tailwind v4
  mechanism, the same pattern the framework's own default theme uses for `--text-xs` etc.):
  declaring the companions folds line-height/letter-spacing into the generated `text-<name>`
  utility alongside font-size, so one class sets all three instead of three utilities that can
  drift out of sync across call sites. `display` is reserved for genuine hero-scale headlines
  (not a default — `SectionHeading` only reaches it when `titleAs="h1"`); `h1`/`h2`/`h3` are
  page/section/subsection heads; `lede` is subhead copy under a heading; `eyebrow` (fixed 11px —
  a label, not a heading, so no fluid range) and `code` (fixed 13px) are the technical/mono
  registers.
- **Code colors** (`--code-bg/fg/comment/keyword/string/number/function/property/punctuation`)
  — a near-monochrome shiki palette; the brand's "single accent" rule extends here too (keyword
  and function are both the brand violet, at two intensities via `color-mix`, never a second
  hue). Declared per-mode in `:root`/`.dark`, like every other Layer 0/1 color (oklch is fine —
  these are UI-only and never reach `qr-engine`; exported QR assets stay sRGB-hex-only per the
  hard rule), and mapped into the *original* `@theme inline` block alongside the other colors,
  since — like every color token — they vary by mode and need the `inline` re-evaluation.
  Consumed by `lib/code-theme.ts`'s shiki theme and `components/marketing/code-block.tsx`'s
  frame.
- **`--surface-tint`** — one new Layer 0/1 color beside `--surface-studio`, mapped through the
  *original* `@theme inline` block the same way (it's a color, so it varies by mode). One step
  subtler than `--surface-studio` toward `--muted`, for `Section`'s `surface="tint"` (plain
  section-to-section alternation) — `surface="floor"` (`bg-surface-studio`) stays reserved for
  the recessed "studio floor" register (luminous staging, live QR previews), not general
  marketing banding.

Tailwind v4 named-scale verification: before writing any component against these, a throwaway
`compile()` call against the installed `tailwindcss@4.3.3` confirmed `--spacing-<name>`,
`--text-<name>` (+ paired `--line-height`/`--letter-spacing`), and `--container-<name>` theme
keys generate real utilities (`p-gutter`, `text-h2`, `max-w-page`, etc.) — the fallback
arbitrary-property syntax (`py-(--spacing-section)`) was not needed anywhere; token values would
be identical either way.

## Dark mode mechanics

- Class strategy: `@custom-variant dark (&:is(.dark *));` in `globals.css` — Tailwind's `dark:` variant fires off a `.dark` ancestor class, not `prefers-color-scheme` directly.
- `next-themes` (`apps/web/components/theme-provider.tsx` wraps `ThemeProvider` from `next-themes`) is mounted in `app/layout.tsx` with `attribute="class" defaultTheme="system" enableSystem`, so it toggles the `.dark` class on `<html>` and respects OS preference by default. `<html>` also has `suppressHydrationWarning` since the class is set client-side post-hydration.
- Brand + dark combine via the `.dark [data-brand="x"]` / `.dark[data-brand="x"]` selector pattern in each theme file (both the descendant and same-element forms are declared, since `data-brand` is set on a wrapper `<div>` inside `<body>`, not on `<html>` — see `app/explore/[brand]/page.tsx`: `<div data-brand={brand} className="min-h-screen ...">`).

## Current brand state (as of this doc)

- **Checkpoint A is closed.** "Precision instrument" won the three-way exploration — Apple-esque register, formula extracted from lazy.so / genie.io / stellar.work: one enormous plain-spoken headline owning the viewport; extreme restraint (single accent, hierarchy from scale/space only); quiet gray subcopy; one strong CTA; eyebrow-labeled benefit sections; product visuals in soft frames. The v4.2 hero is the codified quality floor for every future surface (see "The quality floor" below).
- The D13 lock protocol has executed: precision's Layer 0/1 values live directly in the base `:root`/`.dark` blocks in `apps/web/app/globals.css` (Inter display + body, JetBrains Mono accents, violet-blue accent `oklch(0.51 0.23 268)` light / `oklch(0.62 0.21 268)` dark, deeper dark surfaces). `warmth.css`/`bold.css` and their `[data-brand]` selectors are deleted, along with the Fraunces/Hanken Grotesk/Bricolage Grotesque/Space Grotesk font loaders — `apps/web/app/fonts.ts` now exports only `inter` and `jetbrainsMono`.
- `/explore/[brand]` persisted post-lock through P9-U4 as the P9 marketing-page seed (founder decision, not a lock-protocol exception): `BRANDS` in `lib/explore.ts` resolved to `["precision"]` only, with no `data-brand` plumbing left in the explore components.
- Product features never gated on the `brand` route param while `/explore/[brand]` existed — it was a throwaway marketing-preview surface, not multi-tenancy.
- **Superseded at P9-U5 (2026-07-30): `/explore` and `lib/explore.ts` are deleted outright**, harvested-for-pattern into the real marketing site (`app/(marketing)/`) rather than kept as a seed any longer. The two bullets above are historical record, not current state — see "Component inventory" below for where each P2 pattern lives now.
- P4 (studio + generator) landed the Resend-grammar "luminous staging" restage on top of the locked precision tokens — see "Luminous staging grammar" and "Shared brand primitives" below. This is a visual-language extension, not a reopening of brand exploration.

## The D13 lock protocol (executed at Checkpoint A close)

The lock ran as one coherent pass when the founder approved precision. Kept here as the record of how the current single-brand state came to be:

1. Collapsed precision's Layer 0/1 values into the base `:root` and `.dark` blocks in `globals.css` (replacing the shadcn-default placeholder values).
2. Deleted the losing theme files (`warmth.css`, `bold.css`, their `@import`s) and precision's own now-redundant `[data-brand="..."]` file — `apps/web/app/themes/` no longer exists.
3. Removed `data-brand` entirely — no wrapper attribute and no `[data-brand=...]`/`.dark [data-brand=...]` selector remains anywhere in `apps/web` (grep-verified).
4. Deleted the unused font loaders from `apps/web/app/fonts.ts` and `fontVariables` — only Inter and JetBrains Mono remain.
5. Left Layer 2 (`@theme inline`) untouched — it was already brand-agnostic.

One deviation from the protocol as originally written: `/explore/[brand]` was **not** deleted at Checkpoint A close — the founder kept it as the P9 marketing-page seed (see "Current brand state"); `BRANDS` in `lib/explore.ts` collapsed to `["precision"] as const`, so precision was the only resolvable value. That deferral ended at P9-U5 (2026-07-30): `/explore` and `lib/explore.ts` are now deleted for real, the deviation resolved rather than standing indefinitely.

## Fonts (`apps/web/app/fonts.ts`)

Post-lock, exactly two fonts load (both `next/font/google`, `display: "swap"`, joined in `fontVariables`):

| Font | CSS variable | Role |
|---|---|---|
| Inter | `--font-inter` | `--brand-font-display` + `--brand-font-body` |
| JetBrains Mono | `--font-jetbrains-mono` | `--brand-font-mono` — technical accents: eyebrows, payload/hex strings, chip labels. Register: `font-mono text-xs`/`text-[11px]` + `uppercase tracking-[0.15em–0.2em]` |

The P2 exploration fonts (Fraunces, Hanken Grotesk, Bricolage Grotesque, Space Grotesk) were removed by the D13 lock.

## Product tokens

- `--surface-studio` — background for the "studio" style-editing surface (used by `StudioSlice`'s outer `<section>`), distinct from `--background`/`--card`.
- `--qr-fg` / `--qr-bg` — **plain sRGB hex strings** (e.g. `#131316`, `#ffffff`), not oklch, even though every other Layer 1 token in the theme files is oklch. This is intentional and non-negotiable: exported QR assets must be sRGB hex, never oklch (D6, `CLAUDE.md` hard rule) — these two tokens are the bridge between the oklch-based UI theme and the hex-only `qr-engine` input (`QrStyle.fill`/`background` colors). `apps/web/lib/brand-qr.ts`'s `brandQrBackdrop` map (moved from `lib/explore.ts` at P9-U5) must be kept in sync with each theme's `--qr-bg` value by hand (there is no build-time check for this yet).
- `--brand-font-display` / `--brand-font-body` / `--brand-font-mono` — Layer 1 indirection so Layer 2's `--font-sans`/`--font-mono`/`--font-display`/`--font-heading` never need to change per brand.

## Component inventory

Vendored shadcn primitives already under `apps/web/components/ui/` (style `radix-nova`, see `apps/web/components.json`) — adopt these rather than hand-rolling: `badge`, `button`, `card`, `chart` (Recharts wrapper), `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `slider`, `sonner`, `switch`, `table`, `tabs`, `toggle-group`, `toggle`, `tooltip`.

**`apps/web/components/explore/` no longer exists** (deleted at P9-U5, 2026-07-30 —
`docs/guides/p9-marketing.md`'s U5 migration table). The custom, domain-specific
components P2 built there (commit `5a74f86`) didn't vanish; each had its own heir,
split across three homes by what kind of thing it turned out to be:

| P2 component | Heir | What changed |
|---|---|---|
| Live QR preview (`qr-svg.tsx`, `QrSvg`) | `apps/web/components/qr/qr-svg.tsx` — unchanged code, moved | Neutral QR-rendering home, beside `qr/shape-swatches.tsx`. Currently **zero importers** (grep-verified) — not dead code by policy, just not yet reached for; available for the next surface that needs a theme-aware client-rendered QR |
| Shape pickers (`studio-slice.tsx`'s `DotSwatch`/`EyeSwatch`) | `apps/web/components/qr/shape-swatches.tsx` | Already superseded once, at P4 (see the P4 studio table below) — `studio-slice.tsx` itself is gone, but its pattern was living on through the P4 file long before U5 deleted the original |
| Stat tiles + top-codes table (`dashboard-card.tsx`, `DashboardCard`) | No code-level heir — deleted outright | Its *pattern* lives on as `components/marketing/dashboard-window.tsx` (framed product-window mock, P9-U2) and the real dashboard's own stat tiles/tables (`(app)/codes/`, P6) — both fresh implementations against current product truth, not migrations of this file |
| Cross-surface atmosphere (`backdrop.tsx`, `HeroBackdrop`) | `apps/web/components/brand/backdrop.tsx` — unchanged code, moved | Never really explore-only (P2 birthplace mischaracterized it — same story as the primitives already in "Shared brand primitives" below, which is where it's now listed). 6 real importers as of P9-U5 (grep-verified, more than the U5 migration table originally planned for — see `p9-marketing.md`'s as-built amendments): `/login`, `/developers`, `/u/[slug]`, `/p/[slug]`, `app/not-found.tsx`, `components/marketing/hero.tsx` |
| Brand QR styling (`lib/explore.ts`'s `brandQrStyles`/`brandQrBackdrop`) | `apps/web/lib/brand-qr.ts` — unchanged code, moved | Still-consumed brand primitives — 5 importers (grep-verified): the 3 marketing components that stage a QR preview, the pre-existing `studio-shell.tsx`, and the OG-image script. See "Product tokens" above |
| Multi-brand switcher (`lib/explore.ts`'s `BRANDS`/`isBrand`/`brandCopy`/`Brand`) | None — deleted | Existed only to drive `/explore`'s brand switcher; superseded by plain P9-U2/U3 landing and pricing copy. `Brand` (`= (typeof BRANDS)[number]`) had decayed into a single-member union once `BRANDS` collapsed to `["precision"]` at the D13 lock — dead generality, not an abstraction worth carrying forward |

The current, live equivalent of "the pattern to follow for future storefront work" is
`apps/web/components/marketing/` (P9-U1 through U5, marketing-only by design) —
`site-nav.tsx`, `site-footer.tsx`, `hero.tsx`, `playground.tsx`, `product-window.tsx`
(+ the `studio-window.tsx`/`dashboard-window.tsx` mocks built on it),
`pricing-plans.tsx`, `pricing-faq.tsx`, `legal-shell.tsx`, and a handful of
single-section files, among others. Harvested-for-pattern from the P2/explore
components above rather than importing them — the spec's explicit instruction,
since `components/explore/` was slated for deletion from the start. Cross-surface
pieces these lean on (`HeroBackdrop`, `ArtifactStage`, `AccentText`,
`Reveal`/`Eyebrow`/`ModuleMark`) live in `components/brand/` instead (see "Shared
brand primitives" below) rather than under `components/marketing/` itself — same
reasoning as `HeroBackdrop`'s own move out of `components/explore/`.

**`section.tsx`** (P9.5-T1b) — the landing's future section primitive:
`Section`/`SectionHeading`/`SectionBody`, built against the token families above.
Full contract (variants, rhythm/surface/divider options, the dead-measure/
centered-count/hairline rules) is doc-commented in the file itself rather than
duplicated here — the landing sections themselves are **not yet migrated onto
it** (T3a's job); its only consumer this unit is the `/developers` pilot below.
Shared with it: **`lib/highlight.ts`/`lib/code-theme.ts`/`code-block.tsx`**
(shiki syntax highlighting, server-rendered, themed off the code-color tokens
above) and **`developers/`** (the extracted `/developers` page pieces —
`lib/api-reference.ts`'s typed endpoint data, `components/marketing/developers/`'s
`Section`/`Endpoint`/`InlineCode`/`Method`/`api-toc.tsx`), the first real page
built against the docs-grid containers (`max-w-page`/`max-w-docs`) and type
scale (`text-h1`/`text-h3`) from this unit.

P4 studio components, built under `apps/web/components/studio/` and `apps/web/components/qr/` (the color/gradient editor and logo upload the outline once called "not yet built" both landed here):

| Component | File | What it does |
|---|---|---|
| Shell | `studio-shell.tsx` (`StudioShell`) | Owns live `QrStyle` state, wires every control straight into `renderQr`/`scannabilityReport` (no round-trip), derives `inkHex`/`paperHex` for the preview stage |
| Preview stage | `preview-stage.tsx` (`PreviewStage`) | Live QR restaged as an interactive 3D artifact — see "Luminous staging grammar" below |
| Controls rail | `controls-rail.tsx` (`ControlsRail`, `ColorField`) | Payload input, ink/paper color fields (swatch presets + free-hex text field, glow-tile selected states), shape `ToggleGroup`s, logo upload + size slider, SVG/PNG export |
| Shape swatches | `qr/shape-swatches.tsx` (`DotSwatch`, `EyeSwatch`) | Hand-drawn SVG previews for `dots.style` / `eyes.frame`, `currentColor`-filled so the glow-tile selected state tints them |
| Kit bar | `kit-bar.tsx` (`KitBar`) | Create/switch/save/delete brand kits, two-step delete confirm, default-kit toggle; round-3 note 1 removed the pill's unlabeled status dots — default-ness lives only in the menu (a mono "Default" micro-tag) and the unsaved-changes state lives inside the Save button itself ("Save changes" + a small dot, self-labeling) |
| Scannability chip | `scannability-chip.tsx` (`ScannabilityChip`) | Two-tier live instrument (round 3): a compact summary row (`● Scannable · V{version} · ECC {effectiveEcc}` when clean, `● N issues` when not) plus, when there's anything to report, the FULL issue list below it — every message rendered in full, never truncated. See "Scannability instrument" note below the staging grammar for what `version` is and isn't sourced from |

## Shared brand primitives (`components/brand/`)

Cross-surface primitives — shared by studio, auth, and explore/marketing alike, which is why they live outside `components/explore/` (their P2 birthplace mischaracterized them as marketing-only). No barrel file: import each module directly (`@/components/brand/<name>`), preserving the server/client module split below.

| Module | Exports | Server-safe? | What it's for |
|---|---|---|---|
| `magic.tsx` | `EASE_OUT`, `useRevealVariants`, `Reveal`, `ModuleMark`, `Eyebrow` | No (`"use client"`, uses `motion/react` + `useReducedMotion`) | Shared motion language (entrance variants, scroll reveal) + the eyebrow/module-mark brand mark, used by login, studio, and every marketing section |
| `backdrop.tsx` | `HeroBackdrop` | **Yes** — presentational, no hooks | Atmosphere layer (violet glow + QR-module grid texture) behind a hero/floor-register surface. Moved here from `components/explore/backdrop.tsx` at P9-U5 (was already cross-surface before the move — P2 birthplace mischaracterized it as explore-only, same story as every module in this table). 6 importers: `/login`, `/developers`, `/u/[slug]`, `/p/[slug]`, `app/not-found.tsx`, `components/marketing/hero.tsx` |
| `artifact-stage.tsx` | `ArtifactStage` | **Yes** — presentational, no hooks | Glow-layer wrapper for a floating "luminous artifact" — now the **marketing-only** staging rig (P9 static product visuals) since round 3 moved the studio preview to `TiltStage`. See "Luminous staging grammar" below |
| `tilt-stage.tsx` | `TiltStage` | No (`"use client"`, uses `motion/react` + `useReducedMotion`) | Interactive 3D staging wrapper — tilt-toward-cursor + moving specular sheen + reactive floor shadow. Studio-only (round 3, replacing `ArtifactStage` on that one surface). See "Luminous staging grammar" below |
| `accent-text.tsx` | `AccentText` | **Yes** — presentational, no hooks | Gradient accent-word span for headlines. Built at P4 for P9; applied at P9-U2 — `components/marketing/hero.tsx` wraps "Every destination." in it, the v4.2 hero-bones pattern this guide's quality floor codifies |
| `glow-tile.ts` | `glowTileOn`, `glowSwatchSelected` | N/A (plain string constants, not components) | Class recipes for "lit" selected states — composed into vendored Radix `ToggleGroupItem`/swatch `className`s, never baked into `ui/toggle*.tsx` itself |

## Luminous staging grammar (Resend reference)

The Resend-grammar restage (P4): a product artifact staged on a recessed near-black floor, glowing under its own ambient bloom, with a seamless paper-colored card instead of a glass gradient-border frame. First applied to the studio QR preview (`preview-stage.tsx` + `ArtifactStage`) and originally meant as one shared rig for both the studio and future P9 marketing surfaces. **Round 3 split that in two** — see "Studio vs. marketing staging" below for why, and for the interactive `TiltStage` recipe that now owns the studio surface. The glow-layer recipe in this section still describes `ArtifactStage` exactly as built; it's just scoped to marketing now, not shared.

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

### Studio vs. marketing staging (P4 founder round 3, note 2)

Founder feedback on round 2's stage: the bloom (glow-only) treatment reads well for a static hero shot but underserves the one surface where the user is actively shaping a real object in real time — it doesn't respond to anything they do. Round 3 kept the bloom rig for what it's actually for and gave the studio a rig of its own:

- **Marketing artifact — `ArtifactStage`, unchanged.** A screenshot-like visual the viewer looks *at*, not interacts *with*. Keeps its full 5-layer authored bloom + ink-tinted reflection streak exactly as documented above. This is the P9 marketing-artifact treatment; nothing in round 3 touched `artifact-stage.tsx`.
- **Studio artifact — `TiltStage` (`components/brand/tilt-stage.tsx`), new.** The one object in the product the user is actively editing. It tilts toward the cursor (orbit-limited to ±`maxTilt`) with a moving specular sheen, instead of glowing ambiently — direct-manipulation feedback that reinforces "this is a real, touchable thing" rather than "this is the hero visual." The reflection-streak recipe from `ArtifactStage` is **not** reused here; round 3 explicitly dropped it from the studio stage along with the rest of the bloom layers. The moving sheen is `TiltStage`'s equivalent "the light is alive" cue, driven by the cursor instead of authored as a static streak.

#### TiltStage recipe

- **Mechanics.** `pointermove`/`pointerleave`/`pointerup`/`pointercancel` on `TiltStage`'s own root (not the inner rotating card — hit-testing has to stay on the untransformed plane, not a plane that's tilting away from the cursor as it responds) set two raw `useMotionValue`s, normalized to [-1, 1] from the root's own center (`lib/tilt-math.ts`'s `normalizeStagePointer`, unit-tested). Two `useSpring`s (stiffness 150 / damping 20 — a touch underdamped, so a fast reversal has some life instead of snapping dead-stop) smooth those into `rotateX`/`rotateY`, each clamped to ±`maxTilt` (default 12°) via `tilt-math.ts`'s `tiltDegrees` (also unit-tested — the clamp matters because a spring can briefly overshoot its target on a fast reversal even though its *input* is already bounded to [-1, 1]).
- **Sign convention — verified empirically, not assumed.** `rotateY(+θ)` recedes the card's RIGHT edge (moves it away from the viewer) and advances the left; `rotateX(+θ)` advances the BOTTOM edge and recedes the top — confirmed by reading the browser's own computed `matrix3d()` output for each axis directly (reasoning about 3D CSS rotation direction from memory is exactly the kind of thing that's easy to get backwards — an earlier pass of this component had both axes inverted and looked *almost* plausible until actually tested). For the card to read as "facing the cursor" — the near-cursor edge lifting toward the viewer, like a gaze tracking it — `rotateY` **inverts** the pointer's normalized x (cursor right ⇒ negative rotateY, which advances the right edge) while `rotateX` tracks the pointer's normalized y **directly** (cursor below ⇒ positive rotateX, which advances the bottom edge). This matches the convention most pointer-tilt implementations (e.g. vanilla-tilt.js) use.
- **Specular sheen.** A radial white-highlight `<div>` inside the card bounds (rounded to match — currently hardcoded to `rounded-2xl` for its one consumer; a second consumer with a different card radius would need this promoted to a prop), translated via `useTransform` off the same springs so it sweeps in the same direction as the pointer — the "light" reads fixed while the surface turns under it. Its opacity is itself spring-derived (`clamp(Math.hypot(x, y), 0, 1)` — 0 at rest, rising toward 1 at full tilt), multiplied by a static Tailwind ceiling (`opacity-[0.08] dark:opacity-[0.13]` — deliberately reusing `ArtifactStage`'s own base-bloom numbers so the two staging rigs share one light/dark ratio family) so the highlight fades in as the surface catches it and fades back out as the springs settle on release.
- **Floor shadow.** A blurred ellipse behind the card, tinted from the kit's own ink color via `color-mix(in srgb, ${tint} 30%, black)` (same "ink drives ambient tone" policy as `ArtifactStage`'s glow layers), shifted opposite the pointer via the same springs so the card reads as grounded rather than floating free as it turns.
- **Reduced motion.** `useReducedMotion()` collapses the whole interactive path — no `perspective`, no rotate wrapper, no sheen: a flat card over a static (non-shifting, still ink-tinted) shadow. This is a full disable rather than a reduced-intensity version, because the tilt is pure decorative direct-manipulation feedback with no functional payload once it can't move.
- **Touch/coarse pointers.** No separate media-query gate. The handler never calls `preventDefault()` or captures the pointer, so a touch-scroll is never blocked; `pointerup`/`pointercancel` are wired alongside `pointerleave` so a brief touch-drag settles the springs back to rest instead of leaving the card stuck mid-tilt.
- **Perf + why this animates at all.** Every animated property is `transform`/`opacity`, all `MotionValue`-driven (zero React re-renders on pointer move). Per the emil-design-eng skill's animation-decision framework, this is a "decorative mouse-tracking interaction" (explicitly called out there as a valid `useSpring` use case) rather than an entrance or a frequency-sensitive control — it's continuous, user-driven direct-manipulation feedback on a single always-visible surface, not something replayed on every keystroke or repeated hundreds of times a day the way a keyboard shortcut would be. This is also the project's implementation of the transitions.dev "3D tilt" pattern named in the checkpoint-A motion mandate (see "Motion & the taste toolchain" below).

### Scannability instrument — what the engine actually exposes (P4 founder round 3, note 3)

`ScannabilityChip`'s clean-state metadata line (`● Scannable · V{version} · ECC {effectiveEcc}`) reads from two different places, which is worth recording precisely since it's easy to assume both numbers come from the same call:

- **`effectiveEcc`** comes straight from `ScannabilityReport` (`scannabilityReport()`, `packages/qr-engine/src/guardrails.ts`) — this was already wired pre-round-3 (`ControlsRail`'s Export section reads the same field).
- **`version`** (the QR symbol version, 1–40) is **not** on `ScannabilityReport` at all — `scannabilityReport()`'s return type only carries `score`, `issues`, `worstContrast`, and `effectiveEcc`. It IS exposed, just from a different call: `renderQr()`'s `RenderResult.version` (`packages/qr-engine/src/render.ts`). The Studio already calls `renderQr` (via `lib/preview.ts`'s `renderPreview` wrapper) for the live SVG, so round 3 threads `version` through `PreviewRenderResult` rather than touching the engine — no engine or schema change, per the standing hard rule. `version` is `null` on the render-error branch (payload over QR capacity): the placeholder render's version describes an unrelated payload, so there's nothing honest to report, and `ScannabilityChip` never mounts on that branch anyway.

### Print-truth staging (P9-U2 fix, `d2af287`)

**Rule:** surfaces bearing the scannability instrument or an export stage the QR on
its own paper mat; decorative theme-flipped inversion is reserved for atmosphere
(hero) with no instrument attached.

Found by orchestrator review, not by any automated gate: the landing playground's
default style and the brand-system section's `StudioWindow` mock were both staged on
`brandQrStyles.precision[mode]` — ink AND paper flipping with the *site's* color
scheme. In dark mode that put light ink on a dark `--qr-bg` mat, a genuine inverted-
contrast warning, on the one surface a visitor sees before touching anything and on
the one mock explaining that the instrument keeps you honest — so the instrument's
first reading for a dark-mode visitor criticized our own default, and the
brand-system section about honesty depicted the instrument flagging our own showcase
style. Fixed by pinning both to an explicit, non-transparent white paper mat with the
D13-locked light ink, independent of site theme — matching the real Studio's own
default new-kit style (also opaque, never the transparent-background path). The
`ScanNetwork` hero tile is exempt and unchanged: it carries no instrument and no
download, so its decorative dark-mode inversion (`brandQrStyles.precision.dark`) was
never the bug and stays exactly as designed — this is the "atmosphere, hero-only"
half of the rule. Full incident + fix detail: `docs/guides/p9-marketing.md`'s
as-built amendments; verification: `apps/web/e2e/marketing.spec.ts`'s landing
playground test (P9-U6) is a standing regression guard against this recurring.

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

- **Space Grotesk — resolved (removed at lock).** During P2 it was loaded but referenced by no theme file (almost certainly precision's pre-v2 display font, orphaned after the Inter refinement — `docs/STATUS.md` notes precision was "refined toward" Inter display). The D13 lock deleted it from `fonts.ts` along with the other exploration fonts; nothing loads it today.
- **Chart placement rule — resolved.** "Charts only in dashboard routes, never marketing" is a *bundle-size* rule from the design-system research (recharts ≈150–200 KB min) that applies to the **real P9 marketing site**: the production homepage must show analytics as a static screenshot/pre-rendered visual, not a live Recharts import. The `/explore/[brand]` pages are throwaway exploration surfaces (kept post-lock as the P9 seed, precision-only) and are exempt — their live chart exists to judge chart theming per direction.
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

**Verifying 3D transform direction (e.g. `rotateX`/`rotateY` sign) in this pane**
(round 3, `TiltStage`): the frozen-rAF issue above means you can't just hover and
screenshot to see which way a spring-driven tilt turns. Two techniques that work
around it instead of fighting it: (1) direct DOM style mutation still paints even
while `document.hidden` is `true` — `javascript_tool`-set
`element.style.transform = "rotateY(20deg)"` renders immediately, no rAF needed;
(2) `getComputedStyle(el).transform` on a rotated element returns the raw
`matrix3d(...)` — read it as **column-major** (each group of 4 numbers is one
column) and multiply by the unit vector for the axis you care about (e.g. `(1,0,0,0)`
for +X) to get that axis's exact `(x', y', z')` mapping; `z' > 0` means "moved toward
the viewer" (CSS's Z+ points out of the screen). This is exact and spec-guaranteed —
reasoning about rotation direction from memory is not (an earlier pass of `TiltStage`
had both axes backwards and looked *almost* plausible on paper).

## Motion & the taste toolchain (checkpoint A v4)

- **Skills are law for design work:** any agent touching UI/motion loads `.agents/skills/emil-design-eng/SKILL.md` first; all motion code must pass the `review-animations` skill gate before commit (it runs as an adversarial review pass — expect Block verdicts to be fixed, not argued). `transitions.dev` patterns are the preferred source for standard transitions: copy from the catalog (`.agents/skills/transitions-dev/`) rather than inventing.
- **Motion tokens** live in `globals.css`: `--motion-ease-out/in-out/drawer`, `--duration-press/fast/normal/slow`, bridged to Tailwind as `ease-(--motion-ease-out)` etc. No ad-hoc curves/durations. `components/brand/magic.tsx` exports `EASE_OUT` for motion/react usage; always animate full `transform` strings, never x/y/scale shorthands.
- **Known pitfall (verified live):** shadcn variants shipping `transition-all` silently override the press-feedback system — `transition-all` was removed from `button.tsx`/`toggle.tsx` variants; never reintroduce it.
- **App-phase transition mapping** (P4/P6, from the transitions.dev catalog): Modal open/close (create/edit dialogs), Toast (Sonner already themed), Panel reveal (studio side panels), Success check (code created/saved), Skeleton loader and reveal (analytics loading), Input clear with dissolve + Error state shake (form validation), Tabs sliding (code-type/pricing toggles), Toggle switch (settings), Notification badge (scan alerts), Number pop-in/Spinning counter (dashboard stats), **3D tilt** (studio preview artifact, `TiltStage` — round 3, see "Luminous staging grammar" above for the recipe).
- **Reference set for marketing craft** (founder-endorsed): lazy.so, genie.io (framed product windows, alternating sections), withpipeline.com (connective line-art + centered icon hero — our ScanNetwork descends from this), stellar.work (scale + restraint), transitions.dev (micro-interactions).

## The quality floor (founder-set, checkpoint A close)

The v4.2 hero (scan-network artwork + atmosphere + framed product windows + token-clean
motion) is the **minimum quality floor for every future surface** — marketing sections,
app screens, emails. A section that "works" but lacks this craft level is not done.
Verification for design rounds: breakpoint matrix AND a live pass in the founder's
Chrome (claude-in-chrome MCP — he has authorized this) AND an adversarial
"reads-as-broken" audit (orphaned decoration, dead space, text orphans, rhythm gaps).
Review rounds always happen against a production build (`next start`), never dev.
