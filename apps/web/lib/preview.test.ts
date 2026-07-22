import { describe, expect, it } from "vitest";
import { defaultQrStyle, parseQrStyle } from "@qrcdn/shared";
import { PREVIEW_PAYLOAD_DEFAULT, renderPreview } from "./preview";

describe("renderPreview", () => {
  it("renders the requested payload with no error when it fits", () => {
    const result = renderPreview("HTTPS://QRCDN.COM/K7M2X9A", defaultQrStyle);
    expect(result.error).toBeNull();
    expect(result.svg).toContain("<svg");
    expect(result.version).toBeGreaterThanOrEqual(1);
  });

  // P4-U4 red-team: before this wrapper existed, studio-shell.tsx swallowed
  // this exact failure and silently rendered an unrelated placeholder QR
  // with no error state — the scannability chip kept saying "Scannable" for
  // a code that never encoded what the user typed.
  it("falls back to the placeholder with a friendly error for a payload past QR capacity", () => {
    const result = renderPreview("a".repeat(5000), defaultQrStyle);
    expect(result.error).toMatch(/too long/i);
    expect(result.svg).toContain("<svg");
    // No honest version to report for a placeholder render of an unrelated
    // payload — see PreviewRenderResult's doc comment.
    expect(result.version).toBeNull();
  });

  it("never throws for a 3KB payload (documented hostile-input case)", () => {
    expect(() => renderPreview("a".repeat(3000), defaultQrStyle)).not.toThrow();
  });

  it("renders cleanly for unicode, RTL, and newline payloads", () => {
    for (const data of [
      "hello 🎉🚀 world 你好 مرحبا",
      "line1\nline2\r\nline3",
      "abc\x00def",
    ]) {
      const result = renderPreview(data, defaultQrStyle);
      expect(result.error).toBeNull();
    }
  });

  it("still renders the placeholder for the default preview payload itself", () => {
    const result = renderPreview(PREVIEW_PAYLOAD_DEFAULT, defaultQrStyle);
    expect(result.error).toBeNull();
  });

  it("surfaces a generic error (not a raw stack) for an unexpected failure", () => {
    // A style that passed our own re-validation upstream should never reach
    // this path malformed, but the wrapper must still degrade gracefully
    // rather than leak an internal error message verbatim.
    const style = parseQrStyle({ v: 1 });
    const result = renderPreview("HTTPS://QRCDN.COM/OK", style);
    expect(result.error).toBeNull();
  });
});
