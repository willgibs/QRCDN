# Infra guide

Read this when touching accounts/services, DNS, the redirect Worker, CI, env vars, or cost/scaling decisions.

## Account / service registry

Verified live against the connected Supabase, Cloudflare, and Vercel MCPs at time of writing (in addition to `docs/STATUS.md` / `docs/DECISIONS.md`):

| Service | Identifier | Notes |
|---|---|---|
| Supabase project | `qrcdn`, ref `yklhpbhfowuvxlwlalhf` | Org `mmfclcuvgwdmpwtnzgvw`, region `us-east-1`, free tier, status `ACTIVE_HEALTHY`. The same org also holds unrelated projects (`squurl`, `hopper`, `kitpacker`) — scope every Supabase MCP call to the `qrcdn` ref, don't operate org-wide. |
| Vercel | Team `willgibs` (id `team_DLm5Sv9cov0Cg60zrXAZjUi2`) | **No `qrcdn` project exists yet** — the team's current projects are `hopper`, `partyreel`, `arkh`, `v0-spline-scene-adjuster`, `portfolio-v0`, `portfolio`, `v0-squurl-bookmark-tool`, `kitpacker`; none is QRCDN. Project creation is future work, not yet done. |
| Cloudflare | Account holds DNS for `qrcdn.com` | Same account also runs two **unrelated** Workers, `partyreel-export` and `partyreel-backup` — confirmed live. **Do not touch, deploy over, or reference these** when working on `qrcdn-redirect`. |
| GitHub | `willgibs/QRCDN` | — |

## DNS / domain topology (D1)

- `qrcdn.com` (apex) is **orange-clouded** (proxied) with a Worker route `qrcdn.com/*` in front of it, serving short-URL scan redirects (`{slug}` paths). Non-slug apex paths 301 to `www.qrcdn.com`.
- `www.qrcdn.com` is **grey-clouded** (DNS-only, not proxied through Cloudflare) and points at Vercel — Vercel explicitly warns against proxying Cloudflare in front of it. `www` is the canonical app + marketing host.
- Zone SSL mode: **Full (strict)**.
- Printed/QR-encoded URLs are uppercase (`HTTPS://QRCDN.COM/K7M2X9A`) — fully QR-alphanumeric-mode encodable, producing version 2–3 symbols, materially denser than byte mode would.
- As of this doc, the Worker route + KV binding are **not yet live** — `workers/redirect/wrangler.jsonc` has both commented out with the note that they're configured in P5 once the KV namespace exists and DNS cuts over; until then the redirect Worker is dev-only (`wrangler dev`).

## Redirect data path (D2, D3)

