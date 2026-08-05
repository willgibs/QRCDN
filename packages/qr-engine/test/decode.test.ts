import { describe, expect, it } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { readBarcodes } from "zxing-wasm/reader";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { renderQr } from "../src";
import type { EccLevel } from "../src";
import { stylePresets, TEST_LOGO_DATA_URI, TEST_URL } from "./fixtures";

// The "branded codes actually scan" regression net (D6): every style preset,
// across ECC levels and slug lengths, must decode back to its exact payload
// after rasterization.

async function decodeSvg(svg: string): Promise<string[]> {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 512 } })
    .render()
    .asPng();
  const results = await readBarcodes(new Blob([new Uint8Array(png)]), {
    formats: ["QRCode"],
    tryHarder: true,
  });
  return results.map((r) => r.text);
}

async function expectRoundTrip(data: string, style: QrStyle) {
  const result = renderQr({
    data,
    style,
    logoDataUri: style.logo ? TEST_LOGO_DATA_URI : undefined,
  });
  const texts = await decodeSvg(result.svg);
  expect(texts, `decode failed for payload "${data}"`).toContain(data);
}

describe("decode round-trip", () => {
  for (const [name, style] of Object.entries(stylePresets)) {
    it(`preset "${name}" decodes to its payload`, async () => {
      await expectRoundTrip(TEST_URL, style);
    });
  }

  it("decodes across all ECC levels", async () => {
    for (const ecc of ["L", "M", "Q", "H"] as EccLevel[]) {
      await expectRoundTrip(TEST_URL, parseQrStyle({ v: 1, ecc }));
    }
  });

  it("decodes short and long payloads", async () => {
    const payloads = [
      "HTTPS://QRCDN.COM/A2CD",
      TEST_URL,
      "https://example.com/some/long/path?utm_source=poster&utm_campaign=summer-2026-launch&ref=abcdef123456",
    ];
    for (const payload of payloads) {
      await expectRoundTrip(payload, stylePresets.roundedInk!);
    }
  });

  it("decodes the worst-case dynamic payload at the slug cap (P9.8-B3): 18+17 chars, ECC H, default style", async () => {
    // HTTPS://QRCDN.COM/ (18 chars) + a 17-char slug = 35 chars — the exact
    // boundary render.test.ts's "keeps the worst-case dynamic payload at
    // version ≤ 3" test pins at the encode level (v3-H alphanumeric
    // capacity, docs/DECISIONS.md's D12 amendment is the derivation). That
    // test proves the payload ENCODES; this one proves it also DECODES
    // after rasterization, at the engine's default style with ECC forced
    // to H — the actual worst case a brand kit must survive for every
    // dynamic code it will ever mint.
    const worstCasePayload = "HTTPS://QRCDN.COM/" + "W".repeat(17);
    await expectRoundTrip(worstCasePayload, parseQrStyle({ v: 1, ecc: "H" }));
  });

  it("decodes every eye frame/pupil combination", async () => {
    const frames = ["square", "rounded", "circle", "leaf"] as const;
    const pupils = ["square", "rounded", "circle", "dot"] as const;
    for (const frame of frames) {
      for (const pupil of pupils) {
        const style = parseQrStyle({
          v: 1,
          eyes: { frame, pupil, color: null },
        });
        await expectRoundTrip(TEST_URL, style);
      }
    }
  }, 30000);

  it("decodes with logo knockout at the guardrail-clean max (0.34 + pad 1)", async () => {
    const style = parseQrStyle({
      v: 1,
      logo: {
        assetId: "t",
        sizeRatio: 0.34,
        padding: 1,
        knockout: true,
        shape: "auto",
      },
    });
    await expectRoundTrip(TEST_URL, style);
  });

  it("decodes at max ratio with no padding (0.40 + pad 0)", async () => {
    const style = parseQrStyle({
      v: 1,
      logo: {
        assetId: "t",
        sizeRatio: 0.4,
        padding: 0,
        knockout: true,
        shape: "auto",
      },
    });
    await expectRoundTrip(TEST_URL, style);
  });

  // Regressions from the adversarial stress campaign (2026-07-21):

  it("v3-floor escape: 0.28 + pad 2 must climb to v5 and decode", async () => {
    const style = parseQrStyle({
      v: 1,
      logo: { assetId: "t", sizeRatio: 0.28, padding: 2, knockout: true, shape: "auto" },
    });
    const result = renderQr({ data: TEST_URL, style, logoDataUri: TEST_LOGO_DATA_URI });
    expect(result.version).toBeGreaterThanOrEqual(5);
    await expectRoundTrip(TEST_URL, style);
  });

  it("ECC Q exemption honors padding: small logo keeps Q and decodes", async () => {
    const style = parseQrStyle({
      v: 1,
      ecc: "Q",
      logo: { assetId: "t", sizeRatio: 0.24, padding: 1, knockout: true, shape: "auto" },
    });
    const result = renderQr({ data: TEST_URL, style, logoDataUri: TEST_LOGO_DATA_URI });
    expect(result.ecc).toBe("Q");
    await expectRoundTrip(TEST_URL, style);
  });

  it("ECC Q exemption denies padded logos over 10% effective area", async () => {
    const style = parseQrStyle({
      v: 1,
      ecc: "Q",
      logo: { assetId: "t", sizeRatio: 0.3, padding: 1, knockout: true, shape: "auto" },
    });
    const result = renderQr({ data: TEST_URL, style, logoDataUri: TEST_LOGO_DATA_URI });
    expect(result.ecc).toBe("H");
    await expectRoundTrip(TEST_URL, style);
  });

  it("leaf eyes decode on dense symbols with small dots (v7 @ 512px)", async () => {
    const style = parseQrStyle({
      v: 1,
      ecc: "H",
      dots: { style: "circle", sizeRatio: 0.4 },
      eyes: { frame: "leaf", pupil: "rounded", color: null },
    });
    const longUrl = "https://example.com/campaigns/summer/landing?src=poster-a1";
    await expectRoundTrip(longUrl, style);
  });

  it("decodes minimum dot size at every dot style", async () => {
    for (const dotStyle of ["square", "rounded", "circle"] as const) {
      const style = parseQrStyle({
        v: 1,
        dots: { style: dotStyle, sizeRatio: 0.4 },
        ecc: "H",
      });
      await expectRoundTrip(TEST_URL, style);
    }
  });
});
