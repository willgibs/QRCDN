/**
 * Brand-image pipeline (P9-U1) — docs/guides/p9-marketing.md, "Brand-image
 * pipeline" section. Run via `pnpm generate:brand-images` (apps/web).
 *
 * Hand-composes plain SVG strings (no satori/JSX — see D4's "PNG via
 * @resvg/resvg-js in the web app only" line), rasterizes them with
 * @resvg/resvg-js using the Inter TTFs committed under
 * scripts/assets/fonts/, and self-verifies the homepage OG's embedded QR by
 * decoding the rendered pixels with zxing-wasm before anything is written
 * to disk. Outputs are deterministic, committed bytes — never generated at
 * `next build` time. Re-run this script and re-commit its outputs whenever
 * the copy, tokens, or QR payload it references change.
 *
 * U1 writes:
 *   - app/apple-icon.png              (180x180, opaque — Apple icons must
 *                                       not be transparent)
 *   - app/(marketing)/opengraph-image.png (1200x630)
 *   - app/(marketing)/opengraph-image.alt.txt
 *
 * U3 extends this file with a pricing OG (below) rather than duplicating
 * the raster/verify plumbing:
 *   - app/(marketing)/pricing/opengraph-image.png (1200x630)
 *   - app/(marketing)/pricing/opengraph-image.alt.txt
 *
 * U4 adds ONE shared legal OG — same composition, written to both routes
 * (terms and privacy share a single generic legal variant, not two):
 *   - app/(marketing)/terms/opengraph-image.png (1200x630)
 *   - app/(marketing)/terms/opengraph-image.alt.txt
 *   - app/(marketing)/privacy/opengraph-image.png (1200x630, byte-identical
 *     to the terms PNG)
 *   - app/(marketing)/privacy/opengraph-image.alt.txt
 *
 * P9.5-T-F1 adds two feature-page OGs, each with its own payload (unlike
 * the legal pair, these are NOT byte-identical to each other or to any
 * earlier output — two distinct headlines, two distinct deep-link QRs):
 *   - app/(marketing)/features/dynamic-codes/opengraph-image.png (1200x630)
 *   - app/(marketing)/features/dynamic-codes/opengraph-image.alt.txt
 *   - app/(marketing)/features/analytics/opengraph-image.png (1200x630)
 *   - app/(marketing)/features/analytics/opengraph-image.alt.txt
 *
 * P9.5-T-F2 adds the second pair of feature-page OGs, same pattern:
 *   - app/(marketing)/features/brand-studio/opengraph-image.png (1200x630)
 *   - app/(marketing)/features/brand-studio/opengraph-image.alt.txt
 *   - app/(marketing)/features/access-controls/opengraph-image.png (1200x630)
 *   - app/(marketing)/features/access-controls/opengraph-image.alt.txt
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "../lib/brand-qr";
// The pricing OG's two dollar figures come straight from entitlements.ts
// (CLAUDE.md hard rule: entitlement/pricing numbers live there only) —
// this script can and does import app modules directly, per the U3 spec.
import { PRICING } from "../lib/entitlements";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(SCRIPT_DIR, "..");
const FONT_DIR = join(SCRIPT_DIR, "assets/fonts");

const require = createRequire(import.meta.url);

// The OG QR encodes the apex in uppercase alphanumeric-mode form (D1's
// densest encoding); the redirect Worker 301s `/` to www, so scanning a
// shared OG card lands a visitor on the real homepage.
const OG_PAYLOAD = "HTTPS://QRCDN.COM";

// The pricing OG's QR deep-links to /pricing specifically. Still uppercase
// alphanumeric-mode (":" and "/" are both in the QR alphanumeric charset,
// so this stays as dense as OG_PAYLOAD above) — the apex worker's host
// canonicalization 301 preserves the path (permanentRedirect in
// workers/redirect/src/responses.ts forwards `${WWW_ORIGIN}${pathAndSearch}`,
// not just the origin), so scanning this card lands a visitor on the real
// /pricing page, not just the homepage.
const OG_PRICING_PAYLOAD = "HTTPS://QRCDN.COM/PRICING";

// The two feature-page OGs (P9.5-T-F1) deep-link to their own real routes,
// same host-canonicalization-preserves-path reasoning as OG_PRICING_PAYLOAD
// above. "-" is inside the QR alphanumeric charset alongside "/" and ":",
// so both payloads stay uppercase alphanumeric-mode encodable end to end.
const OG_DYNAMIC_CODES_PAYLOAD = "HTTPS://QRCDN.COM/FEATURES/DYNAMIC-CODES";
const OG_ANALYTICS_PAYLOAD = "HTTPS://QRCDN.COM/FEATURES/ANALYTICS";

// P9.5-T-F2's second pair, same reasoning.
const OG_BRAND_STUDIO_PAYLOAD = "HTTPS://QRCDN.COM/FEATURES/BRAND-STUDIO";
const OG_ACCESS_CONTROLS_PAYLOAD = "HTTPS://QRCDN.COM/FEATURES/ACCESS-CONTROLS";

// ---------------------------------------------------------------------
// sRGB hex palette — exported brand assets are sRGB hex only, never oklch
// (CLAUDE.md hard rule). The design system's actual tokens are oklch
// (apps/web/app/globals.css). Each hex value below is that oklch token's
// OWN browser-rendered sRGB output — set as a Canvas2D `fillStyle`, filled
// into a rect, then read back with `getImageData` (i.e. the literal pixels
// Chrome paints for that oklch() value) — not a hand-rolled matrix
// conversion, not eyeballed. Recompute the same way if the source token in
// globals.css ever changes; each comment cites the exact source line.
// ---------------------------------------------------------------------
const DARK_BACKGROUND = "#070709"; // .dark --background: oklch(0.13 0.004 280) — globals.css:116
const DARK_FOREGROUND = "#f1f2f3"; // .dark --foreground: oklch(0.96 0.002 280) — globals.css:117
const DARK_MUTED_FOREGROUND = "#85868a"; // .dark --muted-foreground: oklch(0.62 0.006 280) — globals.css:127
// P9.10-D1 (D13 as amended): the violet primary retired from the base —
// the brand's color is the aurora family, and the CTA register is
// near-white ink. The two glow hexes are hand-picked sRGB approximations
// of --au-1 oklch(0.8 0.16 160) / --au-2 oklch(0.7 0.2 330) (globals.css)
// — approximation is fine here: they paint a 35%-opacity blurred decor
// glow, not a brand-exact surface (unlike the favicon's computed hexes).
const AU_MINT = "#57e6b0";
const AU_MAGENTA = "#e05ab5";
const WHITE_INK = "#fafafa"; // .dark --primary register (near-white CTA ink)
const QR_PAPER = "#ffffff"; // --qr-bg (light) — globals.css:104, must match brandQrBackdrop.precision.light (lib/brand-qr.ts)

function fontFiles(): string[] {
  return [
    join(FONT_DIR, "Inter-Regular.ttf"),
    join(FONT_DIR, "Inter-SemiBold.ttf"),
    join(FONT_DIR, "Inter-Bold.ttf"),
  ];
}

function rasterize(svg: string, widthPx: number): Buffer {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: widthPx },
    font: {
      loadSystemFonts: false,
      fontFiles: fontFiles(),
      defaultFontFamily: "Inter",
    },
  })
    .render()
    .asPng();
  return png;
}

/** QRCDN brand mark (components/brand/marks.tsx's ModuleMark, the
 *  board-supplied maze glyph, P9.10-D1 close-out) as a raw SVG fragment —
 *  composed into a larger hand-laid SVG string, not a live DOM node, so
 *  the gradient is inlined with a position-derived id (one mark per
 *  document today; the id stays collision-proof if that ever changes).
 *  Path data verbatim from the board SVG (269 viewBox), scaled to size. */
