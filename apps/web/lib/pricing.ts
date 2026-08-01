// The truth-coupling module for /pricing. Every number, dollar figure, and
// derived percentage the pricing page renders traces back to `PLAN_LIMITS`
// / `PRICING` in ./entitlements — the hard rule's actual source of truth
// (CLAUDE.md: "Entitlement limits live in apps/web/lib/entitlements.ts
// only"). Nothing below is a fresh literal: counts, retention windows, and
// dollar figures are all read straight off the imported constants, and the
// two derived figures (`ANNUAL_MONTHLY_EQUIV_USD`, `ANNUAL_SAVINGS_PCT`)
// are computed from them, never hand-typed.
//
// DEFECT: rendering a plan number — a dynamic-code cap, a retention
// window, a dollar figure, a savings percentage — anywhere but this module
// or entitlements.ts itself (including retyping one as a JSX/copy literal
// on the pricing page) is a bug. If a surface needs a number this module
// doesn't yet expose, add a derivation here; don't hand-type it at the
// call site.

import { PLAN_LIMITS, PRICING, type PlanLimits } from "./entitlements";

export const MONTHLY_USD = PRICING.monthlyUsd;
export const ANNUAL_USD = PRICING.annualUsd;

/** Effective per-month rate when billed annually — 96 / 12 = 8. */
export const ANNUAL_MONTHLY_EQUIV_USD = PRICING.annualUsd / 12;

/** Percent cheaper annual billing is vs. paying monthly for 12 months,
 *  rounded to the nearest whole percent for display (e.g. "33% off"). */
export const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRICING.annualUsd / (PRICING.monthlyUsd * 12)) * 100,
);

/** A matrix row is either a plain count/limit ("250", "Unlimited", "30d")
 *  or a capability that's simply on or off, phrased honestly either way
 *  rather than rendered as a bare `true`/`false`. */
export type PricingRowKind = "count" | "capability";

export interface PricingRow {
  /** The PlanLimits field this row renders — keeps every row traceable to
   *  its source and lets tests assert full field coverage. */
  key: keyof PlanLimits;
  label: string;
  kind: PricingRowKind;
  free: string;
  pro: string;
  /** Raw booleans, `kind: "capability"` rows only — lets the UI draw a
   *  check glyph without re-deriving anything from the text columns. */
  freeIncluded?: boolean;
  proIncluded?: boolean;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function countRow(
  key: keyof PlanLimits,
  label: string,
  free: number | null,
  pro: number | null,
  opts?: { suffix?: string; nullText?: string },
): PricingRow {
  const suffix = opts?.suffix ?? "";
  const nullText = opts?.nullText ?? "Unlimited";
  const render = (v: number | null) => (v === null ? nullText : `${formatCount(v)}${suffix}`);
  return { key, label, kind: "count", free: render(free), pro: render(pro) };
}

function capabilityRow(
  key: keyof PlanLimits,
  label: string,
  free: boolean,
  pro: boolean,
  freeText: string,
  proText: string,
): PricingRow {
  return {
    key,
    label,
    kind: "capability",
    free: freeText,
    pro: proText,
    freeIncluded: free,
    proIncluded: pro,
  };
}

// One row per PlanLimits field (8 — see pricing.test.ts's coverage
// assertion), in the order they're declared on the interface.
export const PRICING_ROWS: PricingRow[] = [
  countRow(
    "dynamicCodes",
    "Dynamic codes",
    PLAN_LIMITS.free.dynamicCodes,
    PLAN_LIMITS.pro.dynamicCodes,
  ),
  countRow("brandKits", "Brand kits", PLAN_LIMITS.free.brandKits, PLAN_LIMITS.pro.brandKits),
  countRow(
    "analyticsRetentionDays",
    "Analytics history",
    PLAN_LIMITS.free.analyticsRetentionDays,
    PLAN_LIMITS.pro.analyticsRetentionDays,
    { suffix: "d" },
  ),
  capabilityRow(
    "cityGeo",
    "Scan geography",
    PLAN_LIMITS.free.cityGeo,
    PLAN_LIMITS.pro.cityGeo,
    "Country-level",
    "City-level",
  ),
  countRow(
    "apiMonthlyRequests",
    "API access",
    PLAN_LIMITS.free.apiMonthlyRequests,
    PLAN_LIMITS.pro.apiMonthlyRequests,
    { suffix: "/mo", nullText: "Not included" },
  ),
  capabilityRow(
    "accessControls",
    "Expiry & password",
    PLAN_LIMITS.free.accessControls,
    PLAN_LIMITS.pro.accessControls,
    "Not included",
    "Included",
  ),
  capabilityRow(
    "vanitySlugs",
    "Vanity short links",
    PLAN_LIMITS.free.vanitySlugs,
    PLAN_LIMITS.pro.vanitySlugs,
    "Not included",
    "Included",
  ),
  capabilityRow(
    "bulk",
    "Bulk generation",
    PLAN_LIMITS.free.bulk,
    PLAN_LIMITS.pro.bulk,
    "Not included",
    "Included",
  ),
];

// Banded grouping for /pricing v2's feature matrix (P9.5-T4) — a pure
// presentation grouping over PRICING_ROWS above, not new data: every row is
// placed in exactly one band, none dropped, none invented
// (pricing.test.ts's coverage assertion proves both directions). Band
// membership follows the product's own conceptual grouping rather than an
// arbitrary split: vanitySlugs sits with accessControls (both per-code
// protective/access features — PricingPlans' own PRO_FEATURES bullet
// already bundles "Expiry, passwords & vanity short links" as one idea),
// not with apiMonthlyRequests/bulk (the literal "API & bulk" band).
export interface PricingMatrixBand {
  name: string;
  rows: PricingRow[];
}

const MATRIX_BAND_KEYS: readonly { name: string; keys: readonly (keyof PlanLimits)[] }[] = [
  { name: "Codes & limits", keys: ["dynamicCodes"] },
  { name: "Design & export", keys: ["brandKits"] },
  { name: "Analytics", keys: ["analyticsRetentionDays", "cityGeo"] },
  { name: "Access controls", keys: ["accessControls", "vanitySlugs"] },
  { name: "API & bulk", keys: ["apiMonthlyRequests", "bulk"] },
];

export const PRICING_MATRIX_BANDS: PricingMatrixBand[] = MATRIX_BAND_KEYS.map(({ name, keys }) => ({
  name,
  rows: PRICING_ROWS.filter((r) => keys.includes(r.key)),
}));
