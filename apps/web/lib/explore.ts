import { parseQrStyle, type QrStyle } from "@qrcdn/shared";

export const BRANDS = ["precision", "warmth", "bold"] as const;
export type Brand = (typeof BRANDS)[number];

export function isBrand(value: string): value is Brand {
  return (BRANDS as readonly string[]).includes(value);
}

/** Each direction's signature QR style — sRGB hex only (D6). */
export const brandQrStyles: Record<Brand, { light: QrStyle; dark: QrStyle }> = {
  precision: {
    light: parseQrStyle({
      v: 1,
      dots: { style: "square", sizeRatio: 0.92 },
      eyes: { frame: "square", pupil: "square", color: null },
      fill: { type: "solid", color: "#16161d" },
      background: { transparent: true },
    }),
    dark: parseQrStyle({
      v: 1,
      dots: { style: "square", sizeRatio: 0.92 },
      eyes: { frame: "square", pupil: "square", color: null },
      fill: { type: "solid", color: "#e8e8f0" },
      background: { transparent: true },
    }),
  },
  warmth: {
    light: parseQrStyle({
      v: 1,
      dots: { style: "rounded", sizeRatio: 0.95 },
      eyes: { frame: "leaf", pupil: "rounded", color: null },
      fill: { type: "solid", color: "#2d2418" },
      background: { transparent: true },
    }),
    dark: parseQrStyle({
      v: 1,
      dots: { style: "rounded", sizeRatio: 0.95 },
      eyes: { frame: "leaf", pupil: "rounded", color: null },
      fill: { type: "solid", color: "#efe7d8" },
      background: { transparent: true },
    }),
  },
  bold: {
    light: parseQrStyle({
      v: 1,
      dots: { style: "circle", sizeRatio: 0.88 },
      eyes: { frame: "rounded", pupil: "circle", color: "#7c3aed" },
      fill: { type: "solid", color: "#241b3d" },
      background: { transparent: true },
    }),
    dark: parseQrStyle({
      v: 1,
      dots: { style: "circle", sizeRatio: 0.88 },
      eyes: { frame: "rounded", pupil: "circle", color: "#a78bfa" },
      fill: { type: "solid", color: "#ece5fb" },
      background: { transparent: true },
    }),
  },
};

/** Effective surface color behind transparent-background preview codes —
 *  must match each theme's --qr-bg values in app/themes/. */
export const brandQrBackdrop: Record<Brand, { light: string; dark: string }> = {
  precision: { light: "#ffffff", dark: "#131318" },
  warmth: { light: "#faf6ee", dark: "#241e15" },
  bold: { light: "#fffdf5", dark: "#1b1430" },
};

export interface BrandCopy {
  label: string;
  tagline: string;
  headline: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  proCta: string;
}

export const brandCopy: Record<Brand, BrandCopy> = {
  precision: {
    label: "Precision instrument",
    tagline: "QR infrastructure, engineered.",
    headline: "One code. Every destination you'll ever need.",
    sub: "Set your brand's QR identity once. Every code inherits it — served from the edge, retargetable forever, measured to the scan.",
    ctaPrimary: "Start building",
    ctaSecondary: "See the API",
    proCta: "Upgrade to Pro",
  },
  warmth: {
    label: "Design studio warmth",
    tagline: "The QR studio for brands with taste.",
    headline: "Beautiful codes, designed once, everywhere.",
    sub: "Give your brand a QR identity as considered as your typography. Print with confidence — the destination can change, the code never has to.",
    ctaPrimary: "Open the studio",
    ctaSecondary: "See pricing",
    proCta: "Go Pro",
  },
  bold: {
    label: "Bold & playful",
    tagline: "QR codes that actually look like you.",
    headline: "Print it once. Change it forever.",
    sub: "Design a code that belongs on your poster, menu, or merch — then swap where it points anytime. No reprints. No dead codes. Ever.",
    ctaPrimary: "Make my code",
    ctaSecondary: "How it works",
    proCta: "Get Pro",
  },
};
