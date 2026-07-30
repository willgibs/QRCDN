import { defineConfig, configDefaults } from "vitest/config";

// Repo's first vitest config (P8-U1). Needed the moment Playwright specs
// landed under e2e/: vitest's own default include glob
// (`**/*.{test,spec}.?(c|m)[jt]s?(x)`, vitest/dist/chunks/defaults.*.js)
// matches `*.spec.ts` too, so without an explicit exclusion vitest would
// try to collect e2e/money-path.spec.ts as a unit test and hard-fail (no
// Playwright `test`/`expect` globals exist under vitest, and the file
// depends on a live browser + globalSetup/globalTeardown vitest never runs).
//
// `configDefaults.exclude` (`["**/node_modules/**", "**/.git/**"]`) is
// spread in rather than hand-copied so this stays correct if vitest's own
// defaults ever change. apps/web/lib/e2e-safety.test.ts stays covered — it
// lives outside e2e/ specifically so this exclusion never touches it.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
