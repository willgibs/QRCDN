# Security

QRCDN handles short links, scan analytics, and destination redirects for real
users. If you find a security issue, we want to know before anyone else does.

## Reporting

Email **hello@qrcdn.com** with a subject line that starts with `SECURITY:`.
A person reads every message sent there.

Please include:

- What you found and why it's a security issue, not just a bug
- Steps to reproduce, or a proof of concept if you have one
- The affected URL, endpoint, or repository path
- Your assessment of impact: what an attacker could actually do with it

## What to expect

We'll acknowledge your report and follow up as we investigate and fix the
issue. We don't run a bug bounty program and can't promise a specific
response time or payout, but we do read and act on every report that comes
in, and we'll credit you, if you want that, once a fix ships.

## Scope

This repository is the entire product: `apps/web` (the app and site),
`workers/redirect` (the scan-redirect edge layer), `workers/status` (the
status page), `packages/qr-engine` and `packages/shared`, and the Supabase
schema under `supabase/`. A vulnerability in any of these, or in the hosted
service at [qrcdn.com](https://www.qrcdn.com), is in scope.

## Please don't

- Don't test against other people's accounts or data without permission.
- Don't run automated scanners that could degrade service for real users.
- Don't publicly disclose a vulnerability before we've had a chance to fix it.

Thank you for helping keep QRCDN, and the people who print our codes, safe.
