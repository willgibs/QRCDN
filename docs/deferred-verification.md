# Deferred verification ledger

Things that are **not proven** yet, and who can prove them. This file exists so
deferred checks stop living in phase reports that scroll away.

Rules: every entry says what is unproven, why it was deferred, and what "done"
looks like. Automated coverage is not listed here once it exists in CI. Entries
are removed only when the check actually passes, never because they got old.

Last updated: 2026-08-02.

## Launch-blocking

### 1. A real human sign-up on production
**Unproven:** that a person can receive a magic link by email and complete
sign-in on `www.qrcdn.com`. No human has done this since the P9.5-T0 magic-link
fix shipped.

**Why deferred:** it cannot be automated. The e2e suite mints its token through
the admin API, so it proves the `/auth/confirm` interstitial and `verifyOtp`
path but never touches real email delivery, the dashboard template, or SMTP.
`auth-scanner-safety.spec.ts` proves a bare GET does not consume a token, which
is the specific bug that caused the original failure, but not delivery.

**Done looks like:** a real address, not `@e2e.qrcdn.test`, receives the email,
clicks, and lands authenticated in the studio. Note what the email looked like,
since nobody has seen the production template rendered.

**Owner:** founder.

### 2. `hello@qrcdn.com` verification click
**Unproven:** the sending domain's verification is complete. Related to #1: if
production is silently on Supabase's built-in mailer rather than Resend, its
low hourly cap is an independent failure cause that #1 would surface.

**Owner:** founder.

### 3. `willg97@gmail.com` sign-in retest
**Unproven:** that the original failing address now works. This is the specific
account whose failure opened the P9.5-T0 investigation, so it is the honest
regression test for it.

**Owner:** founder.

## Blocks billing (P8.5)

### 4. Stripe account, and every paid path behind it
**Unproven:** checkout, subscription lifecycle, upgrade, downgrade, and the
webhook handling that follows. None of it exists yet, so none of it is tested.

**Why deferred:** requires a Stripe account the founder must create.

**Note:** every plan CTA currently routes honestly to `/pricing` with no fake
checkout button, so the product is not lying about this today.

**Owner:** founder, then engineering.

### 5. The downgrade path has no live implementation
**Unproven:** the downgrade policy (codes pause or go read-only, never delete,
never stop redirecting) is stated in the terms, the help centre, and
`docs/DECISIONS.md` D14, and enforced nowhere, because there is no way to
downgrade yet. Help article 8 already says this plainly rather than implying a
flow exists.

**Done looks like:** the policy enforced in code with tests, landing alongside
#4.

## Engineering, not blocked on anyone

### 6. status.qrcdn.com has no standing end-to-end check
**Unproven:** that the deployed status page's three probes actually evaluate
correctly against live infrastructure. `workers/status` has vitest covering
status derivation from mocked probe results, and P9.5-T6 did a one-off live
curl, but nothing runs on a schedule or in CI.

**Why deferred:** the P9.5 plan listed this as a T8 e2e addition and it was
dropped during scoping without being recorded. Found during the P9.5 close
review.

**Done looks like:** either an e2e spec that fetches status.qrcdn.com and
asserts the three probe rows resolve, or an addition to the existing uptime
canary workflow. The canary is probably the better home, since the status page
is a separate failure domain from the app by design.

### 7. The pause control's local-vs-CI divergence is unexplained
**Unproven:** why four separate mechanisms that depend on Next's client router
applying a fresh render in place each passed local e2e and failed CI, on the
same two assertions, while a hard reload has never failed CI.

**Why it matters beyond one button:** it likely affects any future in-place
update in the authenticated app, so the next person to want a smooth update
will hit it too. `components/codes/pause-toggle-button.tsx` carries a
do-not-retry note with this as the precondition for revisiting.

**Done looks like:** an explanation of the divergence. Only then is another
mechanism swap worth attempting.

### 8. Physical print and scan verification
**Unproven:** that exported codes scan reliably off real printed material. The
scannability thresholds come from adversarial zxing decode campaigns
(`docs/guides/qr-engine.md`), which are software round-trips. The product's
central promise is about print.

**Done looks like:** a handful of real exports printed at realistic sizes on
realistic stock and scanned with ordinary phone cameras, including at least one
near the warn threshold. Any disagreement with the instrument is a finding.

### 9. Staged-inert integrations have never run live
**Unproven:** Sentry (web and Worker), Turnstile, and Safe Browsing all ship
inert without credentials. The inert path is tested; the active path is not.

**Done looks like:** credentials set, then one deliberate trigger each.

## Minor

### 10. Entitlement copy pluralization
`"Free includes {PLAN_LIMITS.free.brandKits} brand kit"` interpolates correctly
but keeps a singular noun, so it reads wrong if that limit ever moves off 1.
Correct today. Worth a guard whenever entitlements next change.