- **KV is a cache; Postgres is truth.** Worker does `KV.get(slug, {cacheTtl: 60})`; on a miss it reads through to Supabase REST and backfills KV.
- Retarget flow: Postgres `UPDATE` first, then a write-through `PUT` to the Worker's first-party sync endpoint (`/__kv-sync/{slug}`, shared `SYNC_SECRET`/`KV_SYNC_SECRET` pair, retry once) — propagation is **instant** when configured. Fallback if the sync is unconfigured/unavailable: every KV write carries `expirationTtl: 300`, so staleness self-heals within 5 minutes.
- **Scan redirects are always `302` + `Cache-Control: no-store` — never `301`.** (Restated from the hard-rules list in `CLAUDE.md` because it's the single most load-bearing infra rule — a cached 301 would pin users to a stale destination forever.)
- Paused / expired / password-protected codes redirect (302) to `www.qrcdn.com/u/{slug}` instead of the real destination.
- Redirects must keep working even if Supabase is down or paused — that's the entire reason KV sits in front as a cache rather than the Worker calling Postgres directly on every request.
- Scan ingest (D3) is fire-and-forget: `ctx.waitUntil()` POSTs the scan event to Supabase REST (secret key as a Worker secret) with one retry. Event payload: `code_id`, `ts`, geo from `request.cf` (free on all Cloudflare plans), coarse UA parse, `sha256(ip + daily salt)` (never raw IP), referer. A bot filter (UA + HEAD-request check) runs at ingest. <0.5% event loss is accepted as directional-only analytics; upgrade path if that's not good enough is Cloudflare Queues (+$0.80/M scans).

## Env var conventions

Convention per D9 (new Supabase API key scheme — `sb_publishable_`/`sb_secret_`, since legacy `anon`/`service_role` keys retire end-2026):

| Var | Exposure | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | `sb_publishable_...` — safe to expose |
| `SUPABASE_SECRET_KEY` | **server-only** | `sb_secret_...` — never in a `NEXT_PUBLIC_*` var, never sent to the client |
| `KV_SYNC_SECRET` | **server-only** | shared with the Worker's `SYNC_SECRET`; authenticates the retarget write-through (`apps/web/lib/kv-sync.ts`) |
| `CRON_SECRET` | **server-only** | guards `/api/cron/purge`; Vercel Cron sends it as `Authorization: Bearer <value>` automatically once set |

Worker secrets (e.g. the Supabase secret key used by the redirect Worker's scan-ingest POST) are set via `wrangler secret put`, not committed config. **Never commit any of these values** — no `.env` files exist in this repo yet (auth/schema work is P3, not yet started as of this doc; there is no live Supabase client code anywhere in `apps/web` yet). When P3 lands, follow `@supabase/ssr`'s standard client/server split: `getClaims()` for page guards, `getUser()` before destructive/billing actions, never trust `getSession()` server-side (hard rule, `CLAUDE.md`).

## Scheduled jobs (P6)

| Job | Where | Schedule | What |
|---|---|---|---|
| `rollup_scan_daily_hourly` | pg_cron (in-database; inspect via `cron.job` / `cron.job_run_details`) | `5 * * * *` | `select public.rollup_scan_daily();` — upserts today+yesterday UTC into `scan_daily`, maintains `qr_codes.scan_count` (D8 amendment) |
| Retention purge | Vercel Cron (`apps/web/vercel.json`) → `GET /api/cron/purge` | `0 9 * * *` daily | Deletes `scan_events` older than the owner-plan retention (entitlements.ts: free 30d / Pro 365d); `CRON_SECRET` bearer auth; Hobby-plan timing looseness is fine — retention is a ceiling, not a promise |
| Nightly DB backup | GitHub Actions (`.github/workflows/backup.yml`) | `17 7 * * *` daily | `supabase db dump --db-url` → private-repo artifact, 14-day retention. Needs the `SUPABASE_DB_URL` repo secret (session-mode `:5432` connection string). Stopgap until Supabase Pro; unencrypted, repo-access-gated — see the workflow header. Breaks silently if Supabase network restrictions are ever enabled |

Manual rollup backfill (e.g. after a cron gap): `select public.rollup_scan_daily(N);`
with `N` = days back. Never exceed the shortest retention window (see p6-dashboard.md
caveat). `cron.schedule` is upsert-by-name — re-running migration 007 is safe.

## Observability (P8-U2)

| Surface | Mechanism | Why |
|---|---|---|
| `apps/web` | **Sentry** (`@sentry/nextjs`) — `instrumentation.ts` + `onRequestError` | Where the P7.5 outage lived. Inert until `NEXT_PUBLIC_SENTRY_DSN` is set (the `withSentryConfig` wrap is itself gated — measured: unconfigured it warned *and* phoned home). Tracing and replay off; a tested `beforeSend` scrubber strips auth headers, cookies, and password/destination/token-shaped keys (D3). |
| `workers/redirect` | **Cloudflare-native Workers Logs** (`observability` in wrangler.jsonc) + `console.error` on ingest's swallowed-failure catch; inspect via dashboard or `wrangler tail` | Sentry was implemented here and **removed after measurement**: `@sentry/cloudflare` took the bundle 13.9 KB → 515.7 KB (37×, partly via the `nodejs_compat` flag it requires), on the most latency-critical path in the product, for nothing until a DSN exists. Native logging gives the same visibility at zero bundle bytes. |

Source-map upload is deliberately not configured (needs a separate org auth token;
error capture works without it). Sentry's DSN is publishable — it's a var, not a secret.

## Uptime (P8-U3)

`.github/workflows/uptime.yml`, hourly, asserts the scan-redirect hard-rule contract
against `qrcdn.com/${{ vars.UPTIME_CANARY_SLUG }}`: `302`, `Cache-Control: no-store`,
and a Location that is **not** the `/u/` unavailable page (the signature of slug
resolution failing when KV *and* Postgres are both unreachable). It deliberately does
not assert the exact destination, so a legitimate retarget never cries wolf. Opens a
deduplicated `uptime-alert` issue on failure and closes it on recovery.

Honest limits: **not a pager** (no escalation or acknowledgement), and it cannot detect
its own absence — GitHub disables scheduled workflows after 60 days of repo inactivity.
Cadence is hourly because at 15-minute intervals this one workflow would consume
~2,880 min/mo — more than the 2,000 free min/mo a *private* repo would carry. Public
repos get unmetered Actions minutes (see below), so this ceiling is a permanent
non-issue rather than a future one; the hourly cadence stays anyway as the sensible
operational default, not because the budget currently requires it.

## Repo visibility + fork-PR posture (P7.5-A, 2026-07-23; superseded at P9.5-T6, 2026-08-01)

The repo is **public, permanently** — MIT-licensed open source, board-approved at
P9.5 (`docs/guides/p9.5-ascent.md`; canon line: *"if we ever disappear, the path off
is public"*). This reverses what this section originally said: the P10 checklist used
to carry a "flip back private before launch" line, with a re-audit of every
visibility-dependent assumption at that point. That item is gone — there is no future
private flip to re-audit against. Standing posture, unchanged and now load-bearing
permanently rather than temporarily: GitHub does not expose repo secrets to fork-PR
workflow runs; `backup.yml` triggers only on schedule/`workflow_dispatch` (never
`pull_request`); first-time-contributor runs require maintainer approval (GitHub
default). Backup artifacts are AES-256-CBC encrypted (`BACKUP_PASSPHRASE` repo secret;
decrypt one-liner in the workflow header) because public-repo artifacts are
downloadable by any logged-in GitHub user. Never add a secret-consuming job to a
`pull_request` trigger.

## Cost posture and upgrade triggers (D15, reproduced)

> Building: $0 (Vercel Hobby + Supabase Free `yklhpbhfowuvxlwlalhf` + CF Free).
> Launch: $25/mo — Vercel Pro $20 + **Workers Paid $5 (mandatory: free tier's 100k req/day cap would dead-end every printed code on one viral day)**. Supabase Pro $25 at first real customers (free tier has no backups — nightly pg_dump cron until then).

Operationally: don't upgrade anything preemptively while still building. Workers Paid is a hard launch-blocker, not optional, because of the request-cap dead-end risk. Supabase Pro's trigger is "first real customers," not a fixed date — until then, the nightly `pg_dump` protection is **implemented**: `.github/workflows/backup.yml` (see Scheduled jobs above).

## CI (`.github/workflows/ci.yml`)

- Triggers: `push` to `main`, and all pull requests.
- Single job (`checks`, `ubuntu-latest`): checkout → `pnpm/action-setup@v4` → `actions/setup-node@v4` (Node 22, pnpm cache) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test`. Lint/typecheck/test fan out across the pnpm workspace via each package's own script (root `package.json` scripts are thin wrappers: `pnpm -r lint`, etc.).
- **`rls.yml`** (P7-A0): path-gated to `supabase/**`, boots a real Supabase stack and runs the pgTAP suite (`supabase test db`).
- **`e2e.yml`** (P8-U1): path-gated to `apps/web/**`/`packages/**`/`supabase/migrations/**`, builds the app and runs Playwright against `next start` + the real cloud Supabase. Fork PRs are skipped (they never receive secrets). This is the only gate that exercises the *bundled* server-action registry — the layer where the P7.5 outage lived, invisible to typecheck/build/unit tests.
- **`uptime.yml`** (P8-U3) and **`backup.yml`** (P7.5-A1) are scheduled, not push-triggered — see Scheduled jobs above.

## Local dev

- `pnpm dev` from repo root runs `pnpm --filter web dev` → Next.js dev server on `:3000`.
- `.claude/launch.json` defines one launch config, `"web"`: `pnpm --filter web dev`, port `3000` — this is what `preview_start`-style tooling should target.
- The redirect Worker has its own dev loop: `cd workers/redirect && pnpm dev` (→ `wrangler dev`); it is not wired into the root `pnpm dev` script.
- The Supabase CLI is vendored as a **root-level devDependency** (`supabase: ^2.109.1` in the repo-root `package.json`, not `apps/web`'s), invoked as `pnpm supabase <cmd>` per `CLAUDE.md`'s command list.

## Outline discrepancies

- The task outline's account-registry facts (Supabase org `mmfclcuvgwdmpwtnzgvw`, region `us-east-1`, and the Cloudflare Workers being named `partyreel-export`/`partyreel-backup`) are **not written down anywhere in this repo's docs** (`STATUS.md`/`DECISIONS.md` only say "org holds 2 unrelated Workers" without naming them, and don't mention the Supabase org id or region at all). They were confirmed instead by querying the connected Supabase and Cloudflare MCPs live — included above as verified fact, but be aware future readers without live MCP access won't be able to re-derive them from the repo alone. Worth adding the org id/region to `STATUS.md`'s environment quick-refs line for future agents who don't have MCP access.