const MARK_PATHS = [
  "M204.797 6.40002C204.797 2.8654 207.662 1.75949e-05 211.197 1.79039e-05L262.397 2.238e-05C265.932 2.2689e-05 268.797 2.8654 268.797 6.40002V57.6C268.797 61.1346 265.932 64 262.397 64L211.197 64C207.662 64 204.797 61.1346 204.797 57.6V6.40002Z",
  "M204.797 224.001C204.797 220.466 201.932 217.601 198.397 217.601H172.798C169.264 217.601 166.398 220.466 166.398 224.001V262.401C166.398 265.935 163.533 268.801 159.998 268.801H108.798C105.264 268.801 102.398 265.935 102.398 262.401L102.398 211.201C102.398 207.666 105.264 204.801 108.798 204.801H147.194C150.728 204.801 153.594 201.935 153.594 198.401L153.594 172.8C153.594 169.266 150.728 166.4 147.194 166.4H108.798C105.264 166.4 102.398 163.535 102.398 160L102.398 121.6C102.398 118.066 99.5331 115.2 95.9985 115.2H70.4C66.8654 115.2 64 118.066 64 121.6L64 160C64 163.535 61.1346 166.4 57.6 166.4H6.40001C2.86539 166.4 8.64312e-06 163.535 8.95213e-06 160L1.34282e-05 108.8C1.37372e-05 105.266 2.86539 102.4 6.40001 102.4H44.7953C48.3299 102.4 51.1953 99.535 51.1953 96.0004V70.4C51.1953 66.8654 48.33 64 44.7953 64H6.40002C2.8654 64 1.75952e-05 61.1346 1.79043e-05 57.6L2.23803e-05 6.4C2.26893e-05 2.86538 2.8654 -3.09007e-07 6.40002 0L57.6 4.47605e-06C61.1346 4.78505e-06 64 2.86538 64 6.4L64 44.8002C64 48.3348 66.8654 51.2002 70.4 51.2002L95.9985 51.2002C99.5331 51.2002 102.398 48.3348 102.398 44.8002L102.398 6.40001C102.398 2.86539 105.264 8.64295e-06 108.798 8.95196e-06L159.998 1.3428e-05C163.533 1.3737e-05 166.398 2.86539 166.398 6.40001V57.6C166.398 61.1346 163.533 64 159.998 64L121.595 64C118.061 64 115.195 66.8654 115.195 70.4V96.0004C115.195 99.535 118.061 102.4 121.595 102.4L159.998 102.4C163.533 102.4 166.398 105.266 166.398 108.8V147.201C166.398 150.735 169.264 153.601 172.798 153.601H198.397C201.932 153.601 204.797 150.735 204.797 147.201V108.8C204.797 105.266 207.662 102.4 211.197 102.4L262.397 102.4C265.932 102.4 268.797 105.266 268.797 108.8V160C268.797 163.535 265.932 166.4 262.397 166.4H223.994C220.459 166.4 217.594 169.266 217.594 172.8L217.594 198.401C217.594 201.935 220.459 204.801 223.994 204.801H262.397C265.932 204.801 268.797 207.666 268.797 211.201V262.401C268.797 265.935 265.932 268.801 262.397 268.801H211.197C207.662 268.801 204.797 265.935 204.797 262.401V224.001Z",
  "M4.47605e-06 211.201C4.78505e-06 207.666 2.86538 204.801 6.40001 204.801H57.6C61.1346 204.801 64 207.666 64 211.201L64 262.401C64 265.935 61.1346 268.801 57.6 268.801H6.4C2.86538 268.801 -3.09007e-07 265.935 0 262.401L4.47605e-06 211.201Z",
] as const;

