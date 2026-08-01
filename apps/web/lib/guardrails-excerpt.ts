import "server-only";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build-time source excerpt for section 09 ("Built in the open," P9.5-T3c):
 * reads packages/qr-engine/src/guardrails.ts directly off disk and slices
 * out its real threshold-constants block, verbatim — never a hand-typed
 * literal that could silently drift from the actual source. `import
 * "server-only"` fails the build loudly if this module is ever reached from
 * a client component (it does Node `fs` I/O, which has no browser
 * equivalent).
 *
 * The read happens at render time on the server, same as `lib/highlight.ts`
 * — since `/` has zero dynamic APIs (no cookies/headers/searchParams
 * reliance), Next statically prerenders the page at `next build` time, so
 * this only ever executes once per build, never per request.
 *
 * Path resolution is relative to THIS file's own on-disk location
 * (`fileURLToPath(import.meta.url)`), not `process.cwd()` — robust
 * regardless of how `next build` gets invoked (root `pnpm build`'s `pnpm -r
 * build` fan-out, `pnpm --filter web build`, or Vercel's own build
 * command): every one of those still runs with this file at the same
 * relative position inside the checked-out repo, apps/web/lib/../../../ =
 * the repo root.
 */
const GUARDRAILS_SRC_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "packages",
  "qr-engine",
  "src",
  "guardrails.ts",
);

// Content anchors, not a line-number range — an unrelated edit elsewhere in
// guardrails.ts can never silently shift what this excerpt shows. If either
// anchor goes missing (the real source's shape changed), this throws at
// build time instead of rendering a stale or empty excerpt.
const START_MARKER = "/**\n * Empirical decode limits";
const END_MARKER = "export const CONTRAST_WARN_MIN = 4;";

export function readGuardrailsExcerpt(): string {
  const source = readFileSync(GUARDRAILS_SRC_PATH, "utf-8");
  const start = source.indexOf(START_MARKER);
  const endMarkerIndex = source.indexOf(END_MARKER);
  if (start === -1 || endMarkerIndex === -1) {
    throw new Error(
      `readGuardrailsExcerpt: expected markers not found in ${GUARDRAILS_SRC_PATH} — the source shape changed; update START_MARKER/END_MARKER in lib/guardrails-excerpt.ts`,
    );
  }
  return source.slice(start, endMarkerIndex + END_MARKER.length);
}
