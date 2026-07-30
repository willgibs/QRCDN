import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, loadE2eEnv } from "./e2e/env";

// Populates process.env from apps/web/.env.local for THIS process (the
// Playwright test runner: this config, global-setup.ts, global-teardown.ts)
// before anything below reads process.env.* — see e2e/env.ts's header for
// why this is needed at all and why it's safe under CI (system/job-level env
// vars always win over whatever .env.local carries for the same key).
loadE2eEnv();

export default defineConfig({
  testDir: "./e2e",

  // The money path is one continuous, stateful, serial flow against REAL
  // production Supabase (one throwaway fixture user; see
  // global-setup.ts) — never parallelized, never sharded. `workers: 1` +
  // `fullyParallel: false` both say the same thing at different levels
  // (process-wide vs. per-file) so there's no ambiguity if a second spec
  // file is ever added here.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: "list",

  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  // Build is a SEPARATE CI step (`pnpm --filter web build`, before this
  // suite runs) — this only ever starts an already-built app, never builds
  // one itself. Port 3100 (not 3000) so this never collides with a
  // developer's own `next dev`/`next start` running locally on 3000 while
  // this suite is also running. `next start` loads apps/web/.env.local
  // itself (Next's own @next/env machinery, independent of the loadE2eEnv()
  // call above, which is only for this Node process) — nothing further to
  // wire through here.
  webServer: {
    command: `next start -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
