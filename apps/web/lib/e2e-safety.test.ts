import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLUG_CHARSET } from "./slug";

/**
 * Static guard for the P8-U1 e2e suite's own safety guarantees. Modeled on
 * lib/use-server-contract.test.ts's file-scanning style — that guard exists
 * because nothing else could catch the P7.5 bundled-action outage; this one
 * exists because nothing else can catch e2e/global-setup.ts accidentally
 * pointing PRODUCTION Supabase writes/deletes at something other than its
 * own throwaway fixture. Deliberately OUTSIDE e2e/ (vitest.config.ts
 * excludes `e2e/**` entirely — that directory is Playwright specs, not
 * vitest tests) so `pnpm --filter web test` still runs this file every time.
 *
 * Two allowlist-shaped properties (never a denylist naming a real address or
 * a real row — a denylist only catches leaks someone thought to name in
 * advance):
 *
 * 1. Every email-shaped string literal under e2e/ is either the exact
 *    fixture shape global-setup.ts produces (`e2e-<uuid>@e2e.qrcdn.test`) or
 *    the template expression that produces one at runtime
 *    (`` e2e-${...}@e2e.qrcdn.test ``) — never any other address.
 * 2. No hardcoded uuid- or slug-shaped string literal exists anywhere under
 *    e2e/ — every id/slug this suite touches must come from a runtime call
 *    (`randomUUID()`, a value captured from the rendered page, a value
 *    returned by the Supabase admin API), never a literal that could point
 *    at a pre-existing production row by construction or by typo.
 *
 * Scope: quoted-string and template-literal CONTENTS only (via TOKEN_RE
 * below) — never comments, never regex literals, never
 * bare identifiers/property names. A regex literal such as
 * `/^HTTPS:\/\/QRCDN\.COM\/[A-Z2-9]{7}$/` (used elsewhere in this suite to
 * PARSE the app's own already-rendered uppercase output) is never a value
 * sent anywhere, so it can't "target" a row the way a hardcoded argument
 * could — scanning regex literals would only add false positives (their own
 * character classes look "slug-shaped" by construction). A bare identifier
 * like `process.env.RUNNER_TEMP` is a property access, not a literal value,
 * so it's out of scope the same way.
 */

const E2E_DIR = join(import.meta.dirname, "..", "e2e");
const SKIP_DIRS = new Set(["node_modules", ".git"]);

function collectTsFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
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

// One tokenizer, five alternatives, tried in order at every position: a
// line comment, a block comment (JSDoc included — `/**` still starts with
// `/*`), or a "/'/` -delimited literal. Comments have to be matched (and
// then discarded) as their OWN token rather than simply not-matched: this
// file's own doc comments above are full of backtick-quoted inline code
// (`` `randomUUID()` ``, `` `e2e-<uuid>@e2e.qrcdn.test` ``) — without a
// comment alternative consuming the whole comment in one bite, a stray
// backtick inside one would be misread as the START of a template literal,
// pulling in everything up to the NEXT backtick (which could be deep inside
// unrelated code) as if it were a string's contents. Not a full JS parser
// (deliberately — e2e/'s source is plain, unminified TypeScript with no
// exotic escaping), but sufficient to correctly tell "comment" from
// "string" apart, which a delimiter-only regex cannot do.
const TOKEN_RE =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

function literalContentsIn(source: string): string[] {
  const contents: string[] = [];
  for (const match of source.matchAll(TOKEN_RE)) {
    const token = match[0];
    if (token.startsWith("//") || token.startsWith("/*")) continue; // comment — discard
    contents.push(token.slice(1, -1)); // strip the outer quote/backtick
  }
  return contents;
}

// Requires a local-part-ish character directly adjacent to "@" (letters,
// digits, or the punctuation an email local-part or a `${...}` interpolation
// tail can end with — `)` covers `${randomUUID()}@...`) — a bare domain
// suffix like "@e2e.qrcdn.test" used on its own (e.g. as a matching suffix
// constant, or mentioned in a log-message sentence: "..., @e2e.qrcdn.test)")
// is not itself a targetable address and must NOT be flagged as one.
function isEmailShaped(text: string): boolean {
  return /[A-Za-z0-9._%+\-${}()]@[^@\s]*\./.test(text);
}

// The exact fixture shape global-setup.ts produces at runtime.
const ALLOWED_LITERAL_EMAIL = /^e2e-[0-9a-f-]+@e2e\.qrcdn\.test$/;
// The template EXPRESSION that produces one — `${...}` may wrap any
// expression (this repo only ever writes `${randomUUID()}`), matched
// generically rather than hard-coded to that one call.
const ALLOWED_EMAIL_TEMPLATE = /^e2e-\$\{[^}]+\}@e2e\.qrcdn\.test$/;

const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;
// Mirrors lib/slug.ts's SLUG_CHARSET by import, not by copy, so this can
// never silently drift from the real charset. Real slugs are always
// upper-only (generateSlug/validateVanitySlug both normalize to uppercase),
// and the lookaround below requires the run to be its own isolated token
// (not merely a substring of a longer SCREAMING_SNAKE_CASE identifier, e.g.
// "NEXT" inside the wholly-unrelated literal "NEXT_PUBLIC_SUPABASE_URL" —
// an env var name, not a slug, but "NEXT" alone would otherwise match the
// charset run naively).
const SLUG_LOOKING_RE = new RegExp(`(?<![A-Za-z0-9_])[${SLUG_CHARSET}]{4,30}(?![A-Za-z0-9_])`);

const e2eFiles = collectTsFiles(E2E_DIR);

describe("e2e/ fixture-safety guardrails (static scan)", () => {
  it("finds the e2e/ files it is supposed to be guarding", () => {
    // If this drops to zero the suite below would vacuously pass forever.
    expect(e2eFiles.length).toBeGreaterThan(0);
  });

  it.each(e2eFiles.map((f) => [f.slice(E2E_DIR.length + 1), f] as const))(
    "%s: every email-shaped literal is an e2e.qrcdn.test fixture address",
    (_label, file) => {
      const offenders = literalContentsIn(readFileSync(file, "utf8")).filter(
        (text) =>
          isEmailShaped(text) && !ALLOWED_LITERAL_EMAIL.test(text) && !ALLOWED_EMAIL_TEMPLATE.test(text),
      );
      expect(offenders).toEqual([]);
    },
  );

  it.each(e2eFiles.map((f) => [f.slice(E2E_DIR.length + 1), f] as const))(
    "%s: no hardcoded uuid- or slug-shaped literal",
    (_label, file) => {
      const contents = literalContentsIn(readFileSync(file, "utf8"));
      const uuidOffenders = contents.filter((text) => UUID_RE.test(text));
      const slugOffenders = contents.filter((text) => SLUG_LOOKING_RE.test(text));
      expect({ uuidOffenders, slugOffenders }).toEqual({ uuidOffenders: [], slugOffenders: [] });
    },
  );
});
