// Finder-pattern ("eye") geometry. Eyes are rendered as dedicated solid
// shapes and are exempt from dot styling by construction (D6), so the dot
// pass must skip their 7×7 regions.

export type EyeCorner = "tl" | "tr" | "bl";

export interface EyeRegion {
  corner: EyeCorner;
  /** top-left module coordinate of the 7×7 finder pattern */
  x: number;
  y: number;
}

export function eyeRegions(size: number): EyeRegion[] {
  return [
    { corner: "tl", x: 0, y: 0 },
    { corner: "tr", x: size - 7, y: 0 },
    { corner: "bl", x: 0, y: size - 7 },
  ];
}

export function inAnyEye(size: number, x: number, y: number): boolean {
  return (
    (x < 7 && y < 7) ||
    (x >= size - 7 && y < 7) ||
    (x < 7 && y >= size - 7)
  );
}
