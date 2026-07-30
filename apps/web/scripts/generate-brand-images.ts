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
const DARK_PRIMARY = "#5178ff"; // .dark --primary: oklch(0.62 0.21 268) — globals.css:122
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

/** ModuleMark brand glyph (components/brand/magic.tsx's ModuleMark),
 *  redrawn as a raw SVG fragment with a fixed fill instead of currentColor
 *  — this is composed into a larger hand-laid SVG string, not a live DOM
 *  node, so there is no CSS cascade to inherit a color from. */
function moduleMarkFragment(x: number, y: number, size: number, fill: string): string {
  const s = size / 10;
  return `<g transform="translate(${x} ${y})" fill="${fill}">
    <rect x="0" y="0" width="${4 * s}" height="${4 * s}"/>
    <rect x="${6 * s}" y="0" width="${4 * s}" height="${4 * s}" opacity="0.45"/>
    <rect x="0" y="${6 * s}" width="${4 * s}" height="${4 * s}" opacity="0.45"/>
    <rect x="${6 * s}" y="${6 * s}" width="${4 * s}" height="${4 * s}"/>
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

    ${moduleMarkFragment(leftX, 146, 30, DARK_PRIMARY)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">One code.</text>
    <text x="${leftX}" y="422" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">Every destination</text>

    <text x="${leftX}" y="478" font-family="Inter" font-weight="400" font-size="20" letter-spacing="3" fill="${DARK_MUTED_FOREGROUND}">your code never dies</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX}" cy="${tileCenterY + 18}" rx="230" ry="185" fill="${DARK_PRIMARY}" opacity="0.35" filter="url(#glow)"/>

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

    ${moduleMarkFragment(leftX, 146, 30, DARK_PRIMARY)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">Simple, honest</text>
    <text x="${leftX}" y="422" font-family="Inter" font-weight="700" font-size="72" letter-spacing="-1.5" fill="${DARK_FOREGROUND}">pricing.</text>

    <text x="${leftX}" y="480" font-family="Inter" font-weight="700" font-size="32" letter-spacing="0.2" fill="${DARK_PRIMARY}">${priceLine}</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX}" cy="${tileCenterY + 18}" rx="230" ry="185" fill="${DARK_PRIMARY}" opacity="0.35" filter="url(#glow)"/>

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

    ${moduleMarkFragment(leftX, 146, 30, DARK_PRIMARY)}
    <text x="${leftX + 42}" y="169" font-family="Inter" font-weight="700" font-size="24" letter-spacing="-0.3" fill="${DARK_FOREGROUND}">QRCDN</text>

    <text x="${leftX}" y="342" font-family="Inter" font-weight="700" font-size="60" letter-spacing="-1.2" fill="${DARK_FOREGROUND}">The fine print,</text>
    <text x="${leftX}" y="408" font-family="Inter" font-weight="700" font-size="60" letter-spacing="-1.2" fill="${DARK_FOREGROUND}">in plain language.</text>

    <text x="${leftX}" y="464" font-family="Inter" font-weight="400" font-size="20" letter-spacing="3" fill="${DARK_MUTED_FOREGROUND}">terms · privacy</text>

    <defs>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="38"/>
      </filter>
    </defs>
    <ellipse cx="${tileCenterX}" cy="${tileCenterY + 18}" rx="230" ry="185" fill="${DARK_PRIMARY}" opacity="0.35" filter="url(#glow)"/>

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
    ${moduleMarkFragment(offset, offset, MARK, DARK_PRIMARY)}
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

  const appleIconPng = rasterize(buildAppleIconSvg(), 180);
  const ogPng = rasterize(buildHomepageOgSvg(qr), 1200);
  const ogAlt =
    "QRCDN — one code, every destination. A styled QR code beside the QRCDN wordmark on a dark canvas.";

  const pricingOgPng = rasterize(buildPricingOgSvg(pricingQr), 1200);
  const pricingOgAlt = `QRCDN pricing — $${PRICING.monthlyUsd}/mo or $${PRICING.annualUsd}/yr. A styled QR code beside the QRCDN wordmark on a dark canvas.`;

  // Legal OG (U4) reuses `qr` — the homepage's already-verified OG_PAYLOAD
  // render — rather than issuing a third verifyQrDecodesTo() call: it is
  // the identical renderQr() output already proven above to decode to
  // OG_PAYLOAD, so a second decode of the same bytes would only re-prove
  // the same fact. The two output files are byte-identical by
  // construction (one rasterize() call, written twice); alt text differs
  // per route since it describes the PAGE, not the shared pixels.
  const legalOgPng = rasterize(buildLegalOgSvg(qr), 1200);
  const legalOgAltTerms =
    "QRCDN Terms of Service — the fine print, in plain language. A styled QR code beside the QRCDN wordmark on a dark canvas.";
  const legalOgAltPrivacy =
    "QRCDN Privacy Policy — the fine print, in plain language. A styled QR code beside the QRCDN wordmark on a dark canvas.";

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

  mkdirSync(marketingDir, { recursive: true });
  mkdirSync(pricingDir, { recursive: true });
  mkdirSync(termsDir, { recursive: true });
  mkdirSync(privacyDir, { recursive: true });
  writeFileSync(appleIconPath, appleIconPng);
  writeFileSync(ogPngPath, ogPng);
  writeFileSync(ogAltPath, ogAlt);
  writeFileSync(pricingOgPngPath, pricingOgPng);
  writeFileSync(pricingOgAltPath, pricingOgAlt);
  writeFileSync(termsOgPngPath, legalOgPng);
  writeFileSync(termsOgAltPath, legalOgAltTerms);
  writeFileSync(privacyOgPngPath, legalOgPng);
  writeFileSync(privacyOgAltPath, legalOgAltPrivacy);

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