function moduleMarkFragment(x: number, y: number, size: number): string {
  const s = size / 269;
  const gid = `mm-${x}-${y}`;
  const paths = MARK_PATHS.map((d) => `<path d="${d}" fill="url(#${gid})"/>`).join("\n    ");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs>
      <linearGradient id="${gid}" x1="134.398" y1="268.801" x2="134.398" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#E7E7E7"/>
        <stop offset="1" stop-color="#FFFFFF"/>
      </linearGradient>
    </defs>
    ${paths}
  </g>`;
}

/** Faint QR-module grid texture (echoes components/brand/backdrop.tsx's
 *  HeroBackdrop motif, redrawn at a fixed hex instead of currentColor) at
 *  the same quiet-texture ceiling documented in design-system.md (<=0.035
 *  opacity) — a barely-there brand cue, not decoration that competes with
 *  the headline. */
function gridTextureFragment(width: number, height: number): string {
  return `<defs>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <rect x="8" y="8" width="6" height="6" fill="${DARK_FOREGROUND}"/>
      <rect x="20" y="8" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.6"/>
      <rect x="8" y="20" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.6"/>
      <rect x="44" y="14" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.5"/>
      <rect x="68" y="8" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.7"/>
      <rect x="80" y="26" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.4"/>
      <rect x="32" y="38" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.55"/>
      <rect x="56" y="44" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.7"/>
      <rect x="14" y="56" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.5"/>
      <rect x="74" y="62" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.6"/>
      <rect x="38" y="74" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.45"/>
      <rect x="62" y="80" width="6" height="6" fill="${DARK_FOREGROUND}" opacity="0.55"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.035"/>`;
}

