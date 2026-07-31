import { describe, expect, it } from "vitest";
import { highlight } from "./highlight";

/**
 * Snapshot proof for the ascent spec's open question (P9.5-T1b): does
 * shiki's theme normalizer accept literal `var(--code-*)` strings as
 * foreground colors, or does it reject/mangle them, requiring the
 * sentinel-hex + `colorReplacements` fallback? Verified empirically
 * (throwaway script against the installed shiki 3.23.0, since deleted) —
 * the direct var()-string theme (`lib/code-theme.ts`) works as-is. These
 * assertions are what would catch a regression if a future shiki upgrade
 * ever changes that: every emitted color declaration must be a
 * `var(--code-*)` reference, never a literal hex/rgb/oklch value.
 *
 * Runs under vitest, which has no reason to know about Next's
 * "react-server" resolution condition — `server-only` (highlight.ts's
 * first import) throws outside it, aliased to a no-op stub in
 * vitest.config.ts so this file (and highlight.ts's real, unmodified
 * source) can run here at all.
 */
describe("highlight", () => {
  it("bash: every token color is a var(--code-*) reference, background transparent", async () => {
    const html = await highlight(
      'curl https://www.qrcdn.com/api/v1/codes \\\n  -H "Authorization: Bearer qrcdn_live_xxx"',
      "bash",
    );
    expect(html).toContain("background-color:transparent");
    expect(html).toMatch(/style="color:var\(--code-[a-z-]+\)"/);
    expect(html).toMatchSnapshot();
  });

  it("jsonc: every token color is a var(--code-*) reference", async () => {
    const html = await highlight(
      '{\n  "slug": "8K2QRX",\n  "scanCount": 142,\n  "expiresAt": null\n}',
      "jsonc",
    );
    expect(html).toMatch(/style="color:var\(--code-[a-z-]+\)"/);
    expect(html).toMatchSnapshot();
  });

  it("typescript: every token color is a var(--code-*) reference", async () => {
    const html = await highlight(
      'export async function f(x: number): Promise<void> {\n  const n = 42;\n}',
      "typescript",
    );
    expect(html).toMatch(/style="color:var\(--code-[a-z-]+\)"/);
    expect(html).toMatchSnapshot();
  });

  it("never emits a literal color — every color: declaration is a --code-* var", async () => {
    const html = await highlight('const x = 1; // comment\nconst s = "str";', "typescript");
    // (?<![-a-z])color: excludes "background-color:" — only the token
    // spans' own `color:` declarations, not the root <pre>'s background.
    const colorDeclarations = [...html.matchAll(/(?<![-a-z])color:([^;"]+)/g)].map((m) => m[1]);
    expect(colorDeclarations.length).toBeGreaterThan(0);
    for (const declaration of colorDeclarations) {
      expect(declaration).toMatch(/^var\(--code-[a-z-]+\)$/);
    }
  });
});
