import type { QrStyle } from "@qrcdn/shared";
import type { EccLevel } from "./matrix";

// Scannability guardrails (D6). Numbers come from the researched guidance:
// ISO/IEC 18004-derived practice + Denso Wave print rules. These run in the
// studio (live score), in the API (validation), and in CI (decode tests).

/**
 * Empirical decode limits for the *effective* knockout ratio — logo sizeRatio
 * plus padding dilution at the symbol version the renderer will actually use.
 * Measured by the adversarial zxing round-trip campaigns (2026-07-21, ECC H,
 * v3 and v5 symbols): every failing config had effective linear ratio
 * ≥ ~0.418; every passing one ≤ ~0.407. The Q exemption boundary is tighter:
 * Q survives only up to ~0.32 effective (≈10% area including padding).
 */
const LOGO_EFFECTIVE_WARN = 0.395;
const LOGO_EFFECTIVE_ERROR = 0.412;
const LOGO_RATIO_ECC_Q_OK = 0.316;

export function modulesForVersion(version: number): number {
  return 17 + 4 * version;
}

/**
 * The minimum symbol version the renderer floors to for a knockout logo.
 * Chosen so the effective ratio stays inside the empirically-safe band where
 * possible: v3 only while padding dilution at 29 modules stays under the warn
 * threshold, else v5 (which also keeps v3's clipped alignment pattern out of
 * the damage zone).
 */
export function logoFloorVersion(logo: {
  sizeRatio: number;
  padding: number;
}): number {
  const effV3 = logo.sizeRatio + (2 * logo.padding) / modulesForVersion(3);
  return effV3 <= LOGO_EFFECTIVE_WARN ? 3 : 5;
}

/** Linear knockout ratio including padding, at the version the renderer floors to. */
export function effectiveLogoRatio(logo: {
  sizeRatio: number;
  padding: number;
}): number {
  const modules = modulesForVersion(logoFloorVersion(logo));
  return logo.sizeRatio + (2 * logo.padding) / modules;
}

const ECC_ORDER: EccLevel[] = ["L", "M", "Q", "H"];

/**
 * The ECC level the engine will actually encode with. Never lower than the
 * requested level; forced to H when a logo knockout is on, unless the
 * *effective* knockout (including padding, at the floor version) stays within
 * ≈10% area and Q was requested. Gating on raw sizeRatio alone produced
 * undecodable score-100 styles — padding must count.
 */
export function effectiveEcc(style: QrStyle): EccLevel {
  const requested = style.ecc;
  if (!style.logo?.knockout) return requested;
  if (requested === "Q" && effectiveLogoRatio(style.logo) <= LOGO_RATIO_ECC_Q_OK) {
    return "Q";
  }
  return "H";
}

export function raiseEcc(a: EccLevel, b: EccLevel): EccLevel {
  const winner = Math.max(ECC_ORDER.indexOf(a), ECC_ORDER.indexOf(b));
  return ECC_ORDER[winner] ?? "H";
}

function srgbChannel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

function foregroundStops(style: QrStyle): string[] {
  return style.fill.type === "solid"
    ? [style.fill.color]
    : style.fill.stops.map((s) => s.color);
}

export interface ScannabilityIssue {
  code:
    | "low-contrast"
    | "marginal-contrast"
    | "inverted"
    | "logo-unscannable"
    | "logo-over-recommended"
    | "logo-no-knockout"
    | "sparse-dots";
  severity: "error" | "warning";
  message: string;
}

export interface ScannabilityReport {
  /** 0–100; ≥80 good, 50–79 risky, <50 likely unscannable */
  score: number;
  issues: ScannabilityIssue[];
  worstContrast: number;
  effectiveEcc: EccLevel;
}

export interface ScannabilityOptions {
  /**
   * Assumed surface color behind a transparent background (e.g. the studio
   * preview surface or the material the code will be printed on). Defaults to
   * white.
   */
  transparentBackdrop?: string;
}

export function scannabilityReport(
  style: QrStyle,
  opts: ScannabilityOptions = {},
): ScannabilityReport {
  const issues: ScannabilityIssue[] = [];
  const bg = style.background.transparent
    ? (opts.transparentBackdrop ?? "#ffffff")
    : style.background.color;
  const stops = foregroundStops(style);
  const eyeColors = style.eyes.color ? [style.eyes.color] : [];

  let worst = Infinity;
  let inverted = false;
  for (const color of [...stops, ...eyeColors]) {
    worst = Math.min(worst, contrastRatio(color, bg));
    if (relativeLuminance(color) > relativeLuminance(bg)) inverted = true;
  }

  if (worst < 3) {
    issues.push({
      code: "low-contrast",
      severity: "error",
      message: `Foreground/background contrast is ${worst.toFixed(2)}:1 — below the 3:1 minimum; many scanners will fail.`,
    });
  } else if (worst < 4) {
    issues.push({
      code: "marginal-contrast",
      severity: "warning",
      message: `Contrast ${worst.toFixed(2)}:1 is below the recommended 4:1 — may fail in poor lighting or on worn prints.`,
    });
  }
  if (inverted) {
    issues.push({
      code: "inverted",
      severity: "warning",
      message:
        "Light modules on a dark background — some older scanners cannot read inverted codes.",
    });
  }
  if (style.logo) {
    const effective = effectiveLogoRatio(style.logo);
    if (effective > LOGO_EFFECTIVE_ERROR) {
      issues.push({
        code: "logo-unscannable",
        severity: "error",
        message:
          "Logo plus knockout padding covers too much of the code — decode testing shows codes this size fail to scan. Shrink the logo or reduce padding.",
      });
    } else if (effective > LOGO_EFFECTIVE_WARN) {
      issues.push({
        code: "logo-over-recommended",
        severity: "warning",
        message:
          "Logo plus padding is near the scannability limit — leaves little error-correction headroom for print wear.",
      });
    }
    if (!style.logo.knockout && style.logo.sizeRatio > 0.25) {
      issues.push({
        code: "logo-no-knockout",
        severity: "warning",
        message:
          "Large logo without module knockout overlaps data unpredictably — enable knockout or shrink the logo.",
      });
    }
  }
  if (style.dots.style === "circle" && style.dots.sizeRatio < 0.5) {
    issues.push({
      code: "sparse-dots",
      severity: "warning",
      message:
        "Very small circular dots reduce inked area sharply — risky at small print sizes.",
    });
  }

  let score = 100;
  for (const issue of issues) score -= issue.severity === "error" ? 45 : 15;

  return {
    score: Math.max(0, score),
    issues,
    worstContrast: worst === Infinity ? 21 : worst,
    effectiveEcc: effectiveEcc(style),
  };
}
