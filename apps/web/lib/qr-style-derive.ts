import type { QrStyle } from "@qrcdn/shared";

// Small derivations shared across the Studio so every surface reads a
// QrStyle's "ink" the same way — previously duplicated inline in
// studio-shell.tsx (ArtifactStage glow) and controls-rail.tsx (Ink swatch
// value); P4 design-iteration note 4 added a third caller (kit-bar's pill/
// menu ModuleMark tint), which is what made the duplication worth collapsing.

/** The color driving ambient glows / tinted marks for a style — the solid
 *  fill color, or a gradient's first stop (the "glow inkHex stays first-stop"
 *  convention noted in qr-engine.md's gradient guidance). Falls back to the
 *  schema-default ink (`#111111`) if a gradient somehow has zero stops
 *  (unreachable through the Studio's own controls — the schema requires at
 *  least 2 — but defensive since this reads persisted kit snapshots too). */
export function inkHexFromStyle(style: QrStyle): string {
  return style.fill.type === "solid" ? style.fill.color : (style.fill.stops[0]?.color ?? "#111111");
}
