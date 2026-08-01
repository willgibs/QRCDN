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
 *  generate the utility. Covers every hue-dependent surface both stages
 *  need (chip border/background/dot fill, node fill/stroke, the flowing
 *  packet's stroke); dormant/inactive styling stays plain, hardcoded
 *  Tailwind classes at each call site (never keyed off this map). */
export const HUE_CLASSES: Record<
  DestinationHue,
  { border: string; bg: string; dot: string; stroke: string; fill: string; text: string }
> = {
  "dest-1": {
    border: "border-dest-1/50",
    bg: "bg-dest-1/10",
    dot: "bg-dest-1",
    stroke: "stroke-dest-1",
    fill: "fill-dest-1",
    text: "text-dest-1",
  },
  "dest-2": {
    border: "border-dest-2/50",
    bg: "bg-dest-2/10",
    dot: "bg-dest-2",
    stroke: "stroke-dest-2",
    fill: "fill-dest-2",
    text: "text-dest-2",
  },
  "dest-3": {
    border: "border-dest-3/50",
    bg: "bg-dest-3/10",
    dot: "bg-dest-3",
    stroke: "stroke-dest-3",
    fill: "fill-dest-3",
    text: "text-dest-3",
  },
  "dest-4": {
    border: "border-dest-4/50",
    bg: "bg-dest-4/10",
    dot: "bg-dest-4",
    stroke: "stroke-dest-4",
    fill: "fill-dest-4",
    text: "text-dest-4",
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

/** Precomputed hue-tinted drop-shadow filters for OrbitStage's "soft hue
 *  glow" on the active chip — inline-style-only (no Tailwind utility for a
 *  color-mixed drop-shadow), but still fully token-driven (reads var(--dest-N)
 *  at paint time, never a hardcoded color). */
export const HUE_GLOW: Record<DestinationHue, string> = {
  "dest-1": "drop-shadow(0 0 6px color-mix(in oklch, var(--dest-1) 40%, transparent))",
  "dest-2": "drop-shadow(0 0 6px color-mix(in oklch, var(--dest-2) 40%, transparent))",
  "dest-3": "drop-shadow(0 0 6px color-mix(in oklch, var(--dest-3) 40%, transparent))",
  "dest-4": "drop-shadow(0 0 6px color-mix(in oklch, var(--dest-4) 40%, transparent))",
};
