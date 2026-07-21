// @qrcdn/qr-engine — pure-TS styled QR renderer.
// Contract: zero DOM/Node dependencies in the render path; SVG output is
// deterministic string generation so browser preview and server export
// produce identical bytes.

export const ENGINE_VERSION = 1;

export { renderQr, DEFAULT_QUIET_ZONE } from "./render";
export type { RenderRequest, RenderResult } from "./render";
export { encodeMatrix, isDark } from "./matrix";
export type { EncodedQr, EccLevel } from "./matrix";
export {
  scannabilityReport,
  effectiveEcc,
  effectiveLogoRatio,
  contrastRatio,
  relativeLuminance,
} from "./guardrails";
export type {
  ScannabilityReport,
  ScannabilityIssue,
  ScannabilityOptions,
} from "./guardrails";
