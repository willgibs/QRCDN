import { existsSync } from "node:fs";
import { join } from "node:path";

// Relative imports only in e2e/ (no "@/" — no tsconfig-paths configured
// under any test runner in this repo; apps/web/tsconfig.json's `paths` only
// resolves for `tsc`/Next's own bundler, confirmed against the existing
// app/(app)/api-keys/actions.ts precedent).

/**
 * Loads apps/web/.env.local into `process.env` for the Playwright
 * test-runner process itself (playwright.config.ts, global-setup.ts,
 * global-teardown.ts) — unlike the `next start` child process the
 * `webServer` block spawns, which loads its own env via Next's built-in
 * `@next/env` machinery, this process has no env-file loading of its own.
 *
 * Uses Node's built-in `process.loadEnvFile` (stable on Node >=20.12, this
 * repo targets 22) rather than adding a `dotenv` dependency. Empirically
 * verified (not assumed) that it never overwrites a variable already
 * present in `process.env`:
 *
 *   $ FOO=from_shell node -e "process.loadEnvFile('.env.local'); ..."
 *   FOO=from_shell   // pre-set value wins
 *   BAR=from_file    // filled in from the file
 *
 * That match's Next's own precedence (system env beats .env files), which
 * is exactly what CI needs: the workflow sets `SUPABASE_SECRET_KEY` as a
 * real job-level env var from the `E2E_SUPABASE_SECRET_KEY` secret, and
 * `.env.local` there is only `cp`'d from `.env.example` (whose
 * `SUPABASE_SECRET_KEY` line is intentionally blank) — the real secret must
 * win, never get clobbered by the blank placeholder.
 *
 * A missing `.env.local` (shouldn't happen — CI copies `.env.example` there
 * before this ever runs, and local dev already has one per this unit's
 * brief) is a silent no-op rather than a thrown error: whatever's already in
 * `process.env` is used as-is, and the actual "is this var set" check
 * happens where each var is consumed (see `requireEnv` below), with a
 * message that says what's actually missing instead of an opaque ENOENT.
 *
 * `__dirname`, not `import.meta.dirname`: apps/web/package.json has no
 * `"type": "module"`, so Playwright's own config/test loader compiles this
 * file (and every file it imports) to CommonJS — confirmed empirically,
 * not assumed: `import.meta.dirname` here throws "SyntaxError: Cannot use
 * 'import.meta' outside a module" the moment `playwright test` tries to
 * load the config. lib/use-server-contract.test.ts's `import.meta.dirname`
 * precedent is a vitest file, not a Playwright one — Vite always loads
 * source as ESM internally regardless of package.json's `"type"`, which is
 * why that pattern works there but not here.
 */
export function loadE2eEnv(): void {
  const envLocalPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envLocalPath)) return;
  process.loadEnvFile(envLocalPath);
}

/** Reads a required env var, throwing a clear, actionable error (not a bare
 *  `undefined` crash somewhere downstream) when it's missing or blank. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[e2e] missing required env var ${name} — check apps/web/.env.local locally, or the workflow's env: block in CI.`,
    );
  }
  return value;
}

// Not 3000 — never collide with a developer's own `next dev`/`next start`
// running locally while this suite is also running. Single-sourced here
// (rather than duplicated between playwright.config.ts and money-path.spec.ts)
// because money-path.spec.ts creates its own page manually
// (`browser.newPage()`, not the built-in `page` fixture — see its own header
// comment for why) and so must build absolute URLs itself rather than
// relying on `use.baseURL` auto-applying.
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
