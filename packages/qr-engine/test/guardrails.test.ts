import { describe, expect, it } from "vitest";
import { parseQrStyle } from "@qrcdn/shared";
import {
  CONTRAST_ERROR_MIN,
  CONTRAST_WARN_MIN,
  LOGO_EFFECTIVE_ERROR,
  LOGO_EFFECTIVE_WARN,
  contrastRatio,
  effectiveEcc,
  effectiveLogoRatio,
  scannabilityReport,
} from "../src";

describe("effectiveEcc", () => {
  it("passes through when no logo", () => {
    expect(effectiveEcc(parseQrStyle({ v: 1, ecc: "L" }))).toBe("L");
  });

  it("forces H with a logo knockout", () => {
    const style = parseQrStyle({
      v: 1,
      ecc: "L",
      logo: { assetId: "x", sizeRatio: 0.35, padding: 1, knockout: true, shape: "auto" },
    });
    expect(effectiveEcc(style)).toBe("H");
  });

  it("allows Q only when the padding-inclusive effective area is ≤10%", () => {
    const small = parseQrStyle({
      v: 1,
      ecc: "Q",
      logo: { assetId: "x", sizeRatio: 0.24, padding: 1, knockout: true, shape: "auto" },
    });
    expect(effectiveEcc(small)).toBe("Q");
    // Raw sizeRatio ≤ 0.316 but padding pushes effective coverage past the
    // limit — this exact shape shipped undecodable codes before the fix.
    const padded = parseQrStyle({
      v: 1,
      ecc: "Q",
      logo: { assetId: "x", sizeRatio: 0.3, padding: 1, knockout: true, shape: "auto" },
    });
    expect(effectiveEcc(padded)).toBe("H");
  });
});

describe("contrastRatio", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  it("is symmetric", () => {
    expect(contrastRatio("#336699", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#336699"),
      5,
    );
  });
});

