# P6 spec — Dashboard + analytics rollups

Read alongside: `docs/DECISIONS.md` (D8 + its P6 amendment, D3 ingest, D14 tier gating),
`docs/guides/design-system.md` (chart wrapper rule, motion budget, floor register),
`docs/guides/agent-playbook.md`.

## Scope

1. **Rollup** — migration 007: pg_cron hourly (`:05`) upsert of `scan_events` into
   `scan_daily` (full-day UTC recompute, idempotent; top-50-capped jsonb tallies for
   country/device/referer/city via `_cap_top_n_jsonb`, tail summed into `"other"` —
   never dropped) + `qr_codes.scan_count` maintenance folded into the same call
   (D8 amendment: hourly, not nightly). `rollup_scan_daily(window_days)` is
   `security definer`, revoked from PostgREST roles; the parameter is the manual
   backfill lever. **Operational caveat:** never backfill with `window_days` wider
   than the shortest retention window — a purge-boundary day would recompute from
   partially-purged raw events and overwrite a good rollup row.
2. **Retention purge** — app-layer route `apps/web/app/api/cron/purge/route.ts`
   (Vercel Cron daily 09:00 UTC, `CRON_SECRET` bearer, constant-time compare),
   cutoffs computed from `entitlements.ts` (free 30d / Pro 365d raw; rollups persist
   forever), REST-only batched deletes (≤500 code-ids per statement). Lives app-side
   so retention day-counts stay single-sourced in entitlements.ts (hard rule).
3. **Codes overview** (`/codes`) — stat tiles (total scans, scans today live, active
   codes) + full-width codes table, per-row "View analytics."
4. **Per-code analytics** (`/codes/{slug}`) — `scan_daily`-backed AreaChart
   (scans + per-day uniques series) with plan-gated range selector (7/30 free;
   90/365 rendered locked with Pro affordance until P8), range breakdowns
   (countries/devices/sources; cities Pro-only via `cityGeo`), live "today so far" +
   last-10 recent-activity feed read straight from raw `scan_events` (D8's live-24h
   allowance — a test scan appears in seconds), layout-matched skeleton loading.
5. **Docs** — this file, D8 amendment note, STATUS.md, infra.md scheduled-jobs
   section, `.env.example` `CRON_SECRET`.

Honesty rules baked into the UI: range *totals* are always labeled scans (daily
salt rotation makes cross-day uniques meaningless; per-day uniques only), day
buckets are UTC, and D3's <0.5% ingest loss means numbers are directional.

Out of scope: public API (P7), Stripe-driven plan changes (P8 — everyone is free
until then), cross-fade skeleton→content transition (deliberate cut; instant
Suspense swap ships), os/browser breakdowns (Worker never populates those columns).

## Units

| Unit | Owner | Contents |
|---|---|---|
| U1 backend-sql | sonnet | migration 007 (`_cap_top_n_jsonb`, `rollup_scan_daily`, pg_cron schedule, revokes), `supabase/tests/rollup.test.sql` (16 assertions), typegen |
| U2 app data + purge | sonnet | `lib/analytics.ts`, `lib/purge.ts`, `lib/supabase/admin.ts`, purge route + tests (+32), `vercel.json`, `.env.example` |
| U3 dashboard UI | sonnet | `/codes` + `/codes/[slug]`, `components/codes/*`, `ui/skeleton`, nav links, chart/motion at floor register, review-animations gate |
| U4 docs + live verification | fable | docs, D8 amendment, `CRON_SECRET` provisioning, cloud checks (cron tick, live scan → instant feed, purge 200, Vercel cron registered), founder review |

Verification bar unchanged (agent-playbook): lint/typecheck/test green per unit,
CI green per push, live checks against real hostnames before "done."
