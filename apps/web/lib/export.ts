// SVG/PNG export helpers for the Studio (P4-U3). `slugifyPayload` and
// `exportFilename` are pure and colocated-tested (export.test.ts).
// `rasterizeSvgToPng` and `downloadBlob` are browser-only (Image, canvas,
// object URLs) and are exercised manually — there's no jsdom/canvas polyfill
// in this repo, and adding one just to cover a thin DOM wrapper isn't
// worth a new dependency (agent-playbook: call out new deps, don't add
// them silently — so we're not adding one here at all).

const FILENAME_SNIPPET_MAX = 32;

/** Turns a QR payload into a filesystem-safe, lowercase, hyphenated snippet
 *  for export filenames — e.g. "HTTPS://QRCDN.COM/PREVIEW" becomes
 *  "https-qrcdn-com-preview". Never empty (falls back to "qr-code"). */
export function slugifyPayload(payload: string): string {
  const slug = payload
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FILENAME_SNIPPET_MAX)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "qr-code";
}

export function exportFilename(payload: string, ext: "svg" | "png"): string {
  return `qrcdn-${slugifyPayload(payload)}.${ext}`;
}

/** Triggers a browser download of `blob` named `filename` via a transient
 *  object URL, revoked immediately after the click is dispatched. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Rasterizes a deterministic `renderQr` SVG string to a PNG Blob at an exact
 * pixel size, client-side (Image → canvas → toBlob). The SVG's colors are
 * already sRGB hex (the engine never emits anything else — CLAUDE.md hard
 * rule), so no color-space conversion happens here.
 */
export function rasterizeSvgToPng(svg: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas_context_unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("rasterize_failed"));
        }
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg_load_failed"));
    };
    img.src = url;
  });
}
