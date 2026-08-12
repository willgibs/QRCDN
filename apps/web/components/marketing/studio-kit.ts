// Shared kit vocabulary for section 03's studio object (P9.10-D11) —
// importable from server AND client trees (no directive), so the section,
// the config panel, and the island all speak one config type. Moved out of
// the retired studio-dials.tsx (P9.9-C2), values byte-identical.
//
// Color truth (the C2 certification, scratchpad verify-c2-dials.ts): all
// 48 reachable combos (3 modules x 4 eyes x 4 inks on white) instrument at
// 100. Only DARK inks on white paper are reachable here — the shader's
// luminance-as-height emboss (lib/webgl/qr-slab-shaders.ts) depends on
// that; if a light-on-dark kit ever becomes reachable, its height map
// inverts and the emboss must learn a direction flag.

import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { DOT_STYLES, EYE_FRAMES } from "@/components/qr/shape-swatches";

export type DotStyle = (typeof DOT_STYLES)[number];
export type EyeFrame = (typeof EYE_FRAMES)[number];

export interface KitConfig {
  dot: DotStyle;
  eye: EyeFrame;
  ink: string;
}

// Curated pairings, same values the studio presets ship: module size
// follows the shape, pupil follows the frame.
export const MODULE_SIZE: Record<DotStyle, number> = {
  square: 1,
  rounded: 0.88,
  circle: 0.78,
};
export const EYE_PUPIL: Record<EyeFrame, "square" | "rounded" | "dot"> = {
  square: "square",
  rounded: "rounded",
  circle: "dot",
  leaf: "rounded",
};

// All four instrument-certified on white. Ember's espresso leads: the
// recurring demo kit's own ink. sRGB hex literals on purpose — these reach
// `renderQr`, which throws on anything else (CLAUDE.md hard rule).
export const INKS = ["#131316", "#1e3a8a", "#0f766e", "#b91c1c"] as const;

export const WHITE = "#ffffff";

// Anonymous studio play, deliberately NOT the Ember cast section 04 owns.
export const STUDIO_PAYLOAD = "HTTPS://QRCDN.COM/HELLO";
export const STUDIO_LABEL = "qrcdn.com/hello";

export const DEFAULT_KIT: KitConfig = { dot: "rounded", eye: "leaf", ink: INKS[0] };

export function kitStyle(config: KitConfig, paper: string = WHITE): QrStyle {
  return parseQrStyle({
    v: 1,
    dots: { style: config.dot, sizeRatio: MODULE_SIZE[config.dot] },
    eyes: { frame: config.eye, pupil: EYE_PUPIL[config.eye], color: null },
    fill: { type: "solid", color: config.ink },
    background: { transparent: false, color: paper },
  });
}
