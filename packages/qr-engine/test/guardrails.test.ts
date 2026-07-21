import { describe, expect, it } from "vitest";
import { parseQrStyle } from "@qrcdn/shared";
import { contrastRatio, effectiveEcc, scannabilityReport } from "../src";

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
