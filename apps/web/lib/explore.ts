import { parseQrStyle, type QrStyle } from "@qrcdn/shared";

// Precision is the locked direction (checkpoint A, D13). The /explore route
// remains the working canvas for the marketing page until P9 promotes it.

export const BRANDS = ["precision"] as const;
export type Brand = (typeof BRANDS)[number];

export function isBrand(value: string): value is Brand {
  return (BRANDS as readonly string[]).includes(value);
}

/** The brand QR style — sRGB hex only (D6). */
export const brandQrStyles: Record<Brand, { light: QrStyle; dark: QrStyle }> = {
  precision: {
    light: parseQrStyle({
      v: 1,
      dots: { style: "square", sizeRatio: 0.92 },
      eyes: { frame: "square", pupil: "square", color: null },
      fill: { type: "solid", color: "#131316" },
      background: { transparent: true },
    }),
    dark: parseQrStyle({
      v: 1,
      dots: { style: "square", sizeRatio: 0.92 },
      eyes: { frame: "square", pupil: "square", color: null },
      fill: { type: "solid", color: "#ececf1" },
      background: { transparent: true },
    }),
  },
};

/** Effective surface color behind transparent-background preview codes —
 *  must match --qr-bg in globals.css. */
export const brandQrBackdrop: Record<Brand, { light: string; dark: string }> = {
  precision: { light: "#ffffff", dark: "#101013" },
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
    headline: "One code.\nEvery destination",
    sub: "Set your brand's QR identity once. Every code inherits it — served from the edge, retargetable forever, measured to the scan.",
    ctaPrimary: "Start building",
    ctaSecondary: "See the API",
    proCta: "Upgrade to Pro",
  },
};
