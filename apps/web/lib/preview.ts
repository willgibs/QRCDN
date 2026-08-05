import { renderQr } from "@qrcdn/qr-engine";
import { defaultQrStyle, type QrStyle } from "@qrcdn/shared";

// Pure wrapper around `renderQr` for the Studio live preview (P4-U4 red-team
// hardening). Colocated-tested (lib/preview.test.ts).
//
// Before this existed, studio-shell.tsx caught a `renderQr` failure by
// silently re-rendering the *default placeholder payload* with no
// indication anything had gone wrong — the scannability chip kept reporting
// "Scannable" against a code that didn't encode what the user actually
// typed. The only realistic way to hit that catch in normal use is a
// payload past QR capacity (empty input is short-circuited to the
// placeholder upstream in studio-shell.tsx before this ever runs; a bad
// style/logoDataUri can't reach here because both are re-validated — via
// `parseQrStyle` and `isLogoDataUri` — immediately before this is called).
// Confirmed empirically: `QRCode.create` throws
// "The amount of data is too big to be stored in a QR Code" for
// over-capacity input (packages/qr-engine/src/matrix.ts).

export const PREVIEW_PAYLOAD_DEFAULT = "HTTPS://QRCDN.COM/PREVIEW";

/**
 * The worst-case dynamic-code payload (P9.8-B3): `HTTPS://QRCDN.COM/` (18
 * chars) + a maximum-length 17-character vanity slug = 35 chars, exactly
 * the version-3-at-ECC-H alphanumeric capacity —
 * `packages/qr-engine/test/render.test.ts`'s "keeps the worst-case dynamic
 * payload at version ≤ 3" test pins both sides of that boundary at the
 * encoder level, and docs/DECISIONS.md's D12 amendment is the empirical
 * derivation behind the 17-character cap. Every real dynamic payload
 * (auto-generated or vanity, API included) is bounded at or under this
 * exact length, so evaluating a brand kit's scannability against THIS
 * payload — not a short placeholder — proves that kit for every dynamic
 * code it will ever mint, not just whatever is on screen right now.
 */
export const PREVIEW_PAYLOAD_WORST_CASE = "HTTPS://QRCDN.COM/" + "W".repeat(17);

export interface PreviewRenderResult {
  svg: string;
  /**
   * Set when `data` could not be encoded as typed — `svg` above is a
   * placeholder render, not a render of the attempted payload. Callers must
   * surface this rather than showing a "Scannable" status for content that
   * was never actually encoded.
   */
  error: string | null;
  /**
   * The QR symbol version (1-40) `renderQr` actually encoded at — surfaced
   * straight from `RenderResult.version` (packages/qr-engine/src/render.ts).
   * `scannabilityReport`'s own `ScannabilityReport` does NOT carry symbol
   * version (only `effectiveEcc`), so this wrapper is the one place the
   * Studio can read it without touching the engine — see
   * docs/guides/design-system.md's staging-grammar note for the full
   * fact-check. `null` on the error branch: the placeholder render's
   * version describes an unrelated payload, not the one the user typed, so
   * there's nothing honest to report (callers gate the scannability chip's
   * version readout on `error` being null anyway).
   */
  version: number | null;
}

function friendlyRenderError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (/too big/i.test(message)) {
    return "This payload is too long to encode as a QR code. Shorten it to see a live preview.";
  }
  return "Couldn't generate a preview for this payload.";
}

/**
 * Renders the live Studio preview. Never throws: falls back to a
 * placeholder render and an explicit `error` string when `data` can't be
 * encoded at the requested style (e.g. payload over QR capacity).
 */
export function renderPreview(
  data: string,
  style: QrStyle,
  logoDataUri?: string,
): PreviewRenderResult {
  try {
    const result = renderQr({ data, style, logoDataUri });
    return { svg: result.svg, error: null, version: result.version };
  } catch (err) {
    const svg = renderQr({ data: PREVIEW_PAYLOAD_DEFAULT, style: defaultQrStyle }).svg;
    return { svg, error: friendlyRenderError(err), version: null };
  }
}
