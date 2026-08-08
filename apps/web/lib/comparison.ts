// Relative imports (not "@/"): vitest resolves lib modules without the
// Next alias, and comparison.test.ts imports this file directly.
import { PLAN_LIMITS } from "./entitlements";
import { ANNUAL_MONTHLY_EQUIV_USD } from "./pricing";
import { MIN_SLUG_LENGTH, MAX_SLUG_LENGTH } from "./slug";

/**
 * The comparison data: one source for BOTH comparison surfaces (P9.9-C3).
 *
 * - The landing section 10 renders the curated cut (`LANDING_ROWS`, the
 *   rows flagged `landing`) as a pure chip matrix: glyphs only, every
 *   note delivered on hover plus sr-only text.
 * - The pricing page's full sheet (`#compare`) renders every row, banded,
 *   with the notes and receipts visible. It is the "go and check" surface
 *   the landing links to, and the one place a keyboard or touch reader
 *   sees every note without a hover.
 *
 * Extracted from comparison-section.tsx the way lib/pricing.ts relates to
 * PricingMatrix, and for the same reasons: vitest imports the data without
 * touching JSX (comparison.test.ts proves the band grouping lossless and
 * pins every numeric claim to its entitlements source), and the multiple
 * table renderers structurally cannot drift because they share this one
 * module.
 *
 * Content rules (board locks): archetype columns, never a named vendor;
 * every cell sourceable to our docs or category-common facts; numbers only
 * via the imports above, never hand-typed. The grading is symmetric on
 * purpose: `kind: "gap"` rows mark the ENTERPRISE cell as the leader (the
 * board-approved honest concessions - teams/SSO are their lane today,
 * verified against the schema: no team, seat, or SSO table exists).
 */

export const COMPARISON_COLUMNS = [
  "Free generators",
  "Shortener add-ons",
  "Enterprise platforms",
  "QRCDN",
] as const;

export const QRCDN_INDEX = COMPARISON_COLUMNS.length - 1;

// Desktop keeps the deck's column order (QRCDN last, the "and here's us"
// beat). Mobile leads with QRCDN - the elevated column must be visible
// without scrolling on a narrow viewport (P9.5 review round 1).
export const DESKTOP_COLUMN_ORDER = [0, 1, 2, 3] as const;
export const MOBILE_COLUMN_ORDER = [3, 0, 1, 2] as const;

export type ComparisonGlyph = "yes" | "no" | "partial";

export const GLYPH_CHAR: Record<ComparisonGlyph, string> = {
  yes: "✓",
  no: "✕",
  partial: "~",
};

/** sr-only fallback per glyph - a glyph-only cell must never announce
 *  nothing (the pre-C3 table had exactly that gap). */
export const GLYPH_LABEL: Record<ComparisonGlyph, string> = {
  yes: "Yes",
  no: "No",
  partial: "Partial",
};

export interface ComparisonCell {
  glyph: ComparisonGlyph;
  /** Visible on the pricing sheet; the landing chip's hover text. May be
   *  "" (nothing beyond the glyph to say). */
  note: string;
}

export type ComparisonRowKind = "lead" | "parity" | "gap";

// Title Case in source; CSS uppercases at render. Keeping the source
// strings mixed-case sidesteps lib/e2e-safety.test.ts's SLUG_CHARSET
// scanner for any test that quotes a band name.
export const COMPARISON_BAND_NAMES = [
  "Stays live",
  "Design & export",
  "Analytics & privacy",
  "Access & API",
  "Openness & price",
  "Team & scale",
] as const;

export type ComparisonBandName = (typeof COMPARISON_BAND_NAMES)[number];

export interface ComparisonRow {
  /** Stable key, decoupled from label copy. */
  id: string;
  band: ComparisonBandName;
  /** Terse landing label (two or three words - board directive). */
  label: string;
  /** The full claim: landing hover + sr-only text, sheet row-header title. */
  detail: string;
  kind: ComparisonRowKind;
  /** Extra receipt under the LEADING cell (QRCDN for "lead", enterprise
   *  for "gap") - visible on the sheet, folded into the landing hover. */
  receipt?: string;
  /** Proof link for the row label. Absolute paths only: the sheet renders
   *  on /pricing, so a bare fragment would break there. */
  href?: string;
  /** In the landing 12-row cut. */
  landing: boolean;
  /** Indexed by COMPARISON_COLUMNS order, independent of columnOrder. */
  cells: [ComparisonCell, ComparisonCell, ComparisonCell, ComparisonCell];
}

