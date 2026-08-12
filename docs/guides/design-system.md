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

### D13 amendment (P9.5-T3a): destination-identity palette

A second color family, additive to Layer 0/1 the same way the T1b type-scale amendment was
additive to Layer 2: `--dest-1`/`--dest-2`/`--dest-3`/`--dest-4` (declared in `:root`/`.dark`
beside the other Layer 1 colors, mapped through the *original* `@theme inline` block as
`--color-dest-1..4` — like every color token, they vary by mode and need the `inline`
re-evaluation, the same reasoning `--surface-tint` and the code colors already established).
`--dest-1` IS `--primary` (violet is always "destination one," the first demo chip); 2-4 are new
hues (amber/teal/rose), hand-picked to sit at the same lightness/chroma register as `--primary`
in both modes so none of the four reads as louder or weaker than the others.

**Where these may be used:** only the hero/network "which destination is currently live" story —
`ScanNetwork`'s chip border/dot/flowing-packet-stroke and `OrbitStage`'s node/chip/packet/trail
(`components/marketing/destination-hues.ts`'s shared label→hue map, so a given destination's
color never drifts between the two stages). **Where they may not be used:** anywhere in UI
chrome — buttons, links, focus rings, form controls, the accent gradient. D13's single-accent-
violet lock is unchanged; this is a second, narrowly-scoped family for one specific storytelling
purpose, not a reopening of the brand's "one accent" rule. A future surface wanting to depict
"several distinct live things at once" outside the hero should reuse this family (via the same
shared map, extended if it needs a fifth label) rather than inventing a third palette. Also
consumed at P9.5-T3b by `RetargetTheatre` (section 04's user-driven retarget demo), the third
surface in "one recurring hue vocabulary."

**`HUE_TINT` — srgb color-mix, board round 5 (live iOS Safari device testing).** The "active
chip" tint used to be two things, both since replaced: Tailwind's own opacity-modifier utilities
(`border-dest-N/50`, `bg-dest-N/10`) for border/background, and a hand-written `color-mix(in
oklch, var(--dest-N) 40%, transparent)` inside `filter: drop-shadow(...)` for the glow
(`HUE_GLOW`). Both failed identically on iOS Safari: `@supports (color: color-mix(in lab, red,
red))` reports satisfied (verified via a throwaway `tailwindcss@4.3.3` compile — Tailwind's
opacity utilities are generated behind exactly this `@supports` gate, with a solid-color
fallback for browsers that don't support `color-mix` at all), so the browser takes the color-mix
branch rather than the safe solid fallback, then paints that specific oklab/oklch-space mix as
fully transparent — worst inside a `filter:` context. Fixed by moving every active-chip
border/background/glow off both the Tailwind opacity utilities and the hand-written oklch mix
onto `HUE_TINT` (`{ soft, strong }` per hue, `color-mix(in srgb, var(--dest-N) 10%/50%,
transparent)`) and a color-mix-free `HUE_GLOW` (`drop-shadow(0 0 8px var(--dest-N))` — a solid
color needs no alpha to read as a soft glow once blurred), both consumed via inline `style`
rather than a class, since Tailwind has no way to choose the mix space per utility. `srgb` is a
plain, linear, universally-rendered space; verified live in WebKit at 390×844 post-fix
(`getComputedStyle` on the active chip resolved real `color(srgb ...)`/`drop-shadow(lab(...))`
values, not transparent).

Fixing this also caught a second, independent, same-severity bug in `OrbitStage` specifically:
its active chip pill is an SVG `<rect>`, and the old Tailwind classes set `background-color`/
`border-color` — properties with **no effect on an SVG shape's paint in any browser** (SVG rects
only respond to `fill`/`stroke`; confirmed empirically, not assumed, by computed-style inspection
of a throwaway styled `<rect>`). `HUE_TINT`'s values now feed `fill`/`stroke` directly for the
SVG consumer (`OrbitStage`) and `backgroundColor`/`borderColor` for the HTML-div consumer
(`ScanNetwork`'s `DestinationChip`, `RetargetTheatre`'s chip buttons) — same values, the CSS
property each element type actually needs. `HUE_CLASSES` (the plain-`var()` Tailwind lookup)
lost its `border`/`bg` fields as part of this — `dot`/`stroke`/`fill`/`text` are untouched and
still safe (verified: they compile to a bare `var(--dest-N)` reference, no `color-mix` involved).

### D13 amendment (P9.9-C0): the heading ladder

A third type-scale addition, additive to Layer 2 the same way the T1b family and `--text-h2-lg`'s sibling sizes above were: `--text-h2-lg` (clamp `2rem`→`3.25rem` over 360–1440, paired `--line-height: 1.08`/`--letter-spacing: -0.027em` — interpolated between the `h2` and `h1` pairings, same house 360–1440 slope convention). It fills the gap between `--text-h2` and `--text-h1` for `SectionHeading`'s `titleSize` prop, giving the landing a three-step heading ladder instead of the flat "every section is `h2`" default:

| Register | Token | Where (landing, `/`) |
|---|---|---|
| Loud | `--text-h1` | Section 12, Trust & privacy — the page's one section on the ink plate (`surface="ink"`) |
| Normal | `--text-h2-lg` | Sections 01–07, 09, and 13, plus the closing section |
| Quiet | `--text-h2` (the plain `SectionHeading` default) | Section 08 Scannability, 10 Comparison, 11 Open source |

`app/(marketing)/page.tsx` declares the ladder — every `titleSize` prop lives in that one file's JSX, not scattered as literals across each section component (each section only threads the prop through to its own `SectionHeading`). Same ownership model P9.7-V1 established for section ordinals: the file that decides page composition is the one place the visible hierarchy is legible as a block, not eleven independent judgment calls.

### D13 amendment (P9.10-D1): monochrome base + aurora kiss + contextual accents

The palette strategy superseding "single violet-blue accent" (board-approved at the D0 direction review; full record `qrcdn-internal/phases/p9.10-d-design-pass.md`, decision log entry under D13 in `docs/DECISIONS.md`):

- **Monochrome base — scoped to UI CHROME.** `--primary` is ink: near-black on light, near-white on dark (the CTA is one of the page's few true whites). `--ring`, `--accent`, and the sidebar family follow. Hierarchy comes from scale, space, and weight. On the dark field, pure white is a **budgeted material**: headings, buttons/CTAs, and QR paper — everything else builds subtlety from grayscale and alpha steps. Board clarification (P9.10-D3 review, 2026-08-09): the monochrome pull was "for our general UI to avoid a hard color contrasting against the aurora," NOT a ban on color — semantic and data color stay ("I think those add a bit of life to the UI, otherwise it's too grayscale").
- **The aurora kiss.** `--au-1..5` paint the `.aurora-edge` construction (globals.css, end-of-file block): a 1px mask-composite hairline carrying two counter-drifting conic arcs plus a 21s linear hue clock, with a blurred `::after` bleed twin (`.aurora-breathe` adds the opacity pulse). Motion is the THIRD construction (P9.10-D8): each arc makes a full rotation per 9s/13s cycle with a sinusoidal wobble baked into eight keyframe stops under LINEAR timing — speed swells and shrinks but never reaches zero. The first draft was a mechanical spin (board: too linear), the second eased alternate loops (wavy, but alternate loops have zero velocity at every turnaround and the beam visibly stalled — board, D8: "slows almost to a stop"). If you touch these keyframes: the wave must live in the angle SPACING, not the timing function, and each cycle's end angle must equal its start plus exactly 360 or the loop jumps. Since P9.10-D3 the SAME tokens also paint the ks/sdx gradient stacks (section 04's 18s sync-theatre continuum and section 03's dial sweep — formal family members; one aurora system page-wide). This is the marketing color moment and it is rationed: **at most 1 in 3 marketing sections**. **The census is CLOSED at 4 of 13 (P9.10-D7).** The four: the hero (input + glow), 03's dial sweep, 04's sync theatre, and THE ENDING. A fifth placement anywhere on the landing is a defect, not a judgment call — any later spend requires a retirement first.

  The ending counts as ONE moment even though it spends the aurora twice, on the precedent the hero already set (its input and its glow were counted as one because the glow shares its moment). Sections 13 and 14 are adjacent, share a surface, and read as a single closing sequence. Two constructions live there and they are deliberately different in kind: **`.aurora-plate`** marks the featured plan and is STATIC (a still frame of the family — two soft tint pockets plus a hairline sweeping four of the five hues, on `.lit-stroke`'s mask-composite mechanism), because a kiss is a moment and not a texture; **`.cta-kiss`** carries the animated one on the page's last ask, composing `.aurora-edge` AND `.aurora-breathe` so both ends of the page run one identical animation list. Compose those classes rather than redeclaring their animations — a local `animation` here would silently escape the `prefers-reduced-motion` guard that covers `.aurora-edge::before/::after`.

  `.cta-kiss` is built on the defect it replaced: that button already carried `shadow-primary/25`, authored in the violet era, which had been rendering a white halo around a white pill ever since this amendment made `--primary` compute identical to `--foreground`. The halo stayed and became the aurora.

  One geometry lesson from that round, worth keeping: **the hero's glow numbers do not transfer.** `.hero-glow` is 0.4 opacity at 34px blur over `.hero-fan-zone`, a box a few hundred pixels across. The same values spread over a full-width section stop being a bloom and become a coloured wash over the whole screen. `.closing-glow` is the same hues and the same light, concentrated: one ellipse, 0.17 opacity, 84px blur, sized to the room it lights. Reduced motion gets a static stroke. Buttons inside an aurora moment carry weight 500 (the ui Button's default `font-medium` already satisfies this — do not bold them up).
- **Contextual accents.** Scoped color that owns its moment and never joins the system palette: `--dest-1..4` destination identity (dest-1 now pins the old violet literally — it must not follow `--primary` to grey), the FULL chart family `--chart-1..5` (chart-1 rejoined color at P9.10-D3 — the D1 flip had greyed it and the /codes graphs visibly died; it now pins the brand-violet literals, dest-1's values), `--ok` the semantic-positive green (verdict checkmarks, the bench's yes-chips; values shared with the code palette's string green — #107d32 light / #00ca52 dark — one green family, two names for two jobs), the Vercel-extracted code syntax palette (`--code-*`, P9.10-D2), and `--destructive`. New contextual accents need their own recorded rationale.
- **Motion additions.** `--motion-ease-spring-out` (0.31, 1.84, 0.64, 1) / `--motion-ease-spring-back` (0.34, 1.5, 0.64, 1): the asymmetric spring pair extracted from the transitions.dev card-stack-hover reference — eager out, soft settle. Consumed by the hero fan; available to any spread/settle interaction.
- **Type ladder v2 + rhythm.** Every heading ceiling +10-18% (display 94→104, h1 60→68, h2 44→50, h2-lg 52→60, h3 26→29 at 1440); `--spacing-section*` maxima up ~15% in the same spirit. Floors unchanged.
- **The hero idiom set** (all zero-JS, `globals.css` end block + `components/marketing/hero.tsx`): `hero-stage-*` staged mount entrances (the "considered load", re-cut at P9.10-D8: a beat of dark field, then the studio eyebrow → claim → sub → the input arriving ALREADY LIT → the fan dealing out under its glow — D1's ignite-last beat retired on the board's note that the aurora should be playing on objects as they load in; backwards fill so served markup never hides), `hero-fan`/`hero-mat-1..3`/`hero-paper` (real engine renders on white mats — pose via per-mat custom properties and explicit classes, never nth-child; entrance on the mat, infinite float on the paper, spring hover on the fan), `hero-glow` (steady two-radial aurora under-light), `hero-input` (the aurora-edged URL form; field darker than the panel register so the placeholder reads). Gradient "lit-from-above" strokes on ordinary monochrome controls (D0 note 3) shipped as `.lit-stroke` with section 09 (P9.10-D2) and extended at D3 to the studio dial chips, the kit control card, the bench panel, and the bench's parity chips — RATIONED to surfaces that read as touchable or instrument, never paper mats, never everything.
- **Hover microanimations** (P9.10-D9, the How It Works grid is the reference implementation — `globals.css`'s `.hw-*` block): the second pass's pattern for card-level motion. The rules: (1) ONE micro per card, and it must demonstrate the card's concept, not decorate it; (2) every interactive rule lives inside a single `@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)` gate — touch and reduced-motion get the complete, polished base state; (3) base-state transitions are declared OUTSIDE the gate so the return leg always matches the out leg; (4) transform and opacity only, with stages fixed-height and entering elements occupying layout at opacity 0, so no micro can ever move layout; (5) looped micros are APPLIED on hover rather than unpaused — a paused animation with a negative delay freezes its first paint mid-cycle (the play-state pattern is only safe when the idle layer is invisible, as the index wall's aurora text is). The four shipped micros: a crossfade between two real engine renders (restyle), the hero's spring pair miniaturized (fan spread), a drawn strike + risen destination (the next repoint, deliberately NOT the `line-through` class the e2e pin counts), and a phase-offset transform wave (scans arriving).
- **The pixel field** (`components/brand/backdrop.tsx`, P9.10-D8): the brand's module texture, board-named alongside the aurora as the two brand elements. A seeded-LCG scatter over a 12px module grid — density pooling at the top and the left/right edges, mixed one- and two-module cells, per-cell alphas — replacing the uniform 96px `<pattern>` tile the backdrop carried since P9. MONOCHROME always (currentColor at 0.05/0.06 element opacity); the aurora stays the only colour event on any surface it backs. Seeded, never `Math.random()`: the markup must be byte-identical across builds. Guardrail: it must never read as a scannable code — no finder rings, no quiet zone, no symbol-shaped clusters (the QR solidity rule bans fake codes; this stays too sparse and structureless to be one). Ships everywhere `HeroBackdrop` composes: the hero, /login, /developers, /u, /p, /auth/confirm, the 404.
- **Aurora TEXT** (`.aurora-text` + `.aurora-text-layer`, D0 note 1, built at P9.10-D4 for the landing's index wall — the D1 exploration drew it but the board picked the print run, so nothing had landed). The third member of the beam family. Built on the aurora EDGE's mechanism, not on shimmer-text's: the D1 draft slid one gradient band across on `background-position`, and the board's note was that it "feels too linear gradient moving sideways, not their wavy color motion that feels alive." A sliding band has one axis and one period, so the eye locks onto the loop. This paints four radial hue pockets that wander on two axes over 7.5s/9.5s/11s/13s, eased and alternating, under a 24s hue clock — the composite period is their common multiple, so nothing visibly repeats. Two rules learned building it: **the painted box must be shrink-wrapped to the glyphs** (`justify-self: start` on the grid item — pockets are sized in percentages of the box, so a stretched box makes every pocket wider than the word and each frame paints one flat colour), and **the paint goes on a duplicate `aria-hidden` layer, never on the readable text** (`background-clip: text` needs `color: transparent`, and a real element beats `content: attr()` because Safari exposes pseudo-element content to the accessibility tree). Animations declared paused, running only on hover, so at most one instance ticks: these are `@property` custom-property animations, which repaint on the main thread every frame. Governed by note 1's own rule (never in the same moment as an aurora component), NOT by the section census — the census counts the resting kiss, and a hover state is not part of what a visitor sees without interacting. Flagged to the board at the D4 build; census stands at 3/13.
- **In-page anchor travel** is smooth site-wide (`html { scroll-behavior: smooth }`, `auto` under reduced motion), added at P9.10-D4 with the index wall. Board's reason: a row in an index should travel to its section "so visitors know they can scroll back, not think they're on a new page." A jump cut gives no sense of distance. Set on the root because the document performs the jump, not the link.
- **The paper plate** (`surface="paper"`, P9.10-D6) is the page's ONE light band, and the loud surface move this guide had been predicting since the ink note below. Five `:root` tokens, declared once and never redeclared in `.dark` — paper does not have a dark mode. `--paper-foreground` is deliberately `--qr-fg`'s own ink (`#131316`, the D13-locked precision ink every certified code prints in), so the band's text and the band's codes are the same ink on the same sheet. Contrast, computed by painting each colour into a canvas and reading the pixel rather than by a hand-rolled conversion: foreground **16.78:1**, muted **6.21:1**, border **3.63:1**, `--ok` green **4.82:1**, `--qr-fg` **17.04:1**. **The border is two tokens and the audit is why:** a single hairline cannot serve both roles on a near-white plate, because the threshold for WCAG 1.4.11's 3:1 is 47% alpha and a 47%-plus line is a dark rule, not a hairline. So `--paper-border` covers anything that must be IDENTIFIABLE (control edge, container, focus ring) and clears 3:1, while `--paper-rule` is decoration only — explicitly exempt under 1.4.11, 1.35:1, and never the only thing marking a control. Re-run the audit if any value moves. Trap this round caught before it shipped: `MonoStrip`'s `ModuleMark` was `text-primary` *on purpose*, documented as safe because primary is near-white in dark — on paper that is near-white on near-white, so the paper branch repoints it at the plate's ink.
- **The ink plate retired at P9.10-D6** and is historical record, not vocabulary. It was the page's one inverted DARK plate from P9.7-U1, and it never delivered the strong surface event it was added for, for the reason this guide had already written down: on a dark page an inverted plate reads as a subtle deepening. Section 12 was its only consumer anywhere on the site, so when 12 moved to paper the four tokens, the `SURFACE_CLASS` entry, the union member and every `tone="ink"` branch came out in the same commit rather than being left as unreachable vocabulary.
- **A rule that must beat a Tailwind utility belongs in `@layer utilities`.** Banked at D5 after `variant="centered"` spent four rounds not centering anything: its rules lived in `@layer components`, and `SectionHeading`'s own `md:flex-row` is a utility, so the layer lost regardless of selector specificity. The components layer cannot win however specific the selector is.
- **The print mat** (`components/marketing/print-mat.tsx`, P9.10-D5). The printed code as a primitive: ink on white paper, one engine run per payload shared by every instance through `<symbol>`/`<use>`, hierarchy from DEPTH and never hue (two shadow tiers, `rest` and `raised`). Extracted once it existed three times over — the hero's mats at D1, the filmstrip's stations at D4, section 05 at D5. **The hero's mats are deliberately excluded**: they carry the D1 load choreography and pose classes, and pulling a proven entrance sequence through a new abstraction would risk it for no visual gain. Two implementations is the right number, one for codes that sit still and one for codes that get dealt. Defaults (8.3% padding, flat 14px radius, the two tiers) are chosen to reproduce the filmstrip's `QrNode` exactly, so its adoption carried no visual delta — proven at the D5 build by diffing the section's rendered markup before and after, which came out to six differences in the whole section, all `rounded-[14px]` becoming an inline `border-radius: 14px` at the same computed value.
- **`variant="centered"` actually centers as of P9.10-D5**, and did not before. `SectionHeading`'s own class list carries `md:flex-row md:items-end md:justify-between`; those are UTILITIES, and Tailwind v4's utilities layer outranks the components layer the centered rules lived in, so from `md` up `flex-direction: column` never applied. Every centered section was a left-pinned flex row with only its inner text centered (measured: heading box 1088px, inner block 688-892px, left gap 0). It went unnoticed for four rounds because no centered section had ever passed an `aside`/`actions` slot; section 05 passes a doorway button and `justify-between` threw it to the far right, which was finally visible enough to diagnose. The rules now live in `@layer utilities` and win on specificity instead, (0,3,0) against `.md\:flex-row`'s (0,1,0). **If you add a rule that has to beat a Tailwind utility, it belongs in the utilities layer — the components layer cannot win no matter how specific the selector is.**
- **The index wall** (`components/marketing/index-wall.tsx` + `lib/landing-index.ts`, P9.10-D4, section 02). The landing's six anchored sections at the ordinals `app/(marketing)/page.tsx` gives them, each row naming that section's own eyebrow verbatim and carrying one sourced description. The registry RECORDS ordinals it does not own, so `e2e/marketing.spec.ts` cross-checks every row against the eyebrow the target actually renders — drift is a red test, the same failure mode P9.7-V1 fixed for the eyebrows themselves. Its heading is deliberately quieter than its rows (`titleSize="h3"` over `text-h2` rows): an index's contents outrank its masthead, and it is the one section on the page that points rather than argues.

## Dark mode mechanics

- Class strategy: `@custom-variant dark (&:is(.dark *));` in `globals.css` — Tailwind's `dark:` variant fires off a `.dark` ancestor class, not `prefers-color-scheme` directly.
- **The `.dark` class is STATIC on `<html>`** (`app/layout.tsx`, P9.9-C0.6): there is no theme provider, no toggle, no OS-preference resolution anywhere. `next-themes` is removed from the dependency tree. `globals.css` pairs the static class with `html { color-scheme: dark }` for UA chrome (scrollbars, form controls). Because the class is in the server-rendered bytes, no theme flash is possible pre-hydration or with JS off (`marketing.spec.ts` pins this against the raw served HTML).
- Historical: brand + dark used to combine via `.dark [data-brand="x"]` selector patterns in the pre-lock explore era; D13's lock removed the brand files, and C0.6 removed the runtime theming.

### The product is dark-only (board directive, 2026-08-06 / P9.9-C0.5 → C0.6)

- The directive arrived in two steps the same day: first marketing-only (C0.5: a forced-dark wrapper + `html:has` rules + portal-content `dark` classes + the toggle rehomed to AppNav), then **app-wide** (C0.6), which superseded and DELETED all of that machinery — one static class replaced it. If you find references to `data-force-dark` or a ThemeToggle, they are stale.
- The board's rationale: designing every surface twice adds complication for no gain; dark carries the glow language better; white QR codes pop harder on a dark page (QR's black-ink-on-white convention makes the inverted mat the distinctive one); and with ONE register, what the studio previews is exactly what every surface renders — the studio's transparent-background contrast baseline is now always evaluated against the dark mat (`studio-shell.tsx`), not a per-theme resolution.
- **The light `:root` token block stays** as the base layer. It is not dead: hard-coded LIGHT "reversed" sections (a "paper plate", the inverse of `surface="ink"`) are available design vocabulary for alternation where a C-round exploration earns it — scoped token re-declaration per section, never a user toggle. Inversion consequence: on the dark page the ink plate reads as a subtle deepening, so the paper plate is now the loud surface move.
- The pre-rendered light/dark QR SVG pairs (`qr-tile.tsx`, `filmstrip.tsx` `dark:hidden`/`dark:block`) still render correctly (dark variant shows); the light variant is dead payload everywhere now and gets stripped opportunistically as C rounds touch each section.

## Current brand state (as of this doc)

- **Checkpoint A is closed.** "Precision instrument" won the three-way exploration — Apple-esque register, formula extracted from lazy.so / genie.io / stellar.work: one enormous plain-spoken headline owning the viewport; extreme restraint (single accent, hierarchy from scale/space only); quiet gray subcopy; one strong CTA; eyebrow-labeled benefit sections; product visuals in soft frames. The v4.2 hero is the codified quality floor for every future surface (see "The quality floor" below).
- The D13 lock protocol has executed: precision's Layer 0/1 values live directly in the base `:root`/`.dark` blocks in `apps/web/app/globals.css` (Inter display + body, JetBrains Mono accents, deeper dark surfaces). The original violet-blue accent (`oklch(0.51 0.23 268)` light / `oklch(0.62 0.21 268)` dark) was retired from the base by the P9.10-D1 monochrome amendment above — it survives only as the pinned `--dest-1` destination-identity literal. `warmth.css`/`bold.css` and their `[data-brand]` selectors are deleted, along with the Fraunces/Hanken Grotesk/Bricolage Grotesque/Space Grotesk font loaders — `apps/web/app/fonts.ts` now exports only `inter` and `jetbrainsMono`.
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
the P9 phase record's U5 migration table, private ops repo). The custom, domain-specific
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

**`section.tsx`** (P9.5-T1b, landing-migrated at P9.5-T3a) — the landing's section
primitive: `Section`/`SectionHeading`/`SectionBody`, built against the token
families above. Full contract (variants, rhythm/surface/divider options, the
dead-measure/centered-count/hairline rules) is doc-commented in the file itself
rather than duplicated here. As of T1b its only consumer was the `/developers`
pilot below; T3a migrated every landing section onto it (how-it-works, studio/
playground, brand system, dynamic codes, analytics, API, pricing teaser, closing)
— see "Landing copy & hero v4 (P9.5-T3a)" below for that unit's copy/composition
rules. Shared with it: **`lib/highlight.ts`/`lib/code-theme.ts`/`code-block.tsx`**
(shiki syntax highlighting, server-rendered, themed off the code-color tokens
above) and **`developers/`** (the extracted `/developers` page pieces —
`lib/api-reference.ts`'s typed endpoint data, `components/marketing/developers/`'s
`Section`/`Endpoint`/`InlineCode`/`Method`/`api-toc.tsx`), the first real page
built against the docs-grid containers (`max-w-page`/`max-w-docs`) and type
scale (`text-h1`/`text-h3`) from this unit.

**Content-ascended at P9.5-T5**: `lib/api-reference.ts` gained a
`params`/`responseFields`/`errors` model per endpoint (typed `ApiParam`/
`ApiResponseField`/`ApiEndpointError`, the shared "code object" response
shape compile-time coupled to the real `ApiCode` type from
`app/api/v1/_lib/to-api-code.ts` via `Record<keyof ApiCode, ...>`, so a
field the API stops returning fails `pnpm typecheck` rather than a manual
review) plus a small `QUICKSTART_CREATE_EXAMPLE`/`QUICKSTART_REPOINT_EXAMPLE`
pair for the new Quickstart section. `components/marketing/developers/`
gained four siblings to the T1b set above: `quickstart.tsx` (the five-step
walkthrough), `params-table.tsx`/`fields-table.tsx`/`errors-table.tsx`
(the new per-endpoint tables `endpoint.tsx` now renders), and
`callout.tsx` (a small "by design" note, first used to frame the
404-indistinguishability property as a feature rather than a limitation).

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
| `magic.tsx` | `EASE_OUT`, `useRevealVariants`, `Reveal`, `ModuleMark`, `Eyebrow` | No (`"use client"`, uses `motion/react` + `useReducedMotion`) | Shared motion language (entrance variants, scroll reveal). `ModuleMark`/`Eyebrow` (P9.7-U1) are re-exports of `marks.tsx` below, kept here so every pre-existing `@/components/brand/magic` import site is unaffected — this file's own remaining direct export is `Reveal` (still used by `/login`) plus the hook/curve pair |
| `marks.tsx` | `ModuleMark`, `Eyebrow` | **Yes** — presentational, no hooks | The brand-mark pair, moved out of `magic.tsx` at P9.7-U1 (neither used a hook; they only lived in a `"use client"` file because `Reveal` did). `components/marketing/section.tsx` imports `Eyebrow` from here directly, post P9.7-U1's reveal fix — `Section`'s whole module tree is now client-boundary-free. Every other consumer still imports either name from `@/components/brand/magic` unchanged |
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
- **`wide` prop (P9.5-T3b).** `ArtifactStage` accepts an optional `wide?: boolean` (default `false`, byte-for-byte unchanged default sizing) that scales the outer-field/inner-halo layers up slightly (outer `110%/120%`→`124%/136%`, inner `108%/108%`→`118%/120%`). Added for the landing playground's preview stage specifically — its mat sits closer to the section's own edges than this component's original consumers, so the default bloom read a touch tight there. Two fixed literal class strings per layer (`wide` ? one set : the other), not a computed/interpolated percentage — Tailwind's compiler needs every arbitrary-value class to appear as a literal string in source to generate it (same constraint `destination-hues.ts`'s own doc comment calls out for `` `bg-dest-${n}` ``-style template strings).
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
half of the rule. Full incident + fix detail: the P9 phase record's as-built
amendments (private ops repo); verification: `apps/web/e2e/marketing.spec.ts`'s landing
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

## Motion & the taste toolchain (checkpoint A v4)

- **Skills are law for design work:** any agent touching UI/motion loads `.agents/skills/emil-design-eng/SKILL.md` first; all motion code must pass the `review-animations` skill gate before commit (it runs as an adversarial review pass — expect Block verdicts to be fixed, not argued). `transitions.dev` patterns are the preferred source for standard transitions: copy from the catalog (`.agents/skills/transitions-dev/`) rather than inventing.
- **Motion tokens** live in `globals.css`: `--motion-ease-out/in-out/drawer`, `--duration-press/fast/normal/slow`, bridged to Tailwind as `ease-(--motion-ease-out)` etc. No ad-hoc curves/durations. `components/brand/magic.tsx` exports `EASE_OUT` for motion/react usage; always animate full `transform` strings, never x/y/scale shorthands.
- **Known pitfall (verified live):** shadcn variants shipping `transition-all` silently override the press-feedback system — `transition-all` was removed from `button.tsx`/`toggle.tsx` variants; never reintroduce it.
- **App-phase transition mapping** (P4/P6, from the transitions.dev catalog): Modal open/close (create/edit dialogs), Toast (Sonner already themed), Panel reveal (studio side panels), Success check (code created/saved), Skeleton loader and reveal (analytics loading), Input clear with dissolve + Error state shake (form validation), Tabs sliding (code-type/pricing toggles), Toggle switch (settings), Notification badge (scan alerts), Number pop-in/Spinning counter (dashboard stats), **3D tilt** (studio preview artifact, `TiltStage` — round 3, see "Luminous staging grammar" above for the recipe).
- **Reference set for marketing craft** (founder-endorsed): lazy.so, genie.io (framed product windows, alternating sections), withpipeline.com (connective line-art + centered icon hero — our ScanNetwork descends from this), stellar.work (scale + restraint), transitions.dev (micro-interactions).

## Landing copy & hero v4 (P9.5-T3a)

- **No em dashes, anywhere in customer-facing copy** (board rule, copy deck v3).
  Restructure with colons, periods, or commas instead — en dashes inside numeric
  ranges (`5-10`, `2020-2026`) are unaffected; this is about the em dash
  specifically, as a known AI-writing tell. Applies to every string a visitor
  reads: headings, ledes, mono strips, button labels, alt text, meta
  descriptions. Checked per-string at review time, not by an automated gate yet
  — grep for the literal character before calling a copy-touching unit done.
- **Poster-H1 principle.** The hero's `text-display` clamp (globals.css, P9.5-T3a
  type bump: 48px → 94px over 360–1440, up from 44 → 88; `text-lede` bumped in
  tandem, 17px → 19px, down slightly from a 20px ceiling so the sub stays
  "slightly bigger," not competing with the headline) exists so a two-line,
  plain-spoken headline can own the viewport at genuinely poster scale — "The
  modern" / "QR platform." reads as a category claim, not a product blurb.
  `titleAs="h1"` on `SectionHeading` reaches this same scale; it's reserved for
  the one true page-title context per page. The hero itself doesn't use
  `SectionHeading` (its CSS `hero-enter` entrance system is incompatible with
  `SectionHeading`'s `Reveal` wrapping) but shares the `text-display`/`text-lede`
  utilities directly.
- **Hero v4 recipe (current).** No eyebrow. Two-line H1, `AccentText` on line two
  only. One-sentence sub at `text-lede`. Two CTAs (primary pill + ghost). A
  five-chip mono pillar strip (`components/marketing/pillar-strip.tsx`) closes
  the hero as its own `hero-enter` stagger step (studio/dynamic-codes/analytics/
  api section anchors + the GitHub repo). Desktop/compact breakpoints (md and up)
  keep the `ScanNetwork` traces, now tinted per-destination via the
  destination-identity palette above; <md swaps to `OrbitStage`
  (`components/marketing/orbit-stage.tsx`) — a single packet riding a ring
  between three destinations, ported from the board-approved A1-R2 reference
  artifact (geometry/easing/trail math kept faithful, DOM manipulation adapted to
  React refs + rAF). Exactly one of the two auto-advances at any given
  breakpoint — they're breakpoint-exclusive, which is what keeps this inside the
  "one auto-advancing element per viewport" motion budget. `QrTile`
  (`components/marketing/qr-tile.tsx`) is the one shared artifact both stages
  render: payload is the marketing site itself (`HTTPS://WWW.QRCDN.COM`, scanning
  the hero lands you on the page you're already looking at), no slug caption
  underneath (there's no destination slug to caption when the payload IS the
  site).
- **Tagline removed.** The mono line that used to run under the network
  ("destination updated live...") is gone from every breakpoint — its content
  resurfaces as part of section 04's dynamic-codes story instead of sitting as
  hero decoration. Don't re-add a caption under the hero artwork; if a future
  unit wants one, it belongs in the section that story is actually about.
- **Board round 5 (folded into P9.5-T3b).** Three small hero-level fixes,
  live-device-testing-driven: the accent line's trailing period is dropped
  ("QR platform." → "QR platform" — a copy call, not a re-opening of the
  no-em-dash rule above); the pillar strip is now `hidden md:block` (it was
  pushing `ScanNetwork`/`OrbitStage` down, and the board wants the orbit
  stage higher above the fold on mobile — unchanged at `md` and up); `QrTile`
  (`components/marketing/qr-tile.tsx`) tightened its inner paddings (card
  layer 14px→10px, qr-box layer 10px→8px, outer tile footprint/border
  untouched) so the printed code reads meaningfully larger in the same
  footprint, landing at the top of the board's "15-20% larger code area"
  ask (~20% at the hero's own ~176px tile) — the qr-box's own padding is a
  presentational margin only, not the scannability quiet zone (`renderQr`'s
  SVG already bakes in the real D6 quiet zone regardless of this box's CSS
  padding). A fourth round-5 fix — `OrbitStage`'s active-chip styling
  invisible on iOS Safari — is documented in the destination-identity
  palette amendment below, since it's a `HUE_TINT`/color-mix fix, not a
  layout one.

## Landing product-story bodies (P9.5-T3b)

T3a migrated every landing section onto `Section`/`SectionHeading` and carried the
deck's heads/ledes/mono strips, but left every section **body** untouched. T3b
rebuilds four of them (02 studio, 03 brand system, 04 dynamic codes, 06 analytics)
per the board's own body-level notes ("studio and brand system builders nearly
identical", "dynamic codes very bland, no real magic", "analytics: would love a bit
more"). Patterns worth carrying forward, by section:

- **02 · Studio (`playground.tsx`) — preset shelf.** Three named `ToggleGroup`
  presets ("Café Norte", "Second Story", "Personal" — the same three demo-kit
  identities `StudioWindow` used to define, kept alive here even though that
  component itself is retired this unit) set `dots.style`/`eyes.frame`/ink
  immediately (discrete values snap; their own selected-state chrome cross-fades
  via a plain `transition-colors`) and tween `sizeRatio` (the one continuous
  control) over 300ms. **The tween is `setInterval`-driven, not
  `motion`/`framer-motion`'s rAF-based `animate()`** — a real bug, not just a
  testing artifact: `animate()`'s `onUpdate` callback only fires on animation
  frames, which a backgrounded/hidden tab never produces (verified two ways:
  `requestAnimationFrame` scheduled in this repo's own Claude-browser-pane test
  tab never fired even after 10+ seconds, while `setTimeout` fired reliably;
  and the preset chip visibly never reached its target value end-to-end through
  the UI before the fix). A real user backgrounding their tab mid-click would hit
  the exact same stall in production. Fixed with a hand-rolled `cubicBezierEase`
  (Newton-Raphson solver matching the project's real `EASE_OUT` curve exactly,
  same "hand-roll the exact curve locally" precedent as `orbit-stage.tsx`'s own
  `easeInOutCubic`) driving a plain `setInterval` loop — `setInterval` keeps
  firing regardless of tab visibility, so the tween (and therefore the live QR
  re-render it drives on every tick) can't get stuck. `motion.div`/`motion.circle`
  declarative `animate` props (the rest of the codebase's motion, including
  `RetargetTheatre` below) are unaffected by this finding — they're a completely
  different, well-precedented usage (OrbitStage itself already gates its own
  logical state transitions on rAF completion the same way), and this repo's
  hidden-test-tab rAF freeze is a known, already-documented testing-only
  limitation for that usage (see "Testing note" above), not evidence those call
  sites are broken. The redesign was specifically about the ONE spot on the page
  that used `animate()` imperatively for a bespoke numeric tween with no existing
  precedent to preserve.
- **02 · Studio — scannability meter.** A compact contrast-ratio bar plotting
  `scannabilityReport(style).worstContrast` against `CONTRAST_ERROR_MIN`/
  `CONTRAST_WARN_MIN` (newly exported from `@qrcdn/qr-engine`, see
  `docs/guides/qr-engine.md` — added specifically so a live UI never re-types
  these numbers). Domain is a fixed 1:1-10:1 display range (not the theoretical
  21:1 max) purely so the threshold ticks land somewhere legible; the number
  rendered as text is always the real, unclamped ratio.
- **02 · Studio — ink-hued bloom widens.** `ArtifactStage`'s new `wide` prop
  (see "Luminous staging grammar" above), plus the single Download button +
  format `Popover` (SVG/PNG) with a brief `Check`-icon success state
  (`justExported`, auto-reverts after 1.6s) replacing the old two side-by-side
  export buttons.
- **03 · Brand system (`kit-contact-sheet.tsx`) — contact sheet, not a second
  builder.** The board's exact note ("studio and brand system builders nearly
  identical") retired `StudioWindow` outright (zero other importers,
  grep-verified) in favor of one shared `QrStyle` (`KIT_STYLE`, rounded dots +
  leaf eyes + the D13-locked ink) rendered via `renderQr` at **module scope**
  across 5 print artifacts (menu tent, sticker, ticket stub, table talker,
  poster corner) with different payloads — "set once, appears everywhere" shown
  with real bytes, not five independently hand-tuned mocks that could drift.
  Zero client JS. Mats rotate ≤3deg (Tailwind's own `rotate-1/2/3` steps, no
  arbitrary values needed) with a `motion-safe:` (not JS) hover-relax
  micro-interaction — CSS-only motion still has to respect reduced-motion, and
  `motion-safe:`/`motion-reduce:` are the zero-JS way to do that in a server
  component. The playground's "Café Norte" preset (above) deliberately mirrors
  this file's `KIT_STYLE` exactly (same dots/eyes/ink), a small continuity
  thread between the two sections.
- **04 · Dynamic codes (`retarget-theatre.tsx`) — the RetargetTheatre.** "Hero
  watches, theatre drives" (board round 3): same visual grammar as
  `ScanNetwork`/`OrbitStage` (a `QrTile`, destination chips in their shared hue,
  a traveling packet) but fully visitor-driven, not auto-advancing — doesn't
  touch the page's "one auto-advancing element" motion budget (the hero orbit
  keeps that slot). The packet's curved travel path and its 3-keyframe
  `cx`/`cy` animation are **derived from the same cubic-bezier control points**
  (not eyeballed separately) — same discipline as `dashboard-window.tsx`'s
  `smoothPath`. Chip labels are width-capped + wrap-allowed
  (`max-w-[10rem] break-words`, not `whitespace-nowrap`) rather than positioned
  via a percentage-of-viewBox guess for how much room the longest label needs —
  a fixed cap can't overflow regardless of container width, verified at 375px.
  `QrTile` itself is "sacred-still": nothing in this component ever wraps it in
  a motion prop. Retired the section's old three feature-icon pills (Pause/
  Protect/Expire) — the theatre plus the state-cards below now embody that same
  claim concretely (a paused/archived code IS the `/u` fallback state-card, a
  protected one IS the `/p` gate, an expired one IS the dashboard "Expired"
  pill) instead of just naming it.
- **04 · Dynamic codes (`state-cards.tsx`) — truthful, not illustrative.** Every
  card mirrors a real route's actual copy/structure, checked against the source
  before drawing anything (`app/u/[slug]/page.tsx`, `app/p/[slug]/page.tsx`).
  Where there's no real distinct page for a claimed state — an expired code
  decides `{kind: "unclaimed"}` in `redirect-decision.ts` and lands on the exact
  same `/u` page as paused/archived, so there's no scan-facing "expired" screen
  to depict — the honest move is showing the state where it's real instead
  (the owner-facing dashboard's "Expired" status pill), captioned accordingly
  rather than implying a scanner sees something that doesn't exist. That pill's
  label/classes are imported from `components/codes/codes-table.tsx`'s
  `statusMeta` directly rather than hand-copied, so this mock can never
  silently drift from what the real dashboard renders (`lib/access.ts`'s
  `codeState`/`isCodeExpired`, which that function calls, are pure/zero-import —
  safe to reach from the marketing bundle). Fake input/button chrome inside each
  card is `aria-hidden` (decoration only, same convention `ProductWindow`'s
  traffic-light dots use); the real information (heading, route label) stays
  regular readable text, not a heading element (these are mockup chrome, not
  genuine page structure — a screen-reader user navigating by heading shouldn't
  hit fake ones). Found in passing: `/u/[slug]/page.tsx`'s own subcopy has a
  pre-existing em dash — out of this unit's scope (not a landing section) to
  fix, so this card's mirrored copy uses a comma instead rather than
  perpetuating it onto a new surface.
- **06 · Analytics (`dashboard-window.tsx`) — one window, more instrument.**
  Breakdown rows (Top countries/Devices) are a bar-list enrichment beyond what
  the real per-code `Breakdown` component renders (label+count only, no bars) —
  this static window has never been a literal screenshot of the authenticated
  app (it already diverges for bundle-size reasons, see the file's own P9.5-T1a
  note), so the enrichment doesn't need pixel parity, only plausible honesty:
  Devices is a closed enumeration and deliberately sums to the exact chart
  total; Countries is an open "top 4 of many" list and deliberately does not.
  Third "Today so far" stat tile carries a `motion-safe:animate-pulse` dot —
  ambient state, ties into no auto-advancing narrative, still gated behind
  reduced motion because it's still motion. Retention row moved from a
  `MonoStrip` below the section into a footer strip inside `DashboardWindow`'s
  own chrome (bookending the header bar) — numbers still read from
  `PLAN_LIMITS` only, just imported one file over.

## Landing credibility sections (P9.5-T3c)

T3a/T3b built every section that already existed in the pre-deck landing;
this unit fills the four gaps the deck always had reserved for it (05
guardrails, 08 comparison, 09 open source, 10 manifesto) and rebuilds 07
API's body, completing the 01-11 ordinal sequence. Two reusable patterns
worth carrying forward, plus the surface/divider bookkeeping this unit's
insertions required:

- **Authored data visuals plot the REAL axis, not a convenient one.**
  Section 05's threshold plot (`guardrails-plot.tsx`) could have used the
  `CONTRAST_ERROR_MIN`/`CONTRAST_WARN_MIN` pair already exported for the
  playground's own contrast meter (P9.5-T3b) — same shape of constant, ready
  to import. It doesn't, because qr-engine.md is explicit that contrast has
  no decode-campaign data behind it (`scannabilityReport`'s contrast rule
  "must stay analytic" — never validated by a round-trip). The actual
  2026-07-21 adversarial campaign measured *effective knockout ratio*
  (`LOGO_EFFECTIVE_WARN`/`LOGO_EFFECTIVE_ERROR`, additively exported this
  unit for exactly this purpose), so that's the plotted axis — the honest
  reading of "use the REAL campaign data," not the reading that happened to
  require less new engine surface area. Where the guide's own data is
  coarser than per-point (an aggregate pass-max/fail-min boundary, not 160+
  itemized results), the plot says so in its own caption rather than
  implying false precision, and the illustrative scatter (fixed, authored
  values, never `Math.random()`) never places a point outside the real
  documented bound.
- **Server-rendered tab panes, visibility-only client island.** The API
  console (`api-console.tsx` + `api-console-tabs.tsx`) is the pattern for
  any future tabbed content that's expensive or server-only to produce
  (shiki highlighting, a data fetch, MDX): render every pane's full JSX on
  the server as normal, pass the finished `ReactNode`s into a small client
  component as props/children, and let that component's only job be
  flipping which pane carries the `hidden` attribute plus which tab carries
  `aria-selected`. It never imports the expensive dependency itself, and
  every pane's own nested client islands (here, each `CodeBlock`'s
  `CopyButton`) hydrate once up front rather than on first reveal. Reuses
  the existing `role="tablist"`/`"tab"` register `PricingPlans`'
  `BillingToggle` already established (hand-rolled ARIA, not the vendored
  `components/ui/tabs.tsx` — that component ships `"use client"`, which
  would pull Radix's Tabs primitive into the bundle for something this
  simple).
- **Zero-client-JS sections skip vendored primitives that ship `"use
  client"`.** Section 08's comparison table hand-rolls plain `<table>`
  markup (mirroring `/developers`' pre-existing Errors table) rather than
  importing `components/ui/table.tsx`, specifically because that vendored
  component's file starts with `"use client"` — importing it from a server
  component would create a client boundary for a table with zero
  interactive behavior. Check a vendored primitive's own top line before
  reaching for it inside a section whose spec says "zero client JS."
  (`badge`/`card` are server-safe; `table`/`tabs`/`toggle-group`/etc. are
  not — grep `components/ui/*.tsx` for `"use client"` rather than assuming.)
- **Build-time source excerpts, not hand-copied ones.** Section 09's visual
  is `packages/qr-engine/src/guardrails.ts`'s real threshold-constants block,
  read off disk at render time (`lib/guardrails-excerpt.ts`, `node:fs` +
  `import.meta.url`-relative path resolution — robust to whichever command
  actually invokes `next build`) and sliced by content anchor rather than a
  line-number range, so an unrelated edit elsewhere in the source file can
  never silently shift what the excerpt shows. Safe for a fully static route
  (`/` has no dynamic APIs, so this only runs once at `next build` time, same
  timing as `lib/highlight.ts`'s shiki calls) — never a per-request read.
- **Surface/divider bookkeeping when inserting sections into an existing
  alternation.** 05 sits `surface="default"` between 04 (tint) and 06
  (floor) — the same neutral-pause role 03 already plays between 02 and 04,
  reused rather than invented. 10's "centered band" look is
  `variant="centered"` (the only variant value `globals.css`'s
  `[data-variant="centered"]` rule actually centers) with `surface="tint"` +
  explicit `divider="none"` layered on top, not `variant="band"` (whose only
  special-cased behavior in `section.tsx` is forcing `divider="none"` — it
  doesn't center anything). Inserting sections mid-sequence can flip a
  downstream section's correct divider: `PricingTeaser` (11) used to sit
  directly after API (07, `surface="default"`, same surface, hairline
  correct) and now sits after Manifesto (10, `surface="tint"`, different
  surface) — its own `divider` needed an explicit `"none"` this unit added,
  a real edit, not just new sections landing.
- **Reordering a `<table>`'s columns per breakpoint needs two DOM variants,
  not one reordered via CSS.** Review round 1 on section 08: the elevated
  QRCDN column has to be visible without scrolling on a narrow viewport
  (leading the column order there), but keeps the deck's own QRCDN-last
  order on desktop. Flex/grid's `order` property doesn't apply to
  table-cell layout, so `comparison-section.tsx`'s `ComparisonTable` takes
  a `columnOrder` array and renders twice (`md:hidden` / `hidden md:block`)
  off the same `ROWS`/`COLUMNS` data — content can't drift between the two,
  only arrangement can. `display:none` elements are excluded from the
  accessibility tree, so a `table:visible` Playwright locator (not a plain
  `table`) is what lets one test file's assertions target "whichever
  variant the current viewport is actually showing" without extra markup.
  A static (JS-free) `bg-gradient-to-l from-surface-tint to-transparent`
  edge overlay, positioned in a `relative` sibling wrapper OUTSIDE the
  `overflow-x-auto` element (not inside it — an absolutely-positioned
  child of a scrolling container scrolls away with the content, since only
  `position: sticky`/`fixed` stay pinned to the viewport, not plain
  `absolute`), hints at the mobile table's horizontal scroll without any
  scroll-position tracking, honoring the section's zero-client-JS
  requirement.

## Feature-page composition (P9.5-T-F)

The four `/features/*` pages (`dynamic-codes`, `analytics`, `brand-studio`,
`access-controls`, shipped as two reviewed chunks) established the standing rule for
any future page in this family: **a feature page COMPOSES the landing's already-proven
section components with additive props — it never forks a copy of one, and it never
invents a new visual system for content the landing already knows how to render.**
Concretely, every reused body component in this family gained props with
byte-identical DEFAULTS to their existing landing behavior, so the landing call sites
needed zero changes: `StateCards` gained `layout?: "sidebar" | "grid"` (default
`"sidebar"`, unchanged) and `only?: "unclaimed" | "password" | "expired"` (default
`undefined`, unchanged — every existing call still renders all three cards) so a
feature page can show one card bare or the full grid in a wider column;
`ClosingSection` gained `title`/`lede` props (defaults identical to the landing's own
closing copy) so a feature page's CTA can restate its own claim instead of the
generic one; `Playground` gained `embedded?: boolean` (default `false`) specifically
because it's the one reused component that bakes in its own `Section`/`SectionHeading`
and closing doorway — `embedded=true` skips that outer shell so the feature page can
supply its own head without a doorway link back to the page it's already on.
`KitContactSheet` and `GuardrailsPlot` needed no new props at all — reused as-is.

Two components are net-new and shared across every page in the family, deliberately
NOT the landing's own more specific machinery: `feature-hero.tsx`'s `FeatureHero`
(centered/air `Section`-built page-title block — not `Hero`, whose `hero-enter` CSS
keyframes and `ScanNetwork`/`OrbitStage`/`AccentText`/`PillarStrip` machinery are tied
to one specific top-of-funnel headline) and `faq-list.tsx`'s `FaqList` (a static,
always-open `<dl>` — not `PricingFaq`'s `"use client"` accordion, since these pages'
own non-negotiable is zero *new* client JS; the only client island any feature page
uses is `RetargetTheatre`, already shipped and already bundled for the landing).

**Doorways are per-page flags, not one shared boolean** (`lib/marketing-flags.ts`):
`DYNAMIC_CODES_DOORWAY_ENABLED`, `ANALYTICS_DOORWAY_ENABLED`,
`BRAND_STUDIO_DOORWAY_ENABLED`, `ACCESS_CONTROLS_DOORWAY_ENABLED`, one per
`/features/*` route, each flipped `true` only once its destination page is real —
forced by the chunking itself (chunk 1 shipped two of four pages; a single flag would
either 404 the other two or hide the two that had already shipped). Every doorway
link is a real, already-live href by the time it renders — `SiteNav`/`SiteFooter`'s
"real hrefs only" rule (no `href="#"`, no link to a page that doesn't exist yet)
applies here too.

**Honest limits tables read from `PRICING_ROWS` where a field exists, and are a
single static pair where it deliberately doesn't** — e.g. static-code count and
export formats (D14: unconditionally unlimited on every plan, no `PlanLimits` field
to read), or pause/resume (`setCodePausedCore` carries no plan gate at all). Verified
against the real core function or schema before writing the static pair, never
assumed.

**Truth-gate discipline**: where a page needed to state exactly how the product
behaves at a boundary (does the studio block an unscannable export? where does a
password get checked? what are the real vanity-slug rules? does an expired code come
back to life?), each such claim was proven against the actual source before shipping
— `studio-shell.tsx`/`controls-rail.tsx` (warn-only export, never blocking),
`workers/redirect/src/responses.ts`/`app/p/[slug]/page.tsx` (password checked
server-side, destination never in the gate's own HTML), `lib/slug.ts` (the real 30-
symbol charset and reserved-word rules), `lib/codes-core.ts`/`lib/access.ts` (expiry
revival is immediate, by design, no separate "died once" flag exists). A future
feature page making a similar boundary claim should verify it the same way — against
the function or route that actually implements it — rather than paraphrasing the
marketing deck.

## Blog & help prose system (P9.5-T-R)

Both `/blog` and `/help` follow `lib/changelog.ts`'s established split: one typed
data file (`lib/blog.ts`, `lib/help.ts`) that the index page, the detail page, the
RSS feed (blog only), and a vitest content-guard all read from identically — never a
second hand-copied list. `lib/blog.test.ts`/`lib/help.test.ts` read each post/article
directly (word-count bounds, zero em dash, zero internal phase code, and for blog,
every `[V]` pull-quote as an exact substring) as a standing regression guard, the
same "prove it, don't hand-maintain it" posture `lib/pricing.test.ts` and
`lib/changelog.test.ts` already established.

- **Measure.** Both use `max-w-prose` (`--container-prose`, 65ch) — the container
  token reserved at P9.5-T1b explicitly as "the future blog unit's measure." Neither
  page uses `SectionHeading`/`Reveal`: a long-form page a visitor reads top to bottom
  has no scroll-triggered sequence to gate behind an `IntersectionObserver`, the same
  reasoning `legal-shell.tsx` already established for `/terms`/`/privacy` — `Section`
  itself is reused only for its outer frame (fluid gutter/section padding,
  `divider="none"`), never for its heading machinery. A plain `<h1>` at `text-h1`
  carries the page title directly.
- **Byline treatment.** `components/marketing/blog/post-shell.tsx`'s `BlogPostShell`
  renders one mono row (`byline · formatted date`, a `·` separator, `<time
  dateTime>`) between the dek and the article body — the same register
  `blog-index`/help's category labels use elsewhere, kept to one line rather than a
  fuller author-card treatment (board decision: "QRCDN is the entity," company-
  forward voice, byline is attribution not a profile).
- **Category index.** `/help`'s index (`app/(marketing)/help/page.tsx`) groups
  `HELP_ARTICLES` by `HELP_CATEGORIES` via `lib/help.ts`'s `helpArticlesByCategory()`
  — a category heading (`text-eyebrow`, mono) per group, articles listed under it as
  title + one-line summary. No search (`/help`'s own doc comment: 10 short articles
  under 5 categories is browsable without one) — don't add one reflexively if the
  article count grows modestly; reconsider only if it grows enough that browsing
  genuinely stops working.
- **The `CodeBlock`-in-post pattern.** A blog post that needs a real sample (post 1's
  effective-knockout constants, post 2's redirect contract) imports the same
  `components/marketing/code-block.tsx` `CodeBlock` every other surface uses
  (`/developers`, the landing's API console) — a post is just another consumer of the
  one shared, server-only shiki pipeline, not a special case. `post-shell.tsx`'s own
  exports (`P`, `H2`, `Pull`) are the ONLY post-body primitives: a `Pull` blockquote
  for a standalone verbatim line (left accent rule, larger type — a `blockquote`
  because these are quotable standalone sentences, not emphasized words), `H2` sized
  to `text-h3` rather than `text-h2` (the fluid `text-h2` ceiling reads oversized
  next to body copy inside a 65ch column). A post that needs something these three
  don't cover should extend `post-shell.tsx`, not invent a one-off element inline in
  the post file itself.
- **One file per post/article, looked up by slug.** Blog posts are TSX components
  under `components/marketing/blog/posts/`, resolved through
  `post-registry.tsx`'s slug→component map (see "MDX vs. TSX" below for why); help
  articles are plain data (`doIt` steps + one `whatToExpect` paragraph) since they
  never need embedded samples or pull-quotes. Both use the same
  `generateStaticParams` + `dynamicParams = false` pattern (every real slug is a
  static param; everything else 404s before the page component runs).

**MDX vs. TSX, decided empirically, not from the bundled docs alone.** `@next/mdx`
was installed, wired into `next.config.ts`, and a throwaway `.mdx` page was built and
compiled clean under Turbopack in a real `pnpm build` — proving the bundled Next 16
docs' caveat ("remark/rehype plugins without serializable options cannot yet be used
with Turbopack") is narrower than "MDX doesn't work here." Reverted anyway: this repo
has no `@tailwindcss/typography` and no prior MDX element-style mapping, so raw
markdown output would render fully unstyled without a new `mdx-components.tsx` layer
duplicating what `Section`/`CodeBlock`/the type scale already give typed TSX for
free. If a future unit reconsiders MDX (e.g. for a much higher post volume where
hand-authoring a TSX file per post stops scaling), that styling-layer gap — not
Turbopack support — is the real blocker to solve first.

## App shell additions (P9.5-T7)

Two small, real patterns from the product quick-wins unit, worth recording so a
future unit doesn't re-derive or accidentally diverge from them.

- **Studio rail cluster headings.** `components/studio/controls-rail.tsx`'s six
  existing sections (Payload, Codes, Colors, Shape, Logo, Export) are grouped under
  two labelled clusters, "Design" (Colors, Shape, Logo) and "Content & output"
  (Payload, Codes, Export), via a `ClusterHeading` one tier above each section's own
  `Eyebrow` — bolder, `text-foreground` instead of muted, no `ModuleMark` glyph, so
  the two heading tiers read as a real hierarchy rather than two same-weight labels
  stacked on each other. Purely a grouping label: no control moved, no control
  changed. Cluster order (Design first) is what keeps Export as the rail's last
  section, matching its pre-existing bottom placement — that placement was already
  correct before this unit and didn't need a second "emphasis" treatment on top of
  it.
- **`/codes`' header action slot.** The page header (`app/(app)/codes/page.tsx`) has
  carried a `flex items-center justify-between` wrapper since before this unit, with
  the right-hand side empty; T7 filled it with a "Create code" button. This is
  **not** a sitewide `(app)` header convention — `/api-keys`' header, touched in the
  same commit, is a plain stacked block with no such slot — so don't assume every
  authenticated-app page header reserves one; check the specific page. The button
  itself links to `/studio`, not a dedicated create route: `CreateCodeControl`
  (`components/studio/create-code.tsx`) lives inside the Studio, wired to the live
  payload/style being edited there, and there is no other create entry point to
  deep-link to — the honest destination is the real one, not a shortcut that implies
  a separate flow exists.

**`status.qrcdn.com` deliberately does not share this design system.**
`workers/status` (P9.5-T6) is its own Cloudflare Worker, its own `wrangler.jsonc`,
and renders one self-contained HTML page from `render.ts` with literal color values
hand-copied from `globals.css`'s dark-mode block — no import from `apps/web`, by
design: it exists specifically as an independent failure domain from both the app
(Vercel) and the redirect Worker, so a build-time coupling to `apps/web`'s tokens
would undermine the one property that makes it worth having. If its dark palette
ever drifts from `globals.css`, that's a manual re-sync (there's no build-time check
for it, the same honest limitation `lib/brand-qr.ts`'s `brandQrBackdrop` map already
documents for its own by-hand sync with `--qr-bg`), not a bug in either file.

## Section system: frame, split-rail, ink surface, Note (P9.7-U1)

System-foundation unit: gives `Section`/`SectionHeading`/`SectionBody` real
vocabulary and fixes one defect, without touching a single section file
(`*-section.tsx`, `hero.tsx`, `playground.tsx`, `comparison-section.tsx`,
`pricing-teaser.tsx`, `closing-section.tsx`, `app/(marketing)/page.tsx` were
all off-limits — every addition below is additive-default, proven
byte-identical against the pre-unit build). Later units spend this
vocabulary; this one only adds it.

- **The SSR reveal defect, fixed — and the "42" claim corrected to 33.**
  `SectionHeading`/`SectionBody` used to wrap their content in `Reveal`
  (`components/brand/magic.tsx`, motion/react `whileInView`), which SSRs a
  static `opacity:0;transform:translateY(18px)` inline style, invisible
  with JavaScript disabled or before hydration completes. The build spec's
  own pre-flight `grep -o 'opacity:0' | wc -l` against served `/` HTML
  counted 42 and attributed all of it to this wrapper; verified instead
  (counting the `Reveal`-specific `translateY(18px)` distance before/after
  the fix, since the hero's own unrelated motion uses different distances)
  that only **33** of the 42 are this wrapper — the other 9 are a separate,
  pre-existing defect in the hero's own `ScanNetwork`/`OrbitStage`
  destination-chip and `QrTile` entrance animations (plain motion.div
  `initial={{opacity:0,...}}` usage, nothing to do with `Reveal`), which
  the first pass could not fix without editing `hero.tsx`'s dependency tree
  (`components/marketing/scan-network.tsx`, `orbit-stage.tsx`), outside
  that pass's file allowlist. **A second round of this same unit fixed
  those 9 too**, plus a tenth on `/pricing` (the annual "Save 33%" badge,
  whose `AnimatePresence` was missing the `initial={false}` the price
  cross-fade beside it already had). Every built page now contains zero
  `opacity:0`, and the e2e assertion below holds for the whole document
  rather than just the `h1`. The hero artwork uses `.hero-art-chip` /
  `.hero-art-tile` mount keyframes reproducing the motion entrances
  exactly: same distances, durations, curve and per-chip stagger.
  **Proof the hero is visually unchanged** (it is the one design the board
  has approved, so the burden was on the change): hero element captured
  from the local production build and from live production at 390/768/
  1024/1440 in both themes, identical bounding boxes throughout, and a
  canvas pixel diff under `prefers-reduced-motion: reduce` returning a
  **0-pixel difference at 390 in both themes** (where `OrbitStage` parks
  completely). Residuals at the wider breakpoints are the destination-chip
  cross-fade, which by design keeps cycling under reduced motion in both
  versions. With JavaScript disabled the hero went from 6 invisible
  elements to 1, that one being the intentionally `opacity-0` orbit trail.
  Fixed the same way the hero already was at
  P9.5-T1a (`hero-enter` CSS keyframes): both components now render a
  plain wrapper `div` carrying `data-reveal="true"` (and, for
  `SectionBody`, `data-reveal-delay="true"` when its `delay` prop is > 0,
  approximating the old heading→body stagger since `animation-delay` has
  no meaning against a scroll timeline) instead of the `Reveal`/`motion.div`
  wrapper. `globals.css`'s `section-reveal` keyframes drive the entrance via
  `animation-timeline: view()`, gated behind
  `@supports (animation-timeline: view())` — the hidden `opacity: 0` state
  only ever exists inside a keyframe a supporting browser applies at a
  scroll position, never as rendered markup. **Firefox has no
  `animation-timeline: view()` support as of this writing** — an accepted,
  deliberate degradation: `@supports` gates the whole rule out there, so
  content simply renders at full opacity with no entrance. No JS fallback
  was added; none is planned for this gap. `Reveal` itself is **not**
  deleted from `magic.tsx` — `/login` (`app/(auth)/login/page.tsx`) still
  imports and renders it directly, grep-verified before removing anything.
- **`frame` (`Section`).** `frame?: "page" | "wide" | "bleed"`, default
  `"page"` — today's `mx-auto w-full max-w-page px-gutter` markup,
  byte-identical (proven by build-diffing `/`'s rendered HTML before/after;
  every call site omits `frame`, so every call site's class string is
  unchanged). `"wide"` swaps to the new `max-w-wide` utility
  (`--container-wide: 88rem`, additive second `@theme` block, same
  T1b-established container-token family); `"bleed"` drops both the
  max-width and the gutter, deliberately giving the caller no inner measure
  to re-establish itself. `max-w-wide`'s generation was verified against
  the installed `tailwindcss@4.3.3` with a throwaway `compile()` call
  before writing any component against it (same method the T1b container
  amendment used) — it generates a real utility, so the documented
  arbitrary-property fallback was not needed.
- **`variant="split"`, made real, without moving the four sections already
  using it.** At `md` and up, `Section`'s inner frame div can lay its
  direct children out as a sticky heading-rail + body grid
  (`minmax(0, 20rem)` / `minmax(0, 1fr)`, both tracks `minmax(0, ...)` per
  the standing "never a bare `1fr`" rule — a bare `1fr` track's default
  `min-width: auto` is what produced 116px of horizontal overflow on
  `/codes/[slug]` in an earlier round; heading rail `position: sticky; top:
  5rem; align-self: start`). This is gated behind a **new opt-in `Section`
  prop, `splitRail`** (emits `data-split="rail"`), required in addition to
  `data-variant="split"` — sections 03 (brand-system), 05 (guardrails), 07
  (api), 09 (open-source) already declare `variant="split"` today with no
  `splitRail`, so the compound-attribute gate means the new grid rule can
  never match them; they keep rendering their current plain stacked
  children at every viewport, confirmed by build-diffing `/`'s full
  rendered HTML (zero byte difference in those four sections beyond the
  reveal-attribute swap above). Every new rule in this family is rooted at
  `[data-slot="section"]`, never a bare `[data-variant="X"]` — `data-variant`
  is also emitted by several vendored shadcn primitives (`button.tsx`,
  `badge.tsx`, `tabs.tsx`, `toggle-group.tsx`, `dropdown-menu.tsx`), so an
  unscoped attribute selector would reach into all of them; the pre-existing
  `[data-variant="centered"]` rules were rescoped the same way in the same
  pass. `variant="showcase"` stays **inert on purpose** — it exists so a
  section can declare intent (pairs with `frame="wide"`) without claiming a
  layout behavior it doesn't have yet; this is documented so the next
  person doesn't read the absence of CSS as a bug.
- **`titleSize` (`SectionHeading`).** Decouples visual size from the
  semantic tag `titleAs` still controls. `titleSize?: "display" | "h1" |
  "h2" | "h3"`, defaulting from `titleAs` (`"h1"` → `text-display`, `"h2"`
  → `text-h2`) so every existing call site is byte-identical. `titleAs`
  still accepts only `"h1" | "h2"` and there must never be a second page
  `<h1>` — a section wanting bigger type while staying semantically an
  `<h2>` sets `titleAs="h2"` with `titleSize="h1"` rather than reaching for
  `titleAs="h1"`.
- **`surface="ink"` (`Section`).** A fourth surface, the page's one
  inverted plate: `--surface-ink`/`--ink-foreground`/`--ink-muted`/
  `--ink-border`, declared in `:root`/`.dark` (only `--surface-ink` itself
  is redeclared in `.dark`, a touch darker — foreground/muted/border stay
  fixed across both site themes, since this plate never un-inverts) and
  mapped through the *original* `@theme inline` block, per the standing D13
  amendment exception for colors (they need per-mode re-evaluation, unlike
  the spacing/container/type families in the additive second `@theme`
  block). `surface="ink"` sets background, foreground, **and** a top/bottom
  hairline in `--ink-border` (not `--border`, which is far too close to
  `--surface-ink`'s own lightness to read against it) — load-bearing per
  the board artifact: without the hairline, an inverted surface in dark
  mode reads as "more page," not a hard stop. `Section` forces
  `divider="none"` whenever `surface="ink"` (same reasoning, and the same
  code path, as `variant="band"` already forcing it) so the generic
  `--border`-colored hairline can never double up against the surface's own
  edge. No new accent hue: the single-accent violet lock is unchanged, and
  `--dest-1..4` stay restricted to destination identity. Lands unused this
  unit — no section file may change to adopt it (the file allowlist above),
  so this is pure vocabulary for a later unit to spend.
- **`Note` (`components/marketing/note.tsx`, new).** A left-rule annotation
  block, server component, zero client JS: `border-l-2` + generous
  (`pl-6`) left padding, an optional bold `lead` phrase in `--foreground`
  (`<strong className="font-semibold text-foreground">`, the same pattern
  `/privacy` already established for inline emphasis), body copy in
  `--muted-foreground` at `text-sm` (0.875rem), capped at `max-w-[76ch]`.
  `tone?: "default" | "accent"` swaps the rule to `border-primary`. No
  background, no radius, no border on more than one side — deliberate: the
  landing has ~32 bordered rounded rectangles and essentially no other
  shape, and this is the one device that isn't a box. Padding/rule-weight
  mirror the page's other left-rule element,
  `components/marketing/blog/post-shell.tsx`'s `Pull` blockquote
  (`border-l-2 border-primary py-1 pl-6`), so the two treatments share one
  physical vocabulary rather than drifting to slightly different numbers.
  Lands unused this unit, same reason as `surface="ink"` above; later units
  consume it sparingly for contextual/honesty copy that currently renders
  at `text-xs` and reads as apologetic.
- **`marks.tsx` rider, landed.** `ModuleMark`/`Eyebrow` moved out of
  `magic.tsx` into a new directive-free `components/brand/marks.tsx` —
  neither used a hook, they only lived in a `"use client"` file because
  `Reveal` did. Re-exported from `magic.tsx` so every pre-existing
  `@/components/brand/magic` import of either name is unaffected. One
  consumer was updated beyond the mechanical move: `section.tsx` itself now
  imports `Eyebrow` from `@/components/brand/marks` directly rather than
  through `magic.tsx` — free to do once the reveal fix above meant
  `section.tsx` no longer needed anything else from a `"use client"` file,
  and it's the module every `SectionHeading` eyebrow flows through, so
  `Section`'s whole tree is now client-boundary-free. See "Shared brand
  primitives" above for the updated module table.

## The quality floor (founder-set, checkpoint A close)

The v4.2 hero (scan-network artwork + atmosphere + framed product windows + token-clean
motion) is the **minimum quality floor for every future surface** — marketing sections,
app screens, emails. A section that "works" but lacks this craft level is not done.
Verification for design rounds: breakpoint matrix AND a live pass in the founder's
Chrome (claude-in-chrome MCP — he has authorized this) AND an adversarial
"reads-as-broken" audit (orphaned decoration, dead space, text orphans, rhythm gaps).
Review rounds always happen against a production build (`next start`), never dev.
