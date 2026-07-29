import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for a production outage class that every other gate misses.
 *
 * A `"use server"` module's export list becomes a runtime server-action
 * registry, and the bundler emits a runtime binding for EVERY exported name —
 * including names TypeScript erases. So `export type { QrCode }` in such a file
 * ships a `ReferenceError: QrCode is not defined` that 500s every server-action
 * POST to the owning route.
 *
 * That exact bug shipped in P7-U2 (b6f18fe) and survived to production because
 * nothing else can see it: `tsc --noEmit` is happy (the types are valid),
 * `next build` is happy (bundling succeeds), and the unit suites are happy
 * (they call the underlying cores directly, never the bundled action module).
 * It only exists in the built server chunk at runtime. Found by live
 * red-teaming the Studio in a real browser.
 *
 * A runtime test can't catch it either — importing a `"use server"` file under
 * vitest erases the type exports correctly, so the bug is invisible there. The
 * check therefore has to be on the SOURCE text.
 *
 * Rule enforced: a `"use server"` file may export async functions only. No
 * `export type`, no `export interface`, no bare `export { ... }` re-exports.
 * Types belong in the module that defines them (e.g. lib/codes-core.ts) and
 * should be imported from there with `import type`.
 */

const APP_ROOT = join(import.meta.dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist"]);

function collectTsFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectTsFiles(full, found);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

function isUseServerModule(source: string): boolean {
  // The directive must be the first statement; a mention inside a comment or
  // deeper in the file doesn't make it a server module.
  const firstCode = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*"));
  return firstCode === '"use server";' || firstCode === "'use server';";
}

const useServerFiles = collectTsFiles(APP_ROOT).filter((file) =>
  isUseServerModule(readFileSync(file, "utf8")),
);

describe('"use server" modules export async functions only', () => {
  it("finds the server-action modules it is supposed to be guarding", () => {
    // If this drops to zero the suite would vacuously pass forever.
    expect(useServerFiles.length).toBeGreaterThan(0);
  });

  it.each(useServerFiles.map((f) => [f.slice(APP_ROOT.length + 1), f] as const))(
    "%s exports no types and no bare re-exports",
    (_label, file) => {
      const offenders = readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(
          ({ line }) =>
            line.startsWith("export type ") ||
            line.startsWith("export type{") ||
            line.startsWith("export interface ") ||
            /^export\s*\{/.test(line),
        )
        .map(({ line, n }) => `${n}: ${line}`);

      expect(offenders).toEqual([]);
    },
  );
});