describe("scannabilityReport", () => {
  it("scores a clean default at 100", () => {
    const report = scannabilityReport(parseQrStyle({ v: 1 }));
    expect(report.score).toBe(100);
    expect(report.issues).toHaveLength(0);
  });

  it("flags low contrast as an error", () => {
    const report = scannabilityReport(
      parseQrStyle({ v: 1, fill: { type: "solid", color: "#cccccc" } }),
    );
    expect(report.issues.some((i) => i.code === "low-contrast")).toBe(true);
    expect(report.score).toBeLessThan(80);
  });

  // P9.5-T3b: CONTRAST_ERROR_MIN/CONTRAST_WARN_MIN are exported specifically
  // so a live UI (the landing playground's scannability meter) can plot the
  // real thresholds instead of re-typing them. This test locks the values
  // AND proves scannabilityReport's own issue codes still flip exactly at
  // those boundaries, so the exported constants can never silently drift
  // out of sync with the analytic logic that actually uses them.
  it("exports the real contrast thresholds, and issues flip exactly at them", () => {
    expect(CONTRAST_ERROR_MIN).toBe(3);
    expect(CONTRAST_WARN_MIN).toBe(4);

    const justBelowError = scannabilityReport(
      parseQrStyle({ v: 1, fill: { type: "solid", color: "#999999" } }),
    );
    expect(justBelowError.worstContrast).toBeLessThan(CONTRAST_ERROR_MIN);
    expect(justBelowError.issues.map((i) => i.code)).toContain("low-contrast");

    const betweenErrorAndWarn = scannabilityReport(
      parseQrStyle({ v: 1, fill: { type: "solid", color: "#8a8a8a" } }),
    );
    expect(betweenErrorAndWarn.worstContrast).toBeGreaterThanOrEqual(CONTRAST_ERROR_MIN);
    expect(betweenErrorAndWarn.worstContrast).toBeLessThan(CONTRAST_WARN_MIN);
    expect(betweenErrorAndWarn.issues.map((i) => i.code)).toContain("marginal-contrast");

    const cleanDefault = scannabilityReport(parseQrStyle({ v: 1 }));
    expect(cleanDefault.worstContrast).toBeGreaterThanOrEqual(CONTRAST_WARN_MIN);
    expect(cleanDefault.issues).toHaveLength(0);
  });

  it("gradient contrast is governed by the worst stop", () => {
    const report = scannabilityReport(
      parseQrStyle({
        v: 1,
        fill: {
          type: "linearGradient",
          rotation: 0,
          stops: [
            { offset: 0, color: "#000000" },
            { offset: 1, color: "#dddddd" },
          ],
        },
      }),
    );
    expect(report.worstContrast).toBeLessThan(3);
    expect(report.issues.some((i) => i.code === "low-contrast")).toBe(true);
  });

  it("errors on logo+padding beyond the empirical decode limit", () => {
    const report = scannabilityReport(
      parseQrStyle({
        v: 1,
        logo: { assetId: "x", sizeRatio: 0.38, padding: 1, knockout: true, shape: "auto" },
      }),
    );
    expect(report.issues.some((i) => i.code === "logo-unscannable")).toBe(true);
  });

  it("keeps the studio-default logo clean", () => {
    const report = scannabilityReport(
      parseQrStyle({
        v: 1,
        logo: { assetId: "x", sizeRatio: 0.32, padding: 1, knockout: true, shape: "auto" },
      }),
    );
    expect(report.issues).toHaveLength(0);
  });

  // P9.5-T3c: LOGO_EFFECTIVE_WARN/LOGO_EFFECTIVE_ERROR are exported
  // specifically so the landing's guardrails threshold plot can import the
  // real campaign thresholds instead of re-typing them. This test locks the
  // values AND proves scannabilityReport's own issue codes flip in the
  // expected order as effectiveLogoRatio crosses them (all three styles
  // floor to the same v5 symbol — modulesForVersion(5) = 37 — isolating the
  // WARN/ERROR crossing from a version-floor change), so the exported
  // constants can never silently drift out of sync with the analytic logic
  // that actually uses them.
  it("exports the real logo-effective-ratio thresholds, and issues flip in order", () => {
    expect(LOGO_EFFECTIVE_WARN).toBe(0.395);
    expect(LOGO_EFFECTIVE_ERROR).toBe(0.412);

    const clean = { assetId: "x", sizeRatio: 0.33, padding: 1, knockout: true, shape: "auto" as const };
    const warn = { assetId: "x", sizeRatio: 0.35, padding: 1, knockout: true, shape: "auto" as const };
    const error = { assetId: "x", sizeRatio: 0.36, padding: 1, knockout: true, shape: "auto" as const };

    expect(effectiveLogoRatio(clean)).toBeLessThan(LOGO_EFFECTIVE_WARN);
    expect(effectiveLogoRatio(warn)).toBeGreaterThanOrEqual(LOGO_EFFECTIVE_WARN);
    expect(effectiveLogoRatio(warn)).toBeLessThan(LOGO_EFFECTIVE_ERROR);
    expect(effectiveLogoRatio(error)).toBeGreaterThanOrEqual(LOGO_EFFECTIVE_ERROR);

    const cleanReport = scannabilityReport(parseQrStyle({ v: 1, logo: clean }));
    expect(cleanReport.issues).toHaveLength(0);

    const warnReport = scannabilityReport(parseQrStyle({ v: 1, logo: warn }));
    expect(warnReport.issues.map((i) => i.code)).toContain("logo-over-recommended");
    expect(warnReport.issues.some((i) => i.code === "logo-unscannable")).toBe(false);

    const errorReport = scannabilityReport(parseQrStyle({ v: 1, logo: error }));
    expect(errorReport.issues.map((i) => i.code)).toContain("logo-unscannable");
  });

  it("warns on inverted codes", () => {
    const report = scannabilityReport(
      parseQrStyle({
        v: 1,
        fill: { type: "solid", color: "#ffffff" },
        background: { transparent: false, color: "#111111" },
      }),
    );
    expect(report.issues.some((i) => i.code === "inverted")).toBe(true);
  });
});
