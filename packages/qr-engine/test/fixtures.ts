import { parseQrStyle, type QrStyle } from "@qrcdn/shared";

// A 16×16 red PNG, base64 — stands in for an uploaded logo in tests.
export const TEST_LOGO_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mP8z8BQz0AEYBxVSF+FoyEwGgKjIQAAoAAB/1ARFVIAAAAASUVORK5CYII=";

/** The canonical dynamic-code payload shape (uppercase → alphanumeric mode). */
export const TEST_URL = "HTTPS://QRCDN.COM/K7M2X9A";

export const stylePresets: Record<string, QrStyle> = {
  default: parseQrStyle({ v: 1 }),
  roundedInk: parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.92 },
    eyes: { frame: "rounded", pupil: "rounded", color: null },
    fill: { type: "solid", color: "#1a1a2e" },
    background: { transparent: false, color: "#f7f4ef" },
  }),
  circleGradient: parseQrStyle({
    v: 1,
    dots: { style: "circle", sizeRatio: 0.85 },
    eyes: { frame: "circle", pupil: "circle", color: "#0f3460" },
    fill: {
      type: "linearGradient",
      rotation: Math.PI / 4,
      stops: [
        { offset: 0, color: "#0f3460" },
        { offset: 1, color: "#16213e" },
      ],
    },
  }),
  leafRadial: parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 1 },
    eyes: { frame: "leaf", pupil: "dot", color: null },
    fill: {
      type: "radialGradient",
      stops: [
        { offset: 0, color: "#111111" },
        { offset: 1, color: "#3a0ca3" },
      ],
    },
  }),
  logoKnockout: parseQrStyle({
    v: 1,
    ecc: "M",
    dots: { style: "rounded", sizeRatio: 0.95 },
    eyes: { frame: "rounded", pupil: "circle", color: null },
    fill: { type: "solid", color: "#111111" },
    logo: {
      assetId: "test-asset",
      sizeRatio: 0.3,
      padding: 1,
      knockout: true,
      shape: "auto",
    },
  }),
};
