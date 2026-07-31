import "server-only";

import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import jsonc from "shiki/langs/jsonc.mjs";
import typescript from "shiki/langs/typescript.mjs";
import { codeTheme } from "./code-theme";

/**
 * Server-only shiki highlighting (P9.5-T1b). `import "server-only"` is the
 * first line so a stray client import fails the build loudly instead of
 * quietly shipping shiki's grammars/engine to the browser — verify with
 * `pnpm --filter web build` + grep `.next/static` for a shiki chunk (there
 * should be none; every `CodeBlock` usage is a server component).
 *
 * `createHighlighterCore` + `createJavaScriptRegexEngine` (`shiki/core` +
 * `shiki/engine/javascript`) — pure-JS regex engine, not the default
 * oniguruma/wasm one: no `.wasm` asset to load or bundle, the right
 * tradeoff for a handful of grammars used server-side only (the wasm
 * engine exists for perf at a scale this marketing docs page never
 * approaches). Grammars are imported individually
 * (`shiki/langs/<name>.mjs`), not the `shiki/langs` barrel, which pulls in
 * every language shiki bundles. The `.mjs` extension is required, not
 * stylistic — shiki's package.json exports these languages through a
 * wildcard (`"./*": "./dist/*"`), which only matches a specifier against
 * the exact on-disk filename, extension included; the extensionless form
 * (`shiki/langs/bash`) 404s under plain Node ESM resolution (verified
 * directly — this is exactly the kind of version-specific packaging
 * detail worth confirming rather than assuming).
 *
 * One highlighter for the whole server process: `highlighterPromise` is a
 * module-level promise, created once — Next's module cache guarantees
 * this file's top-level code runs once per server instance, not once per
 * request — and every `highlight()` call awaits the same instance.
 */
export type CodeLang = "bash" | "jsonc" | "typescript";

const highlighterPromise = createHighlighterCore({
  themes: [codeTheme],
  langs: [bash, jsonc, typescript],
  engine: createJavaScriptRegexEngine(),
});

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, { lang, theme: "qrcdn-code" });
}
