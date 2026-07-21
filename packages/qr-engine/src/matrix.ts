import QRCode from "qrcode";

export type EccLevel = "L" | "M" | "Q" | "H";

export interface EncodedQr {
  /** module count per side (no quiet zone) */
  size: number;
  /** QR version 1–40 */
  version: number;
  ecc: EccLevel;
  /** row-major module map; index [y * size + x], 1 = dark */
  modules: Uint8Array;
}

export function isDark(qr: EncodedQr, x: number, y: number): boolean {
  return qr.modules[y * qr.size + x] === 1;
}

/**
 * Encode data into a QR module matrix. The renderer is engine-agnostic: this
 * adapter is the only place that touches the `qrcode` library, so the matrix
 * engine stays swappable (e.g. vendored Nayuki qrcodegen) without touching
 * render code.
 */
export function encodeMatrix(
  data: string,
  ecc: EccLevel,
  opts: { minVersion?: number } = {},
): EncodedQr {
  let created = QRCode.create(data, { errorCorrectionLevel: ecc });
  if (opts.minVersion && created.version < opts.minVersion) {
    created = QRCode.create(data, {
      errorCorrectionLevel: ecc,
      version: opts.minVersion,
    });
  }
  const size = created.modules.size;
  const src = created.modules.data;
  const modules = new Uint8Array(size * size);
  for (let i = 0; i < modules.length; i++) modules[i] = src[i] ? 1 : 0;
  return { size, version: created.version, ecc, modules };
}