interface QrRender {
  /** Inner SVG content (paths only — the outer <svg> wrapper is stripped). */
  inner: string;
  /** Side length in module units, including the D6-mandated quiet zone. */
  sideLength: number;
}

/** Engine-rendered QR (real renderQr output, never a decorative stand-in)
 *  for the OG payload, using the precision kit's light-ink style — dark
 *  ink on a paper-white tile, D6's quiet zone baked into the engine's own
 *  coordinate space so any placement that doesn't crop the returned box
 *  respects it automatically. */
function renderOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

/** Same engine call as renderOgQr(), pointed at OG_PRICING_PAYLOAD — kept
 *  as its own function (rather than parameterizing renderOgQr) so the two
 *  call sites in main() stay independently obvious about which payload
 *  they render and verify. */
function renderPricingOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_PRICING_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

/** Same pattern again, pointed at OG_DYNAMIC_CODES_PAYLOAD (P9.5-T-F1). */
function renderDynamicCodesOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_DYNAMIC_CODES_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

/** Same pattern again, pointed at OG_ANALYTICS_PAYLOAD (P9.5-T-F1). */
function renderAnalyticsOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_ANALYTICS_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

/** Same pattern again, pointed at OG_BRAND_STUDIO_PAYLOAD (P9.5-T-F2). */
function renderBrandStudioOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_BRAND_STUDIO_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

/** Same pattern again, pointed at OG_ACCESS_CONTROLS_PAYLOAD (P9.5-T-F2). */
function renderAccessControlsOgQr(): QrRender {
  const { svg, sideLength } = renderQr({
    data: OG_ACCESS_CONTROLS_PAYLOAD,
    style: brandQrStyles.precision.light,
    quietZone: 4,
  });
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return { inner, sideLength };
}

