// Shared label -> destination-hue map (P9.5-T3a). Fixed per the copy deck's
// "Demo destination hues" note: both the desktop/compact ScanNetwork stages
// (all 4 destinations) and the <md OrbitStage (3 of the 4, omitting
// g.page/cafe-norte/review — the orbit ring only has three nodes) key off
// these same labels, so a destination's hue never drifts between stages.
// See docs/guides/design-system.md's destination-palette amendment for
// where these tokens may (and may not) be used — hero/network destination
// identity only, never UI chrome.
export const DESTINATION_HUES = {
  "yourcafe.com/menu": "dest-1",
  "tickets.io/tour-2026": "dest-2",
  "instagram.com/drop": "dest-3",
  "g.page/cafe-norte/review": "dest-4",
} as const;

export type DestinationLabel = keyof typeof DESTINATION_HUES;
export type DestinationHue = (typeof DESTINATION_HUES)[DestinationLabel];

/** Tailwind utility classes per hue — a literal lookup map, not a template
 *  string, because Tailwind's compiler statically scans source for class
 *  names it can find as whole strings; `` `bg-dest-${n}` `` would never
 *  generate the utility. Solid (non-opacity-modified) references only —
 *  `dot`/`stroke`/`fill`/`text` all compile to a plain `var(--dest-N)`
 *  value with no `color-mix()` involved (verified via a throwaway
 *  `tailwindcss@4.3.3` compile: `.fill-dest-1 { fill: var(--dest-1); }`,
 *  no `@supports` block). `border`/`bg` opacity-modified variants
 *  (`border-dest-N/50`, `bg-dest-N/10`) used to live here too; removed at
 *  board round 5 — see `HUE_TINT` below for why and what replaced them.
 *  Dormant/inactive styling stays plain, hardcoded Tailwind classes at
 *  each call site (never keyed off this map). */
export const HUE_CLASSES: Record<
  DestinationHue,
  { dot: string; stroke: string; fill: string; text: string }
> = {
  "dest-1": {
    dot: "bg-dest-1",
    stroke: "stroke-dest-1",
    fill: "fill-dest-1",
    text: "text-dest-1",
  },
  "dest-2": {
    dot: "bg-dest-2",
    stroke: "stroke-dest-2",
    fill: "fill-dest-2",
    text: "text-dest-2",
  },
  "dest-3": {
    dot: "bg-dest-3",
    stroke: "stroke-dest-3",
    fill: "fill-dest-3",
    text: "text-dest-3",
  },
  "dest-4": {
    dot: "bg-dest-4",
    stroke: "stroke-dest-4",
    fill: "fill-dest-4",
    text: "text-dest-4",
  },
};

/**
 * Explicit `color-mix(in srgb, ...)` values for the "active chip" tint
 * (border/background-strength ring + a soft fill), consumed via inline
 * `style` rather than a Tailwind utility class.
 *
 * Board round 5 (live iOS Safari device testing): the previous approach —
 * Tailwind's own opacity-modifier utilities (`border-dest-N/50`,
 * `bg-dest-N/10`) — compiles through `color-mix(in oklab, ...)` behind an
 * `@supports (color: color-mix(in lab, red, red))` progressive-enhancement
 * block (verified via a throwaway `tailwindcss@4.3.3` compile). iOS Safari
 * reports that `@supports` check as satisfied (so it takes the color-mix
 * branch, not the safe solid-color fallback) but then fails to actually
 * paint that specific oklab-space mix, rendering fully transparent —
 * worst inside a `filter:` context. The hand-authored `HUE_GLOW` below had
 * the exact same failure mode with `color-mix(in oklch, ...)`. `srgb` is a
 * plain, linear, universally-rendered interpolation space; every consumer
 * below uses this map (inline style) instead of the Tailwind utilities.
 *
 * Second, independent bug this same change fixes for `OrbitStage`
 * specifically: its chip pill is an SVG `<rect>`, and `background-color`/
 * `border-color` (what the old Tailwind classes set) have NO EFFECT on an
 * SVG shape's paint in ANY browser — SVG rects only respond to `fill`/
 * `stroke` (confirmed empirically: a throwaway `<rect class="bg-dest-1/10
 * border-dest-1/50">` computed a real `background-color`/`border-color`
 * value but left `fill`/`stroke` at their SVG defaults). `soft`/`strong`
 * below get assigned to `fill`/`stroke` for the SVG consumer and to
 * `backgroundColor`/`borderColor` for the HTML-div consumer
 * (`ScanNetwork`'s `DestinationChip`) — same values, different CSS
 * properties, because each element type needs its own for the color to
 * actually paint.
 */
export const HUE_TINT: Record<DestinationHue, { soft: string; strong: string }> = {
  "dest-1": {
    soft: "color-mix(in srgb, var(--dest-1) 10%, transparent)",
    strong: "color-mix(in srgb, var(--dest-1) 50%, transparent)",
  },
  "dest-2": {
    soft: "color-mix(in srgb, var(--dest-2) 10%, transparent)",
    strong: "color-mix(in srgb, var(--dest-2) 50%, transparent)",
  },
  "dest-3": {
    soft: "color-mix(in srgb, var(--dest-3) 10%, transparent)",
    strong: "color-mix(in srgb, var(--dest-3) 50%, transparent)",
  },
  "dest-4": {
    soft: "color-mix(in srgb, var(--dest-4) 10%, transparent)",
    strong: "color-mix(in srgb, var(--dest-4) 50%, transparent)",
  },
};

/** Raw `var(--dest-N)` strings for imperative (non-Tailwind) consumers —
 *  OrbitStage's packet/trail, which are mutated directly via refs outside
 *  React's render cycle (see its own file header for why), so they need a
 *  real CSS color value to hand to `setAttribute`/`style`, not a class. */
export const HUE_VAR: Record<DestinationHue, string> = {
  "dest-1": "var(--dest-1)",
  "dest-2": "var(--dest-2)",
  "dest-3": "var(--dest-3)",
  "dest-4": "var(--dest-4)",
};

/**
 * Precomputed hue-tinted drop-shadow filters for OrbitStage's "soft hue
 * glow" on the active chip — inline-style-only (no Tailwind utility for a
 * drop-shadow), fully token-driven (reads `var(--dest-N)` at paint time,
 * never a hardcoded color). `filter: drop-shadow(...)` on purpose, not
 * `box-shadow`: the glow wraps an SVG `<g>`, and `box-shadow` is not part
 * of the SVG paint model (unreliable/no-op on SVG shapes across engines),
 * while `drop-shadow` is a standard SVG filter primitive that works
 * everywhere.
 *
 * Board round 5: dropped the `color-mix(in oklch, ...)` this used to wrap
 * the color in — same failure mode as `HUE_TINT`'s doc comment above
 * describes (iOS Safari paints that specific mix as invisible, worst
 * inside a `filter:` context, which this literally is). A solid
 * `var(--dest-N)` reference needs no alpha channel to read as a soft glow
 * anyway — the blur radius alone produces the falloff. */
export const HUE_GLOW: Record<DestinationHue, string> = {
  "dest-1": "drop-shadow(0 0 8px var(--dest-1))",
  "dest-2": "drop-shadow(0 0 8px var(--dest-2))",
  "dest-3": "drop-shadow(0 0 8px var(--dest-3))",
  "dest-4": "drop-shadow(0 0 8px var(--dest-4))",
};
