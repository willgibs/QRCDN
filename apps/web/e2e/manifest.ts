import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The one channel global-setup.ts and global-teardown.ts share (P8-U1's
 * "manifest, not pattern-matching" guardrail — see global-setup.ts's header
 * for the full rationale). Deliberately outside the repo tree
 * (`RUNNER_TEMP` on GitHub Actions runners, `os.tmpdir()` locally) so it can
 * never be accidentally committed and never collides with a repo-relative
 * path across worktrees/parallel runs on the same runner.
 *
 * P9-U6: no longer carries a magic-link token. A token minted once here
 * and reused across a serial-group retry is a single-use credential that's
 * already dead by attempt 2 — see e2e/auth-token.ts's `mintSignInToken` for
 * the fix (mint fresh, at test time, per sign-in attempt). `email` below is
 * all a sign-in step needs from this file now.
 */
export interface E2eFixtureManifest {
  /** The exact `auth.users.id` teardown deletes — and ONLY this id. */
  userId: string;
  email: string;
  createdAt: string;
}

export function manifestPath(): string {
  return join(process.env.RUNNER_TEMP ?? tmpdir(), "qrcdn-e2e-fixture.json");
}
