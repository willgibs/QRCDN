import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Standing regression guard for the board's no-em-dash rule (P9.5-T7).
 * `docs/guides/design-system.md`: "No em dashes, anywhere in customer-facing
 * copy" — checked by hand at review time until now, which is exactly how a
 * real, shipped violation (`app/p/[slug]/unlock-form.tsx`'s three error
 * strings, fixed this same unit) went unnoticed: the rule was enforced on
 * marketing (`components/marketing/`) but never swept across the product or
 * the public scan-facing pages.
 *
 * WHAT THIS COVERS: every `.ts`/`.tsx` file under `app/`, `components/`,
 * and `lib/` (this package's three customer-facing-or-adjacent trees),
 * excluding `*.test.ts(x)`/`*.spec.ts(x)` files themselves, checked for the
 * em-dash character (—, U+2014) OUTSIDE comments. "Outside comments" is a
 * best-effort strip, not a real parser: block comments (`/* ... *\/`,
 * including JSDoc) are removed first, replaced with an equal number of
 * newlines so line numbers stay accurate for the failure message; then each
 * remaining line has any `//` line comment stripped from the first `//`
 * that is preceded by start-of-line or whitespace onward (this specific
 * condition, not a bare `.indexOf("//")`, is what keeps `"https://..."` and
 * `"http://..."` string literals intact — that `//` is preceded by `:`, not
 * whitespace). What's left is scanned for a literal `—`.
 *
 * WHAT THIS MISSES, honestly:
 *  - It is not a JS/TS parser. An em-dash inside a string literal that
 *    itself contains something shaped like `// ` (e.g. `"see docs // here
 *    — right?"`) could be truncated away by the line-comment strip before
 *    the check ever sees it — a false negative. No such string exists in
 *    this codebase today (grep-verified at the time this test was written);
 *    if one is ever added, this test cannot be relied on to catch an
 *    em-dash inside it.
 *  - It does not distinguish "genuinely customer-facing" from "internal,
 *    never-rendered" strings within the audited trees — e.g. a thrown
 *    `Error` message for a build-time invariant that a real visitor could
 *    never see. `EXEMPT_FILES` below is the explicit, reasoned allowlist
 *    for that handful of cases, so the boundary stays auditable instead of
 *    silently baked into the walk logic.
 *  - It does not cover `e2e/` (test code, not shipped copy), `scripts/`
 *    (build tooling), other workspace packages (`workers/redirect`,
 *    `packages/*` — out of this unit's scope, which the spec framed as "the
 *    product and the public scan-facing pages" inside `apps/web`), or
 *    doc/markdown prose anywhere (the board rule is about rendered copy,
 *    not internal notes — `docs/guides/design-system.md`'s own wording).
 *
 * This is the "narrower deterministic check, documented" fallback the T7
 * spec explicitly sanctions over a silently-incomplete "fully precise"
 * lint: it will not catch every conceivable em-dash, but it will catch the
 * shape every real violation found this unit actually had (a literal `—`
 * sitting in a plain string or JSX text node), and it fails loudly rather
 * than passing everything.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDITED_DIRS = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;
const EM_DASH = "—";

/**
 * Exact, reasoned exceptions — not a pattern, so adding one always requires
 * a conscious decision and a comment, never an accidental broad match.
 */
const EXEMPT_FILES = new Set<string>([
  // P9.10-D6.1 emptied this. Its one entry, lib/guardrails-excerpt.ts,
  // retired with the source excerpt section 11 used to render; the
  // replacement (lib/open-source.ts) simply avoids em dashes in its thrown
  // strings rather than asking for an exemption. Keep it empty if you can:
  // an exemption should always cost a conscious decision and a comment.
]);

function stripComments(source: string): string {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    const newlineCount = match.split("\n").length - 1;
    return "\n".repeat(newlineCount);
  });
  return withoutBlockComments
    .split("\n")
    .map((line) => line.replace(/(^|\s)\/\/.*$/, ""))
    .join("\n");
}

function collectSourceFiles(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (SOURCE_EXTENSIONS.has(extname(entry)) && !TEST_FILE_RE.test(entry)) {
      out.push(full);
    }
  }
}

interface Violation {
  file: string;
  line: number;
  text: string;
}

function findEmDashViolations(): Violation[] {
  const files: string[] = [];
  for (const dir of AUDITED_DIRS) {
    collectSourceFiles(join(ROOT, dir), files);
  }

  const violations: Violation[] = [];
  for (const file of files) {
    const relPath = relative(ROOT, file);
    if (EXEMPT_FILES.has(relPath)) continue;

    const source = readFileSync(file, "utf8");
    const stripped = stripComments(source);
    const strippedLines = stripped.split("\n");
    const originalLines = source.split("\n");

    for (let i = 0; i < strippedLines.length; i++) {
      if (strippedLines[i].includes(EM_DASH)) {
        violations.push({ file: relPath, line: i + 1, text: originalLines[i].trim() });
      }
    }
  }
  return violations;
}

describe("no em dash in customer-facing source", () => {
  it("finds zero em-dash characters outside comments in app/, components/, lib/", () => {
    const violations = findEmDashViolations();
    if (violations.length > 0) {
      const report = violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join("\n");
      throw new Error(
        `Found ${violations.length} em-dash character(s) in customer-facing source ` +
          `(the board's standing no-em-dash rule — see this file's own header for what ` +
          `this check covers and what it misses):\n${report}`,
      );
    }
    expect(violations).toEqual([]);
  });

  // A canary for the check itself: if this ever reports zero files walked,
  // the walker is broken (wrong root, directories renamed, etc.) and the
  // test above would be silently vacuous — passing not because the codebase
  // is clean but because it never looked. Mirrors the "do NOT ship a check
  // that silently passes everything" instruction this test was built under.
  it("actually walked a non-trivial number of source files", () => {
    const files: string[] = [];
    for (const dir of AUDITED_DIRS) {
      collectSourceFiles(join(ROOT, dir), files);
    }
    expect(files.length).toBeGreaterThan(100);
  });
});