function qrGroupFragment(qr: QrRender, x: number, y: number, boxSize: number): string {
  const scale = boxSize / qr.sideLength;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${qr.inner}</g>`;
}

// ---------------------------------------------------------------------
// Homepage OG (1200x630) — app/(marketing)/opengraph-image.png
// ---------------------------------------------------------------------

function buildHomepageOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  // Right column: paper tile + violet glow + QR.
  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  // Left column: wordmark row + two-line headline + mono sign-off.
  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">One code.</text>
    <text x="${leftX}" y="422" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">Every destination</text>

    <text x="${leftX}" y="478" font-family="Inter" font-weight="400" font-size="20" letter-spacing="3" fill="${DARK_MUTED_FOREGROUND}">your code never dies</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Pricing OG (1200x630) — app/(marketing)/pricing/opengraph-image.png (U3)
//
// Same canvas language as the homepage OG above (background, grid
// texture, wordmark row, right-column paper tile + glow + QR panel), but
// deliberately NOT extracted into a shared helper with
// buildHomepageOgSvg(): this script's outputs are meant to be
// deterministic, committed bytes (see the file header), and the
// self-verify step below only proves this function's own output decodes
// correctly. Keeping the two builders fully independent means editing
// this one can never accidentally perturb buildHomepageOgSvg()'s
// already-committed, byte-verified PNG.
// ---------------------------------------------------------------------

function buildPricingOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  // Zero literals (CLAUDE.md hard rule): both figures come straight from
  // PRICING (lib/entitlements.ts) — never hand-typed here.
  const priceLine = `$${PRICING.monthlyUsd}/mo · $${PRICING.annualUsd}/yr`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">Simple, honest</text>
    <text x="${leftX}" y="422" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">pricing.</text>

    <text x="${leftX}" y="480" font-family="Inter" font-weight="700" font-size="32" letter-spacing="0.2" fill="${WHITE_INK}">${priceLine}</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Legal OG (1200x630) — app/(marketing)/terms/opengraph-image.png AND
// app/(marketing)/privacy/opengraph-image.png (U4)
//
// One composition function, two output paths: terms and privacy are
// deliberately ONE generic legal variant, not two bespoke cards — same
// canvas language as the builders above (background, grid texture,
// wordmark row, right-column paper tile + glow + QR panel), reusing the
// homepage's own QR render (`qr`, OG_PAYLOAD) rather than minting a new
// payload, since the spec calls for these two pages to "share one
// design" with the homepage card. Kept independent of
// buildHomepageOgSvg()/buildPricingOgSvg() for the same reason those two
// are independent of each other: this script's outputs are committed,
// byte-verified PNGs, and editing this builder must never be able to
// perturb the other two.
// ---------------------------------------------------------------------

function buildLegalOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="60" letter-spacing="-1.2" fill="${DARK_FOREGROUND}">The fine print,</text>
    <text x="${leftX}" y="408" font-family="Inter" font-weight="700" font-size="60" letter-spacing="-1.2" fill="${DARK_FOREGROUND}">in plain language.</text>

    <text x="${leftX}" y="464" font-family="Inter" font-weight="400" font-size="20" letter-spacing="3" fill="${DARK_MUTED_FOREGROUND}">terms · privacy</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Dynamic-codes feature OG (1200x630) —
// app/(marketing)/features/dynamic-codes/opengraph-image.png (P9.5-T-F1)
//
// Same canvas language as the builders above; kept fully independent of
// them for the same reason buildPricingOgSvg() gave: this script's outputs
// are committed, byte-verified PNGs, and editing one builder must never be
// able to perturb another's already-verified bytes. Headline is the real
// H1 (deck-locked, verbatim), simply wrapped across two lines to fit the
// canvas — not a rewritten summary of it.
// ---------------------------------------------------------------------

function buildDynamicCodesOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">Repoint anything</text>
    <text x="${leftX}" y="416" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">you have printed.</text>

    <text x="${leftX}" y="472" font-family="Inter" font-weight="400" font-size="20" letter-spacing="1.5" fill="${DARK_MUTED_FOREGROUND}">302 + no-store, never 301</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Analytics feature OG (1200x630) —
// app/(marketing)/features/analytics/opengraph-image.png (P9.5-T-F1)
//
// Same canvas language and independence rationale as
// buildDynamicCodesOgSvg() above. Headline is the real H1 (deck-locked,
// verbatim), wrapped across two lines at its own natural comma break.
// ---------------------------------------------------------------------

function buildAnalyticsOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">Every scan,</text>
    <text x="${leftX}" y="416" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">counted honestly.</text>

    <text x="${leftX}" y="472" font-family="Inter" font-weight="400" font-size="20" letter-spacing="1.5" fill="${DARK_MUTED_FOREGROUND}">raw ips never stored</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Brand-studio feature OG (1200x630) —
// app/(marketing)/features/brand-studio/opengraph-image.png (P9.5-T-F2)
//
// Same canvas language and independence rationale as
// buildDynamicCodesOgSvg()/buildAnalyticsOgSvg() above. Headline is the
// real H1 (deck-locked, verbatim), wrapped across two lines at its own
// natural break.
// ---------------------------------------------------------------------

function buildBrandStudioOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">Design the code</text>
    <text x="${leftX}" y="416" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">itself.</text>

    <text x="${leftX}" y="472" font-family="Inter" font-weight="400" font-size="20" letter-spacing="1.5" fill="${DARK_MUTED_FOREGROUND}">instrument: live · engine: open source</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Access-controls feature OG (1200x630) —
// app/(marketing)/features/access-controls/opengraph-image.png (P9.5-T-F2)
//
// Same canvas language and independence rationale as the builders above.
// ---------------------------------------------------------------------

function buildAccessControlsOgSvg(qr: QrRender): string {
  const W = 1200;
  const H = 630;

  const tile = { x: 768, y: 135, w: 360, h: 360, rx: 28 };
  const tileCenterX = tile.x + tile.w / 2;
  const tileCenterY = tile.y + tile.h / 2;
  const qrBox = 272;
  const qrX = tile.x + (tile.w - qrBox) / 2;
  const qrY = tile.y + (tile.h - qrBox) / 2;

  const leftX = 88;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${DARK_BACKGROUND}"/>
    ${gridTextureFragment(W, H)}

    ${moduleMarkFragment(leftX, 146, 30)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">Decide who</text>
    <text x="${leftX}" y="416" font-family="Inter" font-weight="700" font-size="66" letter-spacing="-1.3" fill="${DARK_FOREGROUND}">gets through.</text>

    <text x="${leftX}" y="472" font-family="Inter" font-weight="400" font-size="20" letter-spacing="1.5" fill="${DARK_MUTED_FOREGROUND}">controls live on the address, not the print</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX - 120}" cy="${tileCenterY + 110}" rx="200" ry="160" fill="${AU_MAGENTA}" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="${tileCenterX + 130}" cy="${tileCenterY - 80}" rx="200" ry="160" fill="${AU_MINT}" opacity="0.28" filter="url(#glow)"/>

    <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="${tile.rx}" fill="${QR_PAPER}"/>
    ${qrGroupFragment(qr, qrX, qrY, qrBox)}
  </svg>`;
}

