import { describe, expect, it } from "vitest";
import { parseQrStyle } from "@qrcdn/shared";
import { renderQr, encodeMatrix, effectiveEcc } from "../src";
import { stylePresets, TEST_LOGO_DATA_URI, TEST_URL } from "./fixtures";

describe("renderQr", () => {
  it("is deterministic — identical bytes across calls", () => {
    for (const style of Object.values(stylePresets)) {
      const a = renderQr({ data: TEST_URL, style, logoDataUri: style.logo ? TEST_LOGO_DATA_URI : undefined });
      const b = renderQr({ data: TEST_URL, style, logoDataUri: style.logo ? TEST_LOGO_DATA_URI : undefined });
      expect(a.svg).toBe(b.svg);
    }
  });

  it("matches golden snapshots per preset", () => {
    for (const [name, style] of Object.entries(stylePresets)) {
      const result = renderQr({
        data: TEST_URL,
        style,
        logoDataUri: style.logo ? TEST_LOGO_DATA_URI : undefined,
      });
      expect(result.svg).toMatchSnapshot(name);
    }
  });

  it("encodes the uppercase short URL densely (version ≤ 3)", () => {
    const qr = encodeMatrix(TEST_URL, "Q");
    expect(qr.version).toBeLessThanOrEqual(3);
  });

  it("keeps the worst-case dynamic payload at version ≤ 3 at ECC H (P9.8-B3 slug cap)", () => {
    // HTTPS://QRCDN.COM/ (18 chars) + a 17-char slug = 35 chars, exactly the
    // v3-H alphanumeric capacity. This is the EMPIRICAL basis for the
    // 17-character vanity-slug cap: with every dynamic payload bounded to
    // v3, the studio instrument can evaluate a kit against this worst case
    // and a passing kit is proven for every dynamic code ever minted from
    // it, API included. The boundary half proves the cap is exact, not
    // conservative: one more slug character must exceed v3. If either
    // assertion ever moves (encoder change, capacity table change), the cap
    // number's math changed underneath us — re-derive before trusting.
    const base = "HTTPS://QRCDN.COM/";
    expect(encodeMatrix(base + "W".repeat(17), "H").version).toBeLessThanOrEqual(3);
    expect(encodeMatrix(base + "W".repeat(18), "H").version).toBeGreaterThan(3);
  });

  it("forces ECC H and version ≥ 3 when logo knockout is on", () => {
    const style = stylePresets.logoKnockout!;
    expect(effectiveEcc(style)).toBe("H");
    const result = renderQr({ data: TEST_URL, style, logoDataUri: TEST_LOGO_DATA_URI });
    expect(result.ecc).toBe("H");
    expect(result.version).toBeGreaterThanOrEqual(3);
  });

  it("includes quiet zone in the viewBox", () => {
    const result = renderQr({ data: TEST_URL, style: stylePresets.default! });
    expect(result.sideLength).toBe(result.moduleCount + 8);
    expect(result.svg).toContain(`viewBox="0 0 ${result.sideLength} ${result.sideLength}"`);
  });

  it("omits background rect when transparent", () => {
    const style = parseQrStyle({ v: 1, background: { transparent: true } });
    const result = renderQr({ data: TEST_URL, style });
    expect(result.svg).not.toContain("#ffffff");
  });

  it("rejects non-data-URI logos (no external fetches, no injection)", () => {
    const style = stylePresets.logoKnockout!;
    expect(() =>
      renderQr({ data: TEST_URL, style, logoDataUri: "https://evil.example/x.png" }),
    ).toThrow(/data URI/);
    expect(() =>
      renderQr({
        data: TEST_URL,
        style,
        logoDataUri: 'data:image/svg+xml;base64,abc" onload="alert(1)',
      }),
    ).toThrow(/data URI/);
  });

  it("rejects non-finite or out-of-range pixelSize", () => {
    const style = stylePresets.default!;
    for (const bad of [NaN, Infinity, -1, 0, 1e9]) {
      expect(() => renderQr({ data: TEST_URL, style, pixelSize: bad })).toThrow(
        /invalid pixelSize/,
      );
    }
    expect(renderQr({ data: TEST_URL, style, pixelSize: 512.4 }).svg).toContain(
      'width="512"',
    );
  });

  it("rejects malformed colors defensively at render time", () => {
    const style = structuredClone(stylePresets.default!);
    (style.fill as { color: string }).color = 'red" onload="x';
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });
});
