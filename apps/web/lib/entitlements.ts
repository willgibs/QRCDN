// The single source of truth for plan limits (hard rule — enforce these in
// every server action and API route; the UI may read them for gating copy).
// Pricing/policy: docs/DECISIONS.md D14, founder-approved 2026-07-21.

export type Plan = "free" | "pro";

export interface PlanLimits {
  /** Max dynamic codes. Free codes NEVER stop redirecting on downgrade —
   *  codes beyond the cap become read-only, not dead (D14). */
  dynamicCodes: number;
  /** Max brand kits; null = unlimited. */
  brandKits: number | null;
  /** Raw scan-event retention window; rollups persist beyond it (D8). */
  analyticsRetentionDays: number;
  /** City-level geo in analytics (country-level is always available). */
  cityGeo: boolean;
  /** API access + monthly request fair-use cap; null = no API access. */
  apiMonthlyRequests: number | null;
  /** Expiry and password protection per code. */
  accessControls: boolean;
  /** Custom vanity slugs (4-30 chars). */
  vanitySlugs: boolean;
  /** Bulk generation. */
  bulk: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    dynamicCodes: 3,
    // 2, not 1 (board, 2026-08-04 at the P9.8 plan approval): free users can
    // genuinely try the kit feature and get a minimal versioning system, and
    // exercising the multi-kit UI on free beats building locked single-kit
    // special cases. D14 amendment records the sign-off.
    brandKits: 2,
    analyticsRetentionDays: 30,
    cityGeo: false,
    apiMonthlyRequests: null,
    accessControls: false,
    vanitySlugs: false,
    bulk: false,
  },
  pro: {
    dynamicCodes: 250,
    brandKits: null,
    analyticsRetentionDays: 365,
    cityGeo: true,
    apiMonthlyRequests: 10_000,
    accessControls: true,
    vanitySlugs: true,
    bulk: true,
  },
};

export const PRICING = {
  monthlyUsd: 12,
  annualUsd: 96,
} as const;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}