// ---------------------------------------------------------------------
// apple-icon.png (180x180) — app/apple-icon.png
// ---------------------------------------------------------------------

function buildAppleIconSvg(): string {
  const SIZE = 180;
  const MARK = 70; // ~39% of the canvas — generous padding, per spec
  const offset = (SIZE - MARK) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" fill="${DARK_BACKGROUND}"/>
    ${moduleMarkFragment(offset, offset, MARK)}
  </svg>`;
}

// ---------------------------------------------------------------------
// Self-verification — decode the QR region in isolation (the exact same
// renderQr() bytes embedded in the OG, rasterized on its own paper-white
// background) before anything is written to disk.
// ---------------------------------------------------------------------

function buildVerifySvg(qr: QrRender): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.sideLength} ${qr.sideLength}">
    <rect width="${qr.sideLength}" height="${qr.sideLength}" fill="${QR_PAPER}"/>
    ${qr.inner}
  </svg>`;
}

async function verifyQrDecodesTo(qr: QrRender, expected: string): Promise<string> {
  // Offline, deterministic: point zxing-wasm at the .wasm binary already
  // sitting inside the installed package instead of its default jsDelivr
  // CDN fetch, so this script (and CI) never depends on outbound network
  // access to render a correct, verifiable image.
  const wasmPath = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
  prepareZXingModule({
    overrides: { wasmBinary: readFileSync(wasmPath).buffer as ArrayBuffer },
  });

  const png = rasterize(buildVerifySvg(qr), 600);
  const results = await readBarcodes(new Blob([new Uint8Array(png)]), {
    formats: ["QRCode"],
    tryHarder: true,
  });

  if (results.length !== 1 || results[0].text !== expected) {
    const got = results.map((r) => r.text).join(", ") || "(no decode)";
    throw new Error(
      `QR self-verify failed: expected "${expected}", decoded [${got}]. Refusing to write brand images.`,
    );
  }
  return results[0].text;
}

// ---------------------------------------------------------------------

