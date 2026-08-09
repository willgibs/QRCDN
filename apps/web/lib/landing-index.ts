import { PLAN_LIMITS } from "@/lib/entitlements";

/**
 * The landing's anchored-section registry (P9.10-D4).
 *
 * Six of the landing's thirteen sections carry an `id`, and those six are the
 * only honest rows an index can have: every other section is real content
 * with nothing to link to. This file is the one place that pairs an anchor
 * with the ordinal the page gives it, so the index wall renders the page's
 * own structure rather than a second, hand-maintained copy of it.
 *
 * `app/(marketing)/page.tsx` still OWNS order and numbering (P9.7-V1) — this
 * registry does not set the ordinals, it records them. That leaves exactly
 * one drift risk: renumber a section there and this file goes stale silently,
 * which is the same failure P9.7-V1 fixed for the eyebrows themselves. So
 * `e2e/marketing.spec.ts` cross-checks every row's `ordinal` against the
 * eyebrow the target section actually renders in the DOM. Drift is a red
 * test, not a wrong number on production.
 *
 * The two registers exist because the wall can read as structure or as
 * promise, and both are honest here: every `receipt` is a fact the repo
 * already holds (D5 hard sync, the CLAUDE.md redirect rule, the privacy
 * posture, `entitlements.ts`, the licence), and every `claim` is that same
 * fact said as a sentence. Nothing here is a marketing adjective, and the
 * API quota is READ from entitlements rather than retyped (CLAUDE.md hard
 * rule) so a plan change can never leave a stale number on the landing.
 */
export type LandingIndexRow = {
  /** The eyebrow ordinal the target section actually renders. Recorded here,
   *  owned by `page.tsx`, cross-checked in e2e. */
  ordinal: string;
  /** The section's own `id`, i.e. the anchor this row feeds. */
  id: string;
  /** The target section's OWN eyebrow, verbatim. Not a paraphrase: a reader
   *  who takes a row down the page should meet the same words in the
   *  eyebrow when they land, so e2e asserts equality on both the ordinal
   *  and this. The board set these names at the D4 R1 review (2026-08-09)
   *  and sections 03 and 04 moved their eyebrows to match, rather than the
   *  index drifting from the page it indexes: "Design studio" became
   *  "Studio" (which is also the nav label and the route) and "Brand
   *  system" became "Brand kits" (which is the product's own noun, the one
   *  the schema and `sync_kit_codes()` already use). */
  name: string;
  /** One line on what the section is. Descriptions, not adjectives: each
   *  one carries the sourced fact it is standing on (the redirect rule,
   *  the hard sync, the privacy posture, the quota, the licence). */
  receipt: string;
};

const API_QUOTA = PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString("en-US");

export const LANDING_INDEX: readonly LandingIndexRow[] = [
  {
    ordinal: "03",
    id: "studio",
    name: "Studio",
    receipt: "ink, shape and logo, scored live",
  },
  {
    ordinal: "04",
    id: "brand-system",
    name: "Brand kits",
    receipt: "one kit, every code inherits it",
  },
  {
    ordinal: "05",
    id: "dynamic-codes",
    name: "Dynamic links",
    receipt: "repoint after it prints, never cached",
  },
  {
    ordinal: "07",
    id: "analytics",
    name: "Analytics",
    receipt: "every scan by day, place and device",
  },
  {
    ordinal: "09",
    id: "api",
    name: "API",
    receipt: `create, retarget and measure, ${API_QUOTA} a month`,
  },
  {
    ordinal: "11",
    id: "open-source",
    name: "Open source",
    receipt: "MIT licensed, the whole platform",
  },
] as const;
