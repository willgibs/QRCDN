/**
 * The landing's anchored-section registry (P9.10-D4, re-cut at D10).
 *
 * Six of the landing's thirteen sections carry an `id`, and those six are the
 * only honest rows an index can have: every other section is real content
 * with nothing to link to. This file is the one place that lists them, so
 * the wall renders the page's own structure rather than a second,
 * hand-maintained copy of it.
 *
 * D10 board call: the wall numbers its rows 1-6 IN ITS OWN ORDER rather than
 * echoing each target's page ordinal. The old device (rows carrying the
 * page's own eyebrow numbers) was clever but read as a puzzle — 03, 04, 05,
 * 07, 09, 11 looks like a mistake unless you already know the page. The
 * numbering is now positional and derived in the component, so this registry
 * stops recording ordinals at all and CANNOT drift from page.tsx's numbering
 * — there is nothing left to drift.
 *
 * What still can drift is the NAME: each row must say what the target
 * section's own eyebrow says, or a reader who takes a row down the page
 * meets different words when they land. `e2e/marketing.spec.ts` still
 * cross-checks every row's `name` against the eyebrow the target actually
 * renders in the DOM. Drift is a red test, not a wrong label on production.
 */
export type LandingIndexRow = {
  /** The section's own `id`, i.e. the anchor this row feeds. */
  id: string;
  /** The target section's OWN eyebrow, verbatim — e2e-enforced (above). */
  name: string;
};

export const LANDING_INDEX: readonly LandingIndexRow[] = [
  { id: "studio", name: "Studio" },
  { id: "brand-system", name: "Brand kits" },
  { id: "dynamic-codes", name: "Dynamic links" },
  { id: "analytics", name: "Analytics" },
  { id: "api", name: "API" },
  { id: "open-source", name: "Open source" },
] as const;
