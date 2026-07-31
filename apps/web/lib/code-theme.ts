import type { ThemeRegistrationRaw } from "shiki";

/**
 * Shiki theme for `lib/highlight.ts` — foreground values are literal
 * `var(--code-*)` strings (globals.css's near-monochrome code palette,
 * P9.5-T1b), background transparent (the frame in `code-block.tsx`
 * supplies `bg-code-bg`, not this theme). This is UI chrome, never
 * qr-engine input, so CSS custom properties are fine here — the
 * sRGB-hex-only hard rule is about exported QR assets (CLAUDE.md).
 *
 * `lib/highlight.test.ts` snapshot-tests the emitted HTML against this
 * theme and records which path shipped: shiki's theme normalizer parses
 * `settings[].settings.foreground` as a real color in a few places
 * (default-foreground inference, the "is this a dark theme" heuristic),
 * and var() strings survived that intact when tested against the
 * installed shiki 3.23.0 — so this file is the var()-string theme
 * directly, not the sentinel-hex + `colorReplacements` fallback the
 * ascent spec called out as the contingency. If a future shiki upgrade
 * ever rejects/mangles var() again, that snapshot test is what will fail
 * first — swap this theme for hex sentinels and apply
 * `colorReplacements` at `codeToHtml` call time (shiki supports it
 * natively; see `applyColorReplacements` in `shiki/core`), not before.
 */
export const codeTheme: ThemeRegistrationRaw = {
  name: "qrcdn-code",
  type: "dark",
  fg: "var(--code-fg)",
  bg: "transparent",
  colors: {
    "editor.background": "transparent",
    "editor.foreground": "var(--code-fg)",
  },
  settings: [
    {
      // No `scope` — shiki's default/base color for anything not matched
      // by a more specific rule below.
      settings: { foreground: "var(--code-fg)" },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "keyword.other",
        "storage.type",
        "storage.modifier",
        "constant.language",
        "variable.language.this",
      ],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.template",
        "string.regexp",
        "string.unquoted",
        "punctuation.definition.string",
      ],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: ["constant.numeric", "constant.character", "constant.other"],
      settings: { foreground: "var(--code-number)" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: { foreground: "var(--code-function)" },
    },
    {
      scope: [
        "variable.other.property",
        "variable.other.object.property",
        "meta.object-literal.key",
        "support.type.property-name",
        "support.type.property-name.json",
        "entity.name.tag",
        "variable.parameter",
        "variable.other.readwrite",
        "variable.other.constant",
      ],
      settings: { foreground: "var(--code-property)" },
    },
    {
      scope: [
        "punctuation",
        "punctuation.separator",
        "punctuation.terminator",
        "punctuation.definition.block",
        "punctuation.definition.parameters",
        "punctuation.section.embedded",
        "punctuation.accessor",
        "meta.brace",
      ],
      settings: { foreground: "var(--code-punctuation)" },
    },
  ],
};
