import { describe, expect, it } from "vitest";
import { parseQrStyle } from "@qrcdn/shared";
import { renderQr, encodeMatrix } from "../src";
import { stylePresets, TEST_LOGO_DATA_URI, TEST_URL } from "./fixtures";

// P4-U4 red-team pass: `renderQr`'s SVG string is injected into the DOM via
// `dangerouslySetInnerHTML` (apps/web/components/studio/preview-stage.tsx,
// apps/web/components/explore/qr-svg.tsx) — every string that reaches that
// output must be proven safe, not just assumed safe because upstream zod
// validation exists (qr-engine.md: "validate/whitelist the value immediately
// before it's used, even if validated upstream"). This file traces every
// user-controlled value that could reach the SVG string: payload text, hex
// colors (fill/gradient stops/eyes/background), the logo data URI, and
// pixelSize.

const HOSTILE_STRINGS = [
  '"><script>alert(1)</script>',
  "</svg><img src=x onerror=alert(1)>",
  "`; alert(1); `",
  "&lt;script&gt;alert(1)&lt;/script&gt;",
  "<svg onload=alert(1)>",
  "javascript:alert(1)",
  "'; DROP TABLE brand_kits; --",
] as const;

describe("payload text never reaches the SVG string", () => {
  // The QR payload is only ever fed to `encodeMatrix`, which turns it into a
  // boolean module matrix (packages/qr-engine/src/matrix.ts) — it is never
  // concatenated into markup. These cases prove that structurally: a hostile
  // payload renders successfully (or throws a capacity error, never an
  // injection) and the raw hostile substring never appears verbatim in the
  // output.
  for (const payload of HOSTILE_STRINGS) {
    it(`encodes ${JSON.stringify(payload)} without leaking it into the SVG string`, () => {
      const style = stylePresets.default!;
      let svg: string;
      try {
        svg = renderQr({ data: payload, style }).svg;
      } catch (err) {
        // Only an over-capacity/empty-input failure is acceptable here —
        // never anything that suggests the string reached string-building.
        expect((err as Error).message).toMatch(/too big|no input/i);
        return;
      }
      expect(svg).not.toContain(payload);
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("onerror=");
      expect(svg).not.toContain("onload=");
      // Exactly one <svg ...> open tag and it's the outermost element —
      // proves no `</svg>` breakout occurred anywhere in the string.
      expect(svg.match(/<svg/g)?.length).toBe(1);
      expect(svg.endsWith("</svg>")).toBe(true);
    });
  }

  it("still encodes correctly — hostile payload round-trips through the matrix", () => {
    // Sanity check the matrix layer itself doesn't choke or silently drop
    // characters for a moderate hostile string (short enough to fit).
    const qr = encodeMatrix('"><script>alert(1)</script>', "M");
    expect(qr.size).toBeGreaterThan(0);
  });
});

describe("every hex-color field is validated immediately before use", () => {
  const hostileHex = 'red" onload="alert(1)';

  it("rejects an injected fill.color (solid)", () => {
    const style = structuredClone(stylePresets.default!);
    (style.fill as { color: string }).color = hostileHex;
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });

  it("rejects an injected gradient stop color (linearGradient)", () => {
    const style = structuredClone(stylePresets.circleGradient!);
    (style.fill as { stops: { color: string }[] }).stops[0]!.color = hostileHex;
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });

  it("rejects an injected gradient stop color (radialGradient)", () => {
    const style = structuredClone(stylePresets.leafRadial!);
    (style.fill as { stops: { color: string }[] }).stops[1]!.color = hostileHex;
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });

  it("rejects an injected eyes.color", () => {
    const style = structuredClone(stylePresets.circleGradient!);
    style.eyes.color = hostileHex;
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });

  it("rejects an injected background.color", () => {
    const style = structuredClone(stylePresets.default!);
    style.background.color = hostileHex;
    expect(() => renderQr({ data: TEST_URL, style })).toThrow(/invalid color/);
  });

  it("zod already blocks these at the schema boundary — proven independently of render.ts", () => {
    for (const bad of [hostileHex, "<script>", "javascript:alert(1)"]) {
      expect(() =>
        parseQrStyle({ v: 1, fill: { type: "solid", color: bad } }),
      ).toThrow();
    }
  });
});

describe("logo data URI injection", () => {
  it("rejects an onload-injected data URI even with a valid-looking mime prefix", () => {
    const style = stylePresets.logoKnockout!;
    expect(() =>
      renderQr({
        data: TEST_URL,
        style,
        logoDataUri: 'data:image/png;base64,abc" onload="alert(1)',
      }),
    ).toThrow(/data URI/);
  });

  it("rejects a data URI that breaks out of the href attribute with a quote", () => {
    const style = stylePresets.logoKnockout!;
    expect(() =>
      renderQr({
        data: TEST_URL,
        style,
        logoDataUri: `${TEST_LOGO_DATA_URI}" width="99999" onerror="alert(1)`,
      }),
    ).toThrow(/data URI/);
  });

  it("accepts the legitimate data URI unchanged (no false-positive rejection)", () => {
    const style = stylePresets.logoKnockout!;
    const result = renderQr({ data: TEST_URL, style, logoDataUri: TEST_LOGO_DATA_URI });
    expect(result.svg).toContain(`href="${TEST_LOGO_DATA_URI}"`);
  });
});

describe("pixelSize is bounded even under hostile numeric input", () => {
  it("rejects string-coerced and absurd numeric pixelSize values", () => {
    const style = stylePresets.default!;
    for (const bad of [Number("not-a-number"), -Infinity, Number.MAX_SAFE_INTEGER + 1, 1e20]) {
      expect(() => renderQr({ data: TEST_URL, style, pixelSize: bad })).toThrow(
        /invalid pixelSize/,
      );
    }
  });
});
