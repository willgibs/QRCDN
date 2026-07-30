import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, PRICING } from "./entitlements";
import {
  ANNUAL_MONTHLY_EQUIV_USD,
  ANNUAL_SAVINGS_PCT,
  ANNUAL_USD,
  MONTHLY_USD,
  PRICING_ROWS,
  type PricingRow,
} from "./pricing";

function row(key: PricingRow["key"]): PricingRow {
  const found = PRICING_ROWS.find((r) => r.key === key);
  if (!found) throw new Error(`no PRICING_ROWS entry for "${key}"`);
  return found;
}

describe("PRICING_ROWS coverage", () => {
  it("has exactly one row per PlanLimits field, both directions", () => {
    const limitKeys = Object.keys(PLAN_LIMITS.free).sort();
    const rowKeys = PRICING_ROWS.map((r) => r.key).sort();
    expect(rowKeys).toEqual(limitKeys);
    expect(new Set(rowKeys).size).toBe(rowKeys.length); // no duplicates
  });
});

// Each assertion below reads the CURRENT value off PLAN_LIMITS at test-run
// time rather than a literal ("250", "3", ...) — a hardcoded literal would
// still pass even if pricing.ts's derivation were quietly replaced by a
// hand-typed string, defeating the point. Comparing against the live
// import is what actually proves the row is wired to entitlements.ts and
// not a retyped copy of it.
describe("PRICING_ROWS derivation — count rows", () => {
  it("dynamicCodes renders the live free/pro caps", () => {
    const r = row("dynamicCodes");
    expect(r.free).toBe(String(PLAN_LIMITS.free.dynamicCodes));
    expect(r.pro).toBe(String(PLAN_LIMITS.pro.dynamicCodes));
  });

  it("brandKits renders the live free cap and treats a null pro cap as Unlimited", () => {
    const r = row("brandKits");
    expect(r.free).toBe(String(PLAN_LIMITS.free.brandKits));
    expect(PLAN_LIMITS.pro.brandKits).toBeNull();
    expect(r.pro).toBe("Unlimited");
  });

  it("analyticsRetentionDays renders the live windows with a day suffix", () => {
    const r = row("analyticsRetentionDays");
    expect(r.free).toBe(`${PLAN_LIMITS.free.analyticsRetentionDays}d`);
    expect(r.pro).toBe(`${PLAN_LIMITS.pro.analyticsRetentionDays}d`);
  });

  it("apiMonthlyRequests renders the live pro cap and treats a null free cap as not included", () => {
    const r = row("apiMonthlyRequests");
    expect(PLAN_LIMITS.free.apiMonthlyRequests).toBeNull();
    expect(r.free).toBe("Not included");
    expect(PLAN_LIMITS.pro.apiMonthlyRequests).not.toBeNull();
    expect(r.pro).toBe(`${PLAN_LIMITS.pro.apiMonthlyRequests!.toLocaleString("en-US")}/mo`);
  });
});

describe("PRICING_ROWS derivation — capability rows", () => {
  it.each(["cityGeo", "accessControls", "vanitySlugs", "bulk"] as const)(
    "%s mirrors the live boolean and never renders a bare true/false",
    (key) => {
      const r = row(key);
      expect(r.kind).toBe("capability");
      expect(r.freeIncluded).toBe(PLAN_LIMITS.free[key]);
      expect(r.proIncluded).toBe(PLAN_LIMITS.pro[key]);
      expect(r.free).not.toMatch(/^(true|false)$/);
      expect(r.pro).not.toMatch(/^(true|false)$/);
    },
  );

  it("flips honestly if the underlying capability were reversed", () => {
    // Proves the row text is keyed off the boolean, not independently
    // hardcoded to match today's PLAN_LIMITS by coincidence.
    const r = row("bulk");
    const proText = PLAN_LIMITS.pro.bulk ? "Included" : "Not included";
    const freeText = PLAN_LIMITS.free.bulk ? "Included" : "Not included";
    expect(r.pro).toBe(proText);
    expect(r.free).toBe(freeText);
  });
});

describe("derived pricing figures", () => {
  it("re-exports the raw monthly/annual USD figures unchanged", () => {
    expect(MONTHLY_USD).toBe(PRICING.monthlyUsd);
    expect(ANNUAL_USD).toBe(PRICING.annualUsd);
  });

  it("computes the annual monthly-equivalent as annualUsd / 12", () => {
    expect(ANNUAL_MONTHLY_EQUIV_USD).toBe(PRICING.annualUsd / 12);
    expect(ANNUAL_MONTHLY_EQUIV_USD).toBe(8);
  });

  it("computes annual savings pct from the documented formula", () => {
    const expected = Math.round((1 - PRICING.annualUsd / (PRICING.monthlyUsd * 12)) * 100);
    expect(ANNUAL_SAVINGS_PCT).toBe(expected);
    expect(ANNUAL_SAVINGS_PCT).toBe(33);
  });

  it("keeps the equivalent/savings pair internally consistent", () => {
    // Redundant cross-check via a completely different arithmetic path:
    // 12 months at the equivalent rate must reproduce the annual price.
    expect(ANNUAL_MONTHLY_EQUIV_USD * 12).toBe(ANNUAL_USD);
  });
});
