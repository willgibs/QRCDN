import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The one channel global-setup.ts and global-teardown.ts share (P8-U1's
 * "manifest, not pattern-matching" guardrail — see global-setup.ts's header
 * for the full rationale). Deliberately outside the repo tree
 * (`RUNNER_TEMP` on GitHub Actions runners, `os.tmpdir()` locally) so it can
 * never be accidentally committed and never collides with a repo-relative
 * path across worktrees/parallel runs on the same runner.
 */
export interface E2eFixtureManifest {
  /** The exact `auth.users.id` teardown deletes — and ONLY this id. */
  userId: string;
  email: string;
  /** `generateLink`'s `data.properties.hashed_token` — the spec exchanges
   *  this for a session by navigating to
   *  `/auth/confirm?token_hash=<hashedToken>&type=magiclink&next=/studio`. */
  hashedToken: string;
  createdAt: string;
}

export function manifestPath(): string {
  return join(process.env.RUNNER_TEMP ?? tmpdir(), "qrcdn-e2e-fixture.json");
}
