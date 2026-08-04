# Status

QRCDN is in active pre-launch development. This file is the outward-facing
summary; the full working ledger (phase-by-phase history, session records,
operational runbooks, and the per-phase specs and entries that older code
comments cite) lives in a private ops repository.

**Live today at [www.qrcdn.com](https://www.qrcdn.com):** a styled QR studio
with a live scannability instrument, brand kits, dynamic codes on `qrcdn.com`
short URLs (302 + `no-store`, always), scan analytics built from daily
rollups, and a scoped REST API.

**In progress:** brand-kit sync (edit a kit and every attached code follows
it), a payload-bounding slug cap that lets a kit prove scannability for every
dynamic code ever made from it, and an account-free studio for static codes.
A full design pass of the marketing site follows.

**Verification posture:** unit suites across every package, pgTAP RLS tests
against a real Supabase stack, Playwright end-to-end tests over the sign-in
and money paths plus the marketing pages (run against a production build,
never the dev server), an hourly production uptime canary asserting the
redirect contract, and nightly encrypted database backups. The invariants
contributors must not break: [CONTRIBUTING.md](../CONTRIBUTING.md).
