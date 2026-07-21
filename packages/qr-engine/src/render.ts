import type { QrStyle } from "@qrcdn/shared";
import { encodeMatrix, isDark, type EncodedQr } from "./matrix";
import { eyeRegions, inAnyEye } from "./geometry";
import {
  dotPath,
  eyeFramePath,
  eyePupilPath,
  fmt,
  rectPath,
} from "./paths";
import { effectiveEcc, logoFloorVersion } from "./guardrails";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
// svg+xml deliberately excluded: nested SVG inside <image> is script-inert in
// browsers, but the app layer rasterizes uploaded logos anyway (D6) and
// excluding it here is free defense-in-depth for standalone-opened exports.
const DATA_URI_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export const DEFAULT_QUIET_ZONE = 4;
const MAX_PIXEL_SIZE = 16384;

export interface RenderRequest {
  data: string;
  style: QrStyle;
  /**
   * Resolved logo image as a base64 data URI. The engine never fetches;
   * callers resolve `style.logo.assetId` themselves (browser and server use
   * the same path, keeping output bytes identical).
   */
  logoDataUri?: string;
  /** width/height attributes in px; omitted = scales to container */
  pixelSize?: number;
  /** quiet zone in modules; D6 floor is 4 — lower values are for internal previews only */
  quietZone?: number;
}

export interface RenderResult {
  svg: string;
  /** module count per side, without quiet zone */
  moduleCount: number;
  version: number;
  ecc: EncodedQr["ecc"];
  /** total side length in module units, including quiet zone */
  sideLength: number;
}

function assertHex(color: string): string {
  if (!HEX_RE.test(color)) throw new Error(`invalid color: ${color}`);
  return color;
}

interface LogoBox {
  x: number;
  y: number;
  size: number;
}

function logoBox(style: QrStyle, qrSize: number, quiet: number): LogoBox | null {
  if (!style.logo) return null;
  const size = style.logo.sizeRatio * qrSize;
  const offset = quiet + (qrSize - size) / 2;
  return { x: offset, y: offset, size };
}

function isKnockedOut(
  style: QrStyle,
  box: LogoBox | null,
  quiet: number,
  x: number,
  y: number,
): boolean {
  if (!style.logo?.knockout || !box) return false;
  const pad = style.logo.padding;
  const cx = quiet + x + 0.5;
  const cy = quiet + y + 0.5;
  if (style.logo.shape === "circle") {
    const r = box.size / 2 + pad;
    const dx = cx - (box.x + box.size / 2);
    const dy = cy - (box.y + box.size / 2);
    return dx * dx + dy * dy <= r * r;
  }
  return (
    cx >= box.x - pad &&
    cx <= box.x + box.size + pad &&
    cy >= box.y - pad &&
    cy <= box.y + box.size + pad
  );
}

function gradientDef(style: QrStyle, id: string): string {
  const fill = style.fill;
  if (fill.type === "solid") return "";
  const stops = fill.stops
    .map(
      (s) =>
        `<stop offset="${fmt(s.offset)}" stop-color="${assertHex(s.color)}"/>`,
    )
    .join("");
  if (fill.type === "radialGradient") {
    return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">${stops}</radialGradient>`;
  }
  // Quantize the direction vector to integer thousandths BEFORE formatting:
  // ECMA-262 doesn't pin transcendental results, and a raw cos/sin double
  // sitting within an ulp of a toFixed boundary would produce different bytes
  // per JS engine, breaking the identical-bytes contract (D4).
  const dxq = Math.round(Math.cos(fill.rotation) * 500);
  const dyq = Math.round(Math.sin(fill.rotation) * 500);
  const attrs = [
    `x1="${fmt((500 - dxq) / 1000)}"`,
    `y1="${fmt((500 - dyq) / 1000)}"`,
    `x2="${fmt((500 + dxq) / 1000)}"`,
    `y2="${fmt((500 + dyq) / 1000)}"`,
  ].join(" ");
  return `<linearGradient id="${id}" ${attrs}>${stops}</linearGradient>`;
}

/**
 * Render a styled QR code as a deterministic SVG string. Pure function of its
 * inputs: no DOM, no Node APIs, no randomness — browser previews and server
 * exports produce identical bytes.
 */
export function renderQr(req: RenderRequest): RenderResult {
  const { data, style } = req;
  const quiet = req.quietZone ?? DEFAULT_QUIET_ZONE;
  const ecc = effectiveEcc(style);
  let pixelSize: number | undefined;
  if (req.pixelSize !== undefined) {
    if (
      !Number.isFinite(req.pixelSize) ||
      req.pixelSize < 1 ||
      req.pixelSize > MAX_PIXEL_SIZE
    ) {
      throw new Error(`invalid pixelSize: ${req.pixelSize}`);
    }
    pixelSize = Math.round(req.pixelSize);
  }

  const qr = encodeMatrix(data, ecc, {
    minVersion: style.logo?.knockout
      ? logoFloorVersion(style.logo)
      : undefined,
  });
  const size = qr.size;
  const side = size + quiet * 2;

  const fillIsGradient = style.fill.type !== "solid";
  const gradientId = "qrfg";
  const fgPaint = fillIsGradient
    ? `url(#${gradientId})`
    : assertHex(style.fill.type === "solid" ? style.fill.color : "#000000");
  const eyePaint = style.eyes.color ? assertHex(style.eyes.color) : fgPaint;

  const box = logoBox(style, size, quiet);

  // Data modules — one path. Eyes are skipped (drawn as dedicated shapes);
  // knocked-out modules under the logo are skipped entirely.
  let dots = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isDark(qr, x, y)) continue;
      if (inAnyEye(size, x, y)) continue;
      if (isKnockedOut(style, box, quiet, x, y)) continue;
      dots += dotPath(style.dots.style, quiet + x, quiet + y, style.dots.sizeRatio);
    }
  }

  let eyes = "";
  for (const eye of eyeRegions(size)) {
    const ex = quiet + eye.x;
    const ey = quiet + eye.y;
    eyes += eyeFramePath(style.eyes.frame, ex, ey, eye.corner);
    eyes += eyePupilPath(style.eyes.pupil, ex, ey);
  }

  let logoImage = "";
  if (box && req.logoDataUri) {
    if (!DATA_URI_RE.test(req.logoDataUri)) {
      throw new Error("logoDataUri must be a base64 image data URI");
    }
    logoImage = `<image href="${req.logoDataUri}" x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.size)}" height="${fmt(box.size)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const defs = gradientDef(style, gradientId);
  const background = style.background.transparent
    ? ""
    : `<path d="${rectPath(0, 0, side, side)}" fill="${assertHex(style.background.color)}"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"` +
    (pixelSize ? ` width="${pixelSize}" height="${pixelSize}"` : "") +
    ">" +
    (defs ? `<defs>${defs}</defs>` : "") +
    background +
    `<path d="${dots}" fill="${fgPaint}"/>` +
    `<path d="${eyes}" fill="${eyePaint}" fill-rule="evenodd"/>` +
    logoImage +
    "</svg>";

  return {
    svg,
    moduleCount: size,
    version: qr.version,
    ecc: qr.ecc,
    sideLength: side,
  };
}
