import type { EyeCorner } from "./geometry";

// All coordinates are in module units. Numbers are formatted to a fixed
// 3-decimal precision so output bytes are identical across platforms.

export function fmt(n: number): string {
  const s = n.toFixed(3);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M${fmt(x)} ${fmt(y)}h${fmt(w)}v${fmt(h)}h${fmt(-w)}z`;
}

/** Rounded rect with per-corner radii [tl, tr, br, bl]. r=0 corners are sharp. */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: [number, number, number, number],
): string {
  const [tl, tr, br, bl] = radii;
  const arc = (r: number, dx: number, dy: number) =>
    r > 0 ? `a${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(dx)} ${fmt(dy)}` : "";
  return (
    `M${fmt(x + tl)} ${fmt(y)}` +
    `h${fmt(w - tl - tr)}` +
    arc(tr, tr, tr) +
    `v${fmt(h - tr - br)}` +
    arc(br, -br, br) +
    `h${fmt(-(w - br - bl))}` +
    arc(bl, -bl, -bl) +
    `v${fmt(-(h - bl - tl))}` +
    arc(tl, tl, -tl) +
    "z"
  );
}

export function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M${fmt(cx - r)} ${fmt(cy)}` +
    `a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0` +
    `a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0z`
  );
}

export type DotShape = "square" | "rounded" | "circle";

/** One data module at (x, y) with footprint `sizeRatio` of the module pitch. */
export function dotPath(
  shape: DotShape,
  x: number,
  y: number,
  sizeRatio: number,
): string {
  const inset = (1 - sizeRatio) / 2;
  const s = sizeRatio;
  switch (shape) {
    case "square":
      return rectPath(x + inset, y + inset, s, s);
    case "rounded": {
      const r = s * 0.3;
      return roundedRectPath(x + inset, y + inset, s, s, [r, r, r, r]);
    }
    case "circle":
      return circlePath(x + 0.5, y + 0.5, s / 2);
  }
}

export type EyeFrameStyle = "square" | "rounded" | "circle" | "leaf";
export type EyePupilStyle = "square" | "rounded" | "circle" | "dot";

/**
 * 7×7 eye frame ring (1-module wall) at (x, y). Returned as outer+inner
 * subpaths for fill-rule="evenodd".
 */
export function eyeFramePath(
  style: EyeFrameStyle,
  x: number,
  y: number,
  corner: EyeCorner,
): string {
  switch (style) {
    case "square":
      return rectPath(x, y, 7, 7) + rectPath(x + 1, y + 1, 5, 5);
    case "rounded": {
      const R = 2.25;
      const r = 1.25;
      return (
        roundedRectPath(x, y, 7, 7, [R, R, R, R]) +
        roundedRectPath(x + 1, y + 1, 5, 5, [r, r, r, r])
      );
    }
    case "circle":
      return circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5);
    case "leaf": {
      // Rounded frame with one sharp corner, oriented outward per eye position.
      // Radii match the "rounded" frame: the original heavier 2.5/1.5 rounding
      // broke zxing finder detection on v7+ symbols at small raster sizes.
      const R = 2.25;
      const r = 1.25;
      const outer: [number, number, number, number] =
        corner === "tl" ? [0, R, R, R] : corner === "tr" ? [R, 0, R, R] : [R, R, R, 0];
      const inner: [number, number, number, number] =
        corner === "tl" ? [0, r, r, r] : corner === "tr" ? [r, 0, r, r] : [r, r, r, 0];
      return (
        roundedRectPath(x, y, 7, 7, outer) +
        roundedRectPath(x + 1, y + 1, 5, 5, inner)
      );
    }
  }
}

/** 3×3 eye pupil centered in the 7×7 eye at (x, y). */
export function eyePupilPath(style: EyePupilStyle, x: number, y: number): string {
  const px = x + 2;
  const py = y + 2;
  switch (style) {
    case "square":
      return rectPath(px, py, 3, 3);
    case "rounded": {
      const r = 0.9;
      return roundedRectPath(px, py, 3, 3, [r, r, r, r]);
    }
    case "circle":
      return circlePath(x + 3.5, y + 3.5, 1.5);
    case "dot":
      return circlePath(x + 3.5, y + 3.5, 1.3);
  }
}
