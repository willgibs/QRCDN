import "server-only";

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build-time path verification for section 11 (P9.10-D6.1).
 *
 * The section's three cards link into real directories in the public repo,
 * and the whole point of that section is that a visitor can go and check.
 * A card pointing at a moved or renamed package would be a 404 delivered by
 * the one place on the site promising verifiability, so the paths are
 * asserted against disk when the page is built rather than trusted.
 *
 * `import "server-only"` fails the build loudly if this is ever reached from
 * a client component. Paths resolve from this file's own location rather
 * than `process.cwd()`, so they hold however `next build` is invoked (root
 * fan-out, `--filter web`, or Vercel's own command).
 *
 * No em dashes in the thrown strings: `lib/no-em-dash.test.ts` scans this
 * directory, and an exemption entry is a cost worth avoiding for punctuation
 * nobody reads.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function assertRepoPaths(dirs: readonly string[]): void {
  for (const dir of dirs) {
    if (!existsSync(join(REPO_ROOT, dir))) {
      throw new Error(
        `assertRepoPaths: ${dir} is not on disk, so section 11 would ship a link into a 404. ` +
          `Update the CARDS list in components/marketing/open-source-section.tsx.`,
      );
    }
  }
}