async function main() {
  const qr = renderOgQr();
  const decoded = await verifyQrDecodesTo(qr, OG_PAYLOAD);
  console.log(`[generate-brand-images] QR self-verify OK — decoded payload: "${decoded}"`);

  const pricingQr = renderPricingOgQr();
  const pricingDecoded = await verifyQrDecodesTo(pricingQr, OG_PRICING_PAYLOAD);
  console.log(
    `[generate-brand-images] QR self-verify OK — decoded payload: "${pricingDecoded}"`,
  );

  const dynamicCodesQr = renderDynamicCodesOgQr();
  const dynamicCodesDecoded = await verifyQrDecodesTo(dynamicCodesQr, OG_DYNAMIC_CODES_PAYLOAD);
  console.log(
    `[generate-brand-images] QR self-verify OK — decoded payload: "${dynamicCodesDecoded}"`,
  );

  const analyticsQr = renderAnalyticsOgQr();
  const analyticsDecoded = await verifyQrDecodesTo(analyticsQr, OG_ANALYTICS_PAYLOAD);
  console.log(
    `[generate-brand-images] QR self-verify OK — decoded payload: "${analyticsDecoded}"`,
  );

  const brandStudioQr = renderBrandStudioOgQr();
  const brandStudioDecoded = await verifyQrDecodesTo(brandStudioQr, OG_BRAND_STUDIO_PAYLOAD);
  console.log(
    `[generate-brand-images] QR self-verify OK — decoded payload: "${brandStudioDecoded}"`,
  );

  const accessControlsQr = renderAccessControlsOgQr();
  const accessControlsDecoded = await verifyQrDecodesTo(accessControlsQr, OG_ACCESS_CONTROLS_PAYLOAD);
  console.log(
    `[generate-brand-images] QR self-verify OK — decoded payload: "${accessControlsDecoded}"`,
  );

  const appleIconPng = rasterize(buildAppleIconSvg(), 180);
  const ogPng = rasterize(buildHomepageOgSvg(qr), 1200);
  const ogAlt =
    "QRCDN: one code, every destination. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const pricingOgPng = rasterize(buildPricingOgSvg(pricingQr), 1200);
  const pricingOgAlt = `QRCDN pricing: $${PRICING.monthlyUsd}/mo or $${PRICING.annualUsd}/yr. A styled QR code beside the QRCDN wordmark on a dark canvas.`;

  // Legal OG (U4) reuses `qr` — the homepage's already-verified OG_PAYLOAD
  // render — rather than issuing a third verifyQrDecodesTo() call: it is
  // the identical renderQr() output already proven above to decode to
  // OG_PAYLOAD, so a second decode of the same bytes would only re-prove
  // the same fact. The two output files are byte-identical by
  // construction (one rasterize() call, written twice); alt text differs
  // per route since it describes the PAGE, not the shared pixels.
  const legalOgPng = rasterize(buildLegalOgSvg(qr), 1200);
  const legalOgAltTerms =
    "QRCDN Terms of Service: the fine print, in plain language. A styled QR code beside the QRCDN wordmark on a dark canvas.";
  const legalOgAltPrivacy =
    "QRCDN Privacy Policy: the fine print, in plain language. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const dynamicCodesOgPng = rasterize(buildDynamicCodesOgSvg(dynamicCodesQr), 1200);
  const dynamicCodesOgAlt =
    "QRCDN dynamic codes: repoint anything you have printed. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const analyticsOgPng = rasterize(buildAnalyticsOgSvg(analyticsQr), 1200);
  const analyticsOgAlt =
    "QRCDN scan analytics: every scan, counted honestly. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const brandStudioOgPng = rasterize(buildBrandStudioOgSvg(brandStudioQr), 1200);
  const brandStudioOgAlt =
    "QRCDN brand studio: design the code itself. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const accessControlsOgPng = rasterize(buildAccessControlsOgSvg(accessControlsQr), 1200);
  const accessControlsOgAlt =
    "QRCDN access controls: decide who gets through. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const appleIconPath = join(WEB_ROOT, "app/apple-icon.png");
  const marketingDir = join(WEB_ROOT, "app/(marketing)");
  const ogPngPath = join(marketingDir, "opengraph-image.png");
  const ogAltPath = join(marketingDir, "opengraph-image.alt.txt");

  const pricingDir = join(marketingDir, "pricing");
  const pricingOgPngPath = join(pricingDir, "opengraph-image.png");
  const pricingOgAltPath = join(pricingDir, "opengraph-image.alt.txt");

  const termsDir = join(marketingDir, "terms");
  const termsOgPngPath = join(termsDir, "opengraph-image.png");
  const termsOgAltPath = join(termsDir, "opengraph-image.alt.txt");

  const privacyDir = join(marketingDir, "privacy");
  const privacyOgPngPath = join(privacyDir, "opengraph-image.png");
  const privacyOgAltPath = join(privacyDir, "opengraph-image.alt.txt");

  const featuresDir = join(marketingDir, "features");
  const dynamicCodesDir = join(featuresDir, "dynamic-codes");
  const dynamicCodesOgPngPath = join(dynamicCodesDir, "opengraph-image.png");
  const dynamicCodesOgAltPath = join(dynamicCodesDir, "opengraph-image.alt.txt");

  const analyticsDir = join(featuresDir, "analytics");
  const analyticsOgPngPath = join(analyticsDir, "opengraph-image.png");
  const analyticsOgAltPath = join(analyticsDir, "opengraph-image.alt.txt");

  const brandStudioDir = join(featuresDir, "brand-studio");
  const brandStudioOgPngPath = join(brandStudioDir, "opengraph-image.png");
  const brandStudioOgAltPath = join(brandStudioDir, "opengraph-image.alt.txt");

  const accessControlsDir = join(featuresDir, "access-controls");
  const accessControlsOgPngPath = join(accessControlsDir, "opengraph-image.png");
  const accessControlsOgAltPath = join(accessControlsDir, "opengraph-image.alt.txt");

  mkdirSync(marketingDir, { recursive: true });
  mkdirSync(pricingDir, { recursive: true });
  mkdirSync(termsDir, { recursive: true });
  mkdirSync(privacyDir, { recursive: true });
  mkdirSync(dynamicCodesDir, { recursive: true });
  mkdirSync(analyticsDir, { recursive: true });
  mkdirSync(brandStudioDir, { recursive: true });
  mkdirSync(accessControlsDir, { recursive: true });
  writeFileSync(appleIconPath, appleIconPng);
  writeFileSync(ogPngPath, ogPng);
  writeFileSync(ogAltPath, ogAlt);
  writeFileSync(pricingOgPngPath, pricingOgPng);
  writeFileSync(pricingOgAltPath, pricingOgAlt);
  writeFileSync(termsOgPngPath, legalOgPng);
  writeFileSync(termsOgAltPath, legalOgAltTerms);
  writeFileSync(privacyOgPngPath, legalOgPng);
  writeFileSync(privacyOgAltPath, legalOgAltPrivacy);
  writeFileSync(dynamicCodesOgPngPath, dynamicCodesOgPng);
  writeFileSync(dynamicCodesOgAltPath, dynamicCodesOgAlt);
  writeFileSync(analyticsOgPngPath, analyticsOgPng);
  writeFileSync(analyticsOgAltPath, analyticsOgAlt);
  writeFileSync(brandStudioOgPngPath, brandStudioOgPng);
  writeFileSync(brandStudioOgAltPath, brandStudioOgAlt);
  writeFileSync(accessControlsOgPngPath, accessControlsOgPng);
  writeFileSync(accessControlsOgAltPath, accessControlsOgAlt);

  console.log(`[generate-brand-images] wrote ${appleIconPath} (${appleIconPng.length} bytes)`);
  console.log(`[generate-brand-images] wrote ${ogPngPath} (${ogPng.length} bytes)`);
  console.log(`[generate-brand-images] wrote ${ogAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${pricingOgPngPath} (${pricingOgPng.length} bytes)`,
  );
  console.log(`[generate-brand-images] wrote ${pricingOgAltPath}`);
  console.log(`[generate-brand-images] wrote ${termsOgPngPath} (${legalOgPng.length} bytes)`);
  console.log(`[generate-brand-images] wrote ${termsOgAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${privacyOgPngPath} (${legalOgPng.length} bytes, byte-identical to ${termsOgPngPath})`,
  );
  console.log(`[generate-brand-images] wrote ${privacyOgAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${dynamicCodesOgPngPath} (${dynamicCodesOgPng.length} bytes)`,
  );
  console.log(`[generate-brand-images] wrote ${dynamicCodesOgAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${analyticsOgPngPath} (${analyticsOgPng.length} bytes)`,
  );
  console.log(`[generate-brand-images] wrote ${analyticsOgAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${brandStudioOgPngPath} (${brandStudioOgPng.length} bytes)`,
  );
  console.log(`[generate-brand-images] wrote ${brandStudioOgAltPath}`);
  console.log(
    `[generate-brand-images] wrote ${accessControlsOgPngPath} (${accessControlsOgPng.length} bytes)`,
  );
  console.log(`[generate-brand-images] wrote ${accessControlsOgAltPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
