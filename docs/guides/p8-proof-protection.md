# P8 spec — Proof & Protection

Read alongside: `docs/DECISIONS.md` (D3 privacy, D11 + its P8 amendment, D14 + its
P8 amendment, D15 cost posture), `docs/guides/agent-playbook.md`,
`docs/guides/infra.md` (Observability, Uptime, CI sections).

## Why this phase existed

Every Studio server action returned 500 in production for days (P7.5-RT). `tsc`,
`next build`, the full unit suite, CI, and manual live checks **all stayed green** —
the failure existed only in the bundled server-action registry, reachable only by a
real browser clicking a real button. It was found by hand, by accident, during
red-teaming.

The lesson wasn't "fix that bug" (done in `758511f`). It was **we ship blind**. This
phase bought proof and protection before making the product chargeable — Stripe was
deferred to P8.5 on the finding that it couldn't block anything (verified: zero
coupling, no application code, `profiles.plan` has no app write path at all).

## What shipped

1. **Playwright e2e** (`apps/web/e2e/`, `.github/workflows/e2e.yml`) — 14 tests over
   the money path against `next build` + `next start` (never `next dev`: the bundled
   action registry is the thing under test) and the real cloud Supabase. Auth via
   `auth.admin.generateLink` → `/auth/confirm` — real product code, no mailbox.
   Detection of the outage class is a blanket listener: **no response to a
   `next-action` request may be 5xx**, so it doesn't need to know which action broke.
   Also asserts the Worker leg live (`302` + `no-store` + Location on a fresh slug).
   **Proven, not assumed:** reintroducing `export type { QrCode }` leaves
   `next build` green and makes the suite fail; reverting restores 14/14. Verified
   twice — by the implementer and independently.
2. **Sentry in `apps/web`**, inert until `NEXT_PUBLIC_SENTRY_DSN` exists. Tracing and
   replay off (error capture is the whole scope; replay's DOM capture is wrong for
   D3). A pure, tested `beforeSend` scrubber strips auth headers, cookies, and
   password/destination/token-shaped keys. `withSentryConfig` is itself gated —
   measured: unconfigured it emitted warnings *and* made an outbound telemetry call.
3. **NOT Sentry in the Worker** — implemented, measured, removed. `@sentry/cloudflare`
   took the bundle **13.9 KB → 515.7 KB (37×)**, partly via the `nodejs_compat` flag it
   requires (~34 KB of Node polyfills on its own), all on the most latency- and
   reliability-critical path in the product, for nothing until a DSN exists. Replaced
   with Cloudflare-native Workers Logs (`observability` in wrangler.jsonc) plus a
   `console.error` on ingest's swallowed-failure catch — same visibility, zero bytes.
4. **Uptime canary** (`.github/workflows/uptime.yml`) — hourly, asserts the hard-rule
   contract (302, `no-store`, Location not `/u/`). Deliberately does **not** assert the
   exact destination, so a legitimate retarget never cries wolf. Opens a deduplicated
   issue on failure, closes it on recovery. Watches an existing code via the
   `UPTIME_CANARY_SLUG` repo variable — no dedicated canary, no free-plan slot consumed.
5. **Postgres rate limiting** (migration 009 + `lib/rate-limits.ts`) — mirrors the
   `api_usage` precedent exactly (security-definer RPC, revoked from PostgREST roles,
   granted to `service_role`, plus a `pg_cron` cleanup since this table has no natural
   bound). Per-IP on `/p/{slug}` unlock, per-user on Studio mutations. **Fails open when
   the limiter itself errors, never when it correctly reports over-limit** — `/p` sits
   on "your code never dies". Limits live outside `entitlements.ts` on purpose: they
   apply identically to every plan.
6. **Turnstile + Safe Browsing, staged inert** — both written, both no-ops until keys
   land (the `kv-sync.ts` idiom). Turnstile needed almost no code: Supabase Auth
   verifies it natively, so there's no siteverify endpoint of our own. Safe Browsing
   lives in `codes-core.ts`, not the Studio actions, so it covers the API path too —
   unlike rate limiting, which the API already covers via its monthly quota. Both
   fail open by construction: only an explicit `safe:false` blocks.

## Bugs this phase found in existing code

- **Access dialog left its dropdown open** (fixed, `c87974b`). `preventDefault()` on the
  menu item stopped Radix's close-and-return-focus race — and stopped the menu closing
  at all. Jank for a person; in automation the stray popover swallowed every later click
  (deterministic 30s hang). Fixed via controlled state; the e2e workarounds were
  **deleted** so the suite keeps proving it.

## Honest limits

- The e2e suite writes to the **production** database (no staging project exists, and a
  staging one would drift — proving less, not more). Guarded four ways: teardown acts
  only on the id it created; a reap-on-start sweeps `@e2e.qrcdn.test` older than 2h
  (an IANA-reserved, never-resolvable TLD used as an allowlist); a vitest guard asserts
  every email literal under `e2e/` matches the throwaway pattern; specs never touch a
  row they didn't mint.
- The live Worker check tests the **deployed** Worker, not a PR's Worker changes.
- The canary is **not a pager**, and cannot detect its own absence (GitHub disables
  schedules after 60 days of repo inactivity).
- Burst/WAF rate limiting is still Vercel-Pro-gated (D11) — the Postgres limiter is an
  application-level complement, not a replacement.

## Actions burn (measured, per-run)

CI 55s · E2E 92s · RLS 78s · uptime 12s · backup 36s. Post-launch floor once the repo
goes private (P10) is uptime (~720 min/mo) + backup (~30) ≈ **750 of 2,000 free
minutes** — which is exactly why the canary is hourly, not every 15 minutes (that alone
would exceed the entire budget).

## Units

| Unit | Contents |
|---|---|
| U1 | Playwright e2e + CI workflow + the four-layer fixture guardrail |
| U2 | Sentry in apps/web (inert); Worker measured and left on native logs |
| U3 | Uptime canary workflow |
| U4 | Rate limits: migration 009, RPC, pgTAP, `/p` + Studio call sites |
| U5 | Safe Browsing + Turnstile, staged inert |
| U6 | This spec, D11/D14 amendments, infra/STATUS, board note |
