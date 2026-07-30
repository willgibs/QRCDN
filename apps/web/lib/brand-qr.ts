import { parseQrStyle, type QrStyle } from "@qrcdn/shared";

// Moved from lib/explore.ts at P9-U5 (docs/guides/p9-marketing.md's U5
// migration table) when /explore was retired. brandQrStyles/brandQrBackdrop
// are real, still-consumed brand primitives (the studio + every marketing
// surface that renders a static QR preview) — unlike BRANDS/isBrand/
// brandCopy, which existed only to drive /explore's multi-brand switcher
// and were deleted alongside it rather than moved. Precision is the only
// brand (checkpoint A, D13 lock), so these are keyed by the literal
// "precision" string instead of a generic Brand union type.

/** The brand QR style — sRGB hex only (D6). */
export const brandQrStyles: { precision: { light: QrStyle; dark: QrStyle } } = {
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
export const brandQrBackdrop: { precision: { light: string; dark: string } } = {
  precision: { light: "#ffffff", dark: "#101013" },
};
