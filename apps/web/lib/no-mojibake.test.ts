import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Standing regression guard against mojibake in shipped source (P9.7-U2).
 *
 * WHY THIS EXISTS: the P9.7-U2 filmstrip caption shipped into review reading
 * "one code, three moments Β· no reprints, ever" — a Greek capital beta
 * (U+0392) glued to the middle dot. The intended character was a plain
 * middle dot (U+00B7, which this codebase uses correctly in dozens of mono
 * strips); it acquired the beta somewhere in a copy path between an HTML
 * design artifact and a `.tsx` file. Nothing caught it: it is valid UTF-8,
 * valid TypeScript, valid JSX, and renders without error. Lint, typecheck,
 * unit tests, the production build and all 67 marketing e2e tests were
 * green with it in place. It was found by looking at a screenshot.
 *
 * That is the whole argument for this file. A corrupted glyph in customer-
 * facing copy is exactly the class of defect that survives every automated
 * gate we have and then reads as carelessness to the one person who
 * notices it.
 *
 * WHAT THIS COVERS: every `.ts`/`.tsx` file under `app/`, `components/` and
 * `lib/`, excluding test files, scanned for an explicit list of known
 * mojibake digraphs. Deliberately an allowlist of specific sequences rather
 * than a "suspicious character range" heuristic: the codebase legitimately
 * contains `·`, `→`, `≤`, `×` and accented names, and a range check would
 * either flag those or need so many carve-outs it would stop being
 * trustworthy. Comments are NOT stripped (unlike the em-dash guard, where
 * internal prose is explicitly allowed to differ from shipped copy) —
 * mojibake in a comment is still corruption, and there is no case where we
 * want one.
 *
 * WHAT THIS MISSES: any corruption whose byte pattern is not in the list
 * below. It catches the double-encoding families that actually occur
 * (UTF-8 read as Latin-1 or as a Greek codepage, and the Unicode
 * replacement character); it cannot catch, say, a Cyrillic "а" substituted
 * for a Latin "a". Extend the list when a new one is found rather than
 * broadening it into a heuristic.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, "..");
const TREES = ["app", "components", "lib"];

/** Known mojibake sequences, each with the corruption it represents. */
const MOJIBAKE: ReadonlyArray<{ seq: string; note: string }> = [
  { seq: "Β·", note: "Β· — middle dot that picked up a Greek capital beta (the P9.7-U2 incident)" },
  { seq: "Â·", note: "Â· — U+00B7 encoded as UTF-8 then read as Latin-1" },
  { seq: "Â ", note: "Â  — non-breaking space double-encoded" },
  { seq: "â", note: "â€ — the smart-quote / en-dash / em-dash double-encoding family" },
  { seq: "Ã", note: "ÃƒÂ — doubly double-encoded Latin-1" },
  { seq: "ï¿½", note: "ï¿½ — replacement character, itself double-encoded" },
  { seq: "�", note: "� — Unicode replacement character, a decode already failed" },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = extname(full);
    if (ext !== ".ts" && ext !== ".tsx") continue;
    if (/\.(test|spec)\.tsx?$/.test(full)) continue;
    out.push(full);
  }
  return out;
}

describe("no mojibake in shipped source", () => {
  it("finds no known double-encoding artifact in app/, components/ or lib/", () => {
    const offenders: string[] = [];

    for (const tree of TREES) {
      for (const file of walk(join(WEB_ROOT, tree))) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          for (const { seq, note } of MOJIBAKE) {
            if (line.includes(seq)) {
              offenders.push(`${relative(WEB_ROOT, file)}:${i + 1} — ${note}\n    ${line.trim()}`);
            }
          }
        });
      }
    }

    expect(offenders, `Mojibake found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
