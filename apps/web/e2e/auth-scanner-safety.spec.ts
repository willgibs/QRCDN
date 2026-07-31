import { readFile } from "node:fs/promises";
import { test, expect } from "./fixtures";
import { mintSignInToken } from "./auth-token";
import { manifestPath, type E2eFixtureManifest } from "./manifest";

// Relative imports only in e2e/ (no "@/" — see env.ts's header note).

/**
 * The scanner-safety proof (P9.5-T0). Email security scanners, link
 * previewers, and antivirus prefetchers issue a bare, no-JS GET against
 * every link in an email BEFORE a human ever clicks it — the exact failure
 * mode the old app/auth/confirm/route.ts GET handler was exposed to: it
 * called verifyOtp() directly on GET, so a scanner's prefetch could silently
 * burn the single-use magic-link token before the real user ever arrived
 * (docs/DECISIONS.md D9's dated note; this phase's diagnosis).
 *
 * /auth/confirm is now a Server Component interstitial (app/auth/confirm/
 * page.tsx) that only ever RENDERS on GET — the token exchange happens
 * exclusively inside confirmSignInAction (app/auth/confirm/actions.ts), a
 * POST-only "use server" action the page's <form> submits (auto-submitted by
 * JS, or the visible "Confirm sign-in" button as the no-JS fallback).
 *
 * Like marketing.spec.ts (and unlike money-path.spec.ts), this is a set of
 * plain, independent tests: no test.describe.serial, no manually-created
 * shared page/context, no outage-detector wiring — every test below mints
 * its own fresh token and uses the standard built-in `request`/`page`
 * fixtures, so either can run in any order or in isolation. `manifest.email`
 * is the one thing borrowed from the shared fixture user global-setup.ts
 * creates — never a literal address (lib/e2e-safety.test.ts's static scan
 * enforces that every email-shaped literal under e2e/ is the real
 * `@e2e.qrcdn.test` fixture shape).
 */

function confirmPath(tokenHash: string): string {
  return `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=email&next=/studio`;
}

test.describe("auth scanner safety", () => {
  test("a bare GET renders the interstitial with a 200-family response and creates no session", async ({
    request,
  }) => {
    const manifest = JSON.parse(await readFile(manifestPath(), "utf8")) as E2eFixtureManifest;
    const hashedToken = await mintSignInToken(manifest.email);

    // The scanner analogue: a plain HTTP GET, no JS execution, no form
    // auto-submit — exactly what a mail-security prefetcher or antivirus
    // link-scanner does to every link in an email before a human opens it.
    const response = await request.get(confirmPath(hashedToken));
    expect(response.status(), "GET /auth/confirm").toBeGreaterThanOrEqual(200);
    expect(response.status(), "GET /auth/confirm").toBeLessThan(300);

    // No session was created — a successful verifyOtp() call would have set
    // a `sb-*-auth-token` cookie (@supabase/ssr) on this response. The old
    // route.ts called verifyOtp() unconditionally on GET; this is the
    // regression guard against that ever coming back.
    const { cookies } = await request.storageState();
    expect(cookies.some((cookie) => /^sb-.*-auth-token/.test(cookie.name))).toBe(false);
  });

  test("a token already hit by a bare GET is still unconsumed — the real page flow completes sign-in", async ({
    request,
    page,
  }) => {
    const manifest = JSON.parse(await readFile(manifestPath(), "utf8")) as E2eFixtureManifest;
    const hashedToken = await mintSignInToken(manifest.email);
    const path = confirmPath(hashedToken);

    // The scanner-prefetch precondition — see the sibling test above for
    // what this alone proves (200-family, no session). This test's job is
    // the other half of the contract: prove the GET didn't burn the token
    // either, by reusing the EXACT SAME token_hash for a real, JS-driven
    // sign-in. Supabase magic-link tokens are single-use, so this would land
    // back on /login?auth_error=link_invalid instead of /studio if the GET
    // above had already consumed it.
    await request.get(path);

    await page.goto(path);
    await expect(page).toHaveURL(/\/studio$/);
  });
});