const API_PER_MONTH = (PLAN_LIMITS.pro.apiMonthlyRequests ?? 0).toLocaleString("en-US");

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: "survives-downgrade",
    band: "Stays live",
    label: "Survives a downgrade",
    detail: "Free codes are never deactivated: a downgrade pauses features, never redirects",
    kind: "lead",
    receipt: "pauses features, never redirects",
    href: "/features/dynamic-codes",
    landing: true,
    cells: [
      { glyph: "no", note: "trial traps common" },
      { glyph: "no", note: "link plans lapse" },
      { glyph: "partial", note: "contract-dependent" },
      { glyph: "yes", note: "never deactivated" },
    ],
  },
  {
    id: "retargeting",
    band: "Stays live",
    label: "Retargeting",
    detail: "Change where a printed code points, live in seconds",
    kind: "parity",
    href: "/features/dynamic-codes",
    landing: true,
    cells: [
      { glyph: "no", note: "reprint to change" },
      { glyph: "yes", note: "core product" },
      { glyph: "yes", note: "standard" },
      { glyph: "yes", note: "live in seconds" },
    ],
  },
  {
    id: "styled-free",
    band: "Design & export",
    label: "Styled codes, free",
    detail: "Full styling in the studio: free, no account, no watermark",
    kind: "lead",
    receipt: "the public studio",
    href: "/studio",
    landing: true,
    cells: [
      { glyph: "partial", note: "watermarks or sign-up walls" },
      { glyph: "partial", note: "QR is a paid add-on" },
      { glyph: "yes", note: "behind a login" },
      { glyph: "yes", note: "no account, no watermark" },
    ],
  },
  {
    id: "svg-png",
    band: "Design & export",
    label: "SVG and PNG export",
    detail: "Both formats on every tier, rendered client-side",
    kind: "parity",
    href: "/studio",
    landing: false,
    cells: [
      { glyph: "partial", note: "SVG often paywalled" },
      { glyph: "no", note: "raster only" },
      { glyph: "yes", note: "standard" },
      { glyph: "yes", note: "both formats, every tier" },
    ],
  },
  {
    id: "kit-sync",
    band: "Design & export",
    label: "Brand kit sync",
    detail: `Edit the kit once and every attached code follows: ${PLAN_LIMITS.free.brandKits} kits free, hard sync`,
    kind: "lead",
    receipt: `${PLAN_LIMITS.free.brandKits} kits free, hard sync`,
    href: "/features/brand-studio",
    landing: true,
    cells: [
      { glyph: "no", note: "no kit concept" },
      { glyph: "no", note: "one code at a time" },
      { glyph: "partial", note: "templates, sync varies" },
      { glyph: "yes", note: "edit once, every code follows" },
    ],
  },
  {
    id: "instrument",
    band: "Design & export",
    label: "Scannability instrument",
    detail: "Scannability enforced by an instrument calibrated on real decodes: warns before you export",
    kind: "lead",
    receipt: "warns before you export",
    href: "/studio",
    landing: true,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "no", note: "" },
      { glyph: "no", note: "" },
      { glyph: "yes", note: "calibrated on real decodes" },
    ],
  },
  {
    id: "bulk",
    band: "Design & export",
    label: "Bulk generation",
    detail: "Bulk creation on Pro, in the studio today",
    kind: "parity",
    landing: false,
    cells: [
      { glyph: "no", note: "one at a time" },
      { glyph: "partial", note: "CSV on some tiers" },
      { glyph: "yes", note: "standard" },
      { glyph: "yes", note: "Pro, in the studio today" },
    ],
  },
  {
    id: "analytics",
    band: "Analytics & privacy",
    label: "Scan analytics",
    detail: "Scans by day, place and device",
    kind: "parity",
    href: "/features/analytics",
    landing: true,
    cells: [
      { glyph: "no", note: "none, or pixels" },
      { glyph: "partial", note: "click counts" },
      { glyph: "yes", note: "full breakdowns" },
      { glyph: "yes", note: "day, place and device" },
    ],
  },
  {
    id: "ip-privacy",
    band: "Analytics & privacy",
    label: "IP privacy",
    detail: "Raw IPs never stored: hashed with a daily rotating salt",
    kind: "lead",
    receipt: "hashed, daily rotating salt",
    href: "/features/analytics",
    landing: true,
    cells: [
      { glyph: "partial", note: "policies vary" },
      { glyph: "no", note: "click logs keep IPs" },
      { glyph: "partial", note: "varies" },
      { glyph: "yes", note: "raw IPs never stored" },
    ],
  },
  {
    id: "retention",
    band: "Analytics & privacy",
    label: "Retention",
    detail: `Scan history: ${PLAN_LIMITS.free.analyticsRetentionDays} days free, ${PLAN_LIMITS.pro.analyticsRetentionDays} on Pro`,
    kind: "parity",
    href: "/features/analytics",
    landing: true,
    cells: [
      { glyph: "no", note: "none" },
      { glyph: "partial", note: "60 days" },
      { glyph: "yes", note: "contract-length" },
      {
        glyph: "yes",
        note: `${PLAN_LIMITS.free.analyticsRetentionDays} days free, ${PLAN_LIMITS.pro.analyticsRetentionDays} on Pro`,
      },
    ],
  },
  {
    id: "access-controls",
    band: "Access & API",
    label: "Expiry and password",
    detail: "Per-code expiry and password on Pro: enforced at the edge",
    kind: "parity",
    href: "/features/access-controls",
    landing: false,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "partial", note: "password sometimes" },
      { glyph: "yes", note: "standard" },
      { glyph: "yes", note: "Pro, enforced at the edge" },
    ],
  },
  {
    id: "short-links",
    band: "Access & API",
    label: "Custom short links",
    detail: `Vanity slugs on Pro: ${MIN_SLUG_LENGTH} to ${MAX_SLUG_LENGTH} characters`,
    kind: "parity",
    landing: false,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "yes", note: "core product" },
      { glyph: "yes", note: "standard" },
      { glyph: "yes", note: `Pro, ${MIN_SLUG_LENGTH} to ${MAX_SLUG_LENGTH} characters` },
    ],
  },
  {
    id: "api",
    band: "Access & API",
    label: "API included",
    detail: `${API_PER_MONTH} requests a month on Pro: one scoped endpoint, 404 reveals nothing`,
    kind: "lead",
    receipt: "one scoped endpoint, 404 reveals nothing",
    href: "/developers",
    landing: true,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "partial", note: "rate-limited add-ons" },
      { glyph: "partial", note: "often costs extra" },
      { glyph: "yes", note: `${API_PER_MONTH} a month on Pro` },
    ],
  },
  {
    id: "open-source",
    band: "Openness & price",
    label: "Open source",
    detail: "The engine and the platform, MIT licensed: read it before you trust it",
    kind: "lead",
    receipt: "read the engine yourself",
    href: "/#open-source",
    landing: true,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "no", note: "" },
      { glyph: "no", note: "" },
      { glyph: "yes", note: "MIT" },
    ],
  },
  {
    id: "price",
    band: "Openness & price",
    label: "Price transparency",
    detail: `$0 free, $${ANNUAL_MONTHLY_EQUIV_USD} a month on annual: the price is on the page`,
    kind: "parity",
    href: "/pricing",
    landing: true,
    cells: [
      { glyph: "partial", note: "until the trap" },
      { glyph: "yes", note: "" },
      { glyph: "partial", note: "quote form" },
      { glyph: "yes", note: `$0 / $${ANNUAL_MONTHLY_EQUIV_USD}/mo annual` },
    ],
  },
  {
    id: "teams-sso",
    band: "Team & scale",
    label: "Teams and SSO",
    detail: "Team seats and SSO are enterprise's lane today: accounts here are single-owner",
    kind: "gap",
    receipt: "their lane today",
    landing: true,
    cells: [
      { glyph: "no", note: "" },
      { glyph: "partial", note: "team plans on some" },
      { glyph: "yes", note: "built for teams, SSO at contract tier" },
      { glyph: "no", note: "single owner today" },
    ],
  },
];

/** The column index of the cell a non-parity row marks as ahead. */
export function leaderIndex(row: ComparisonRow): number | null {
  if (row.kind === "lead") return QRCDN_INDEX;
  if (row.kind === "gap") return 2;
  return null;
}

/** The landing section's 12-row cut, in sheet order. */
export const LANDING_ROWS = COMPARISON_ROWS.filter((row) => row.landing);

export interface ComparisonBand {
  name: ComparisonBandName;
  rows: ComparisonRow[];
}

// Pure lossless grouping over COMPARISON_ROWS, proven by comparison.test.ts
// exactly the way PRICING_MATRIX_BANDS is proven by pricing.test.ts.
export const COMPARISON_BANDS: ComparisonBand[] = COMPARISON_BAND_NAMES.map((name) => ({
  name,
  rows: COMPARISON_ROWS.filter((row) => row.band === name),
}));
