# Status

_Last updated: 2026-08-01 (P9.5-T7 landed: four authenticated-app quick wins — /api-keys free-state showcase, /codes create button + per-row pause, studio rail regrouped into Design/Content & output clusters, zero-kit empty state — plus three riders: pricing label truth fix, P10 backlog note, and a 47-violation em-dash sweep with a standing regression test. Two spec claims found untrue and corrected rather than followed blindly: the em-dash rider's app/u/[slug] claim was already fixed at T3c, and the Proof section's "fixture user is free-tier" assumption was false, resolved by moving the free-plan e2e check to the deliberate last step of the money-path suite). Update this file at every phase boundary or significant commit._

## Current phase

**Checkpoint A — CLOSED (2026-07-21).** Precision locked; the v4.2 hero is the codified quality floor (see design-system guide). The /explore canvas persists as the landing-page seed for P9 (founder chose product-spine-first sequencing).

**P3 — code-complete (2026-07-22).** Migrations 001-004 applied to cloud (advisors clean); 18 pgTAP RLS assertions green in CI against a fresh stack AND validated against live cloud; @supabase/ssr auth (magic link + Google routes), floor-styled /login, getClaims-guarded /studio, entitlements module. Next: P4 studio + generator.

**P3 founder-config (2026-07-22, done via founder's Chrome):** Google OAuth **live and verified end-to-end** — GCP project `qrcdn` (id `stellar-spark-503202-i4`), OAuth client "QRCDN Web", consent screen published to **Production** (basic scopes only, no verification review needed), Supabase Google provider enabled + creds saved by founder; live sign-in test passed (login → consent → callback → /studio authenticated; `handle_new_user` created the profiles row, plan=free, provider=google). Supabase Auth URL config saved (site URL localhost:3000; redirect allow-list localhost + www.qrcdn.com). Resend: new account under hi@willgibs.com, team QRCDN, domain `qrcdn.com` **Verified** (us-east-1); DNS added in Cloudflare (4 records: DKIM TXT `resend._domainkey`, MX+SPF TXT on `send`, DMARC `_dmarc` p=none). Supabase custom SMTP form staged (noreply@qrcdn.com / QRCDN / smtp.resend.com:465 / user `resend`). Founder saved the `supabase-smtp` sending-only API key into Supabase SMTP; magic-link test fired from /login → Resend log shows **Delivered** ("Your sign-in link" to hi@willgibs.com). **P3 fully closed — both auth paths verified live.**

**P4 in flight (2026-07-22).** Spec: `docs/guides/p4-studio.md`. U1 (storage bucket + kit CRUD actions + pgTAP) landed `ce3a599`, CI green, migration 005 applied to cloud with founder approval. U2 (studio shell + login check) landed `fd50c48` and passed live production-build review in founder's Chrome: live style binding (payload/ink/paper/module/eye → instant re-render), kit create/limit-refusal/two-step-delete/set-default all verified against live RLS + DB. **Login mystery resolved:** /login was always floor-correct — the founder-observed full-width render came from the long-running :3000 dev server serving stale Tailwind CSS older than the login files; production build renders perfectly (founder should restart that dev process). U3 landed `fe9f288` and passed live review with **independent decode proof**: contrast guardrail fires (1.16:1 → destructive chip), logo upload → knockout → live ratio slider works, 40%-logo export genuinely fails zxing decode while the 25% export decodes to the exact payload — the chip tells the truth. Save-to-kit persists (style jsonb carries the logo data URI; bucket object at `{owner}/{kit}` confirmed via RLS-scoped upload). Exports go to Chrome's *configured* download dir (founder's is iCloud `cloud/downloads`, not ~/Downloads — check there before assuming failure). Notes for U4/P5: (1) removing a logo then saving doesn't delete the bucket object (harmless orphan — hygiene item); (2) `style.logo.assetId` stores the raw data URI (deliberate: deterministic self-contained renders) — P5 must weigh frozen-snapshot bloat when styles copy into qr_codes (consider tighter logo size cap than 2MB); (3) sub-lg breakpoint matrix still unverified (founder-window resize refused by macOS — ask founder to drag narrow during review). **U4 adversarial pass landed `91cd8c5`** (+53 tests → 136 total): XSS-into-SVG proven impossible (payload never interpolated, all colors assertHex-gated, injection suite added); found+fixed: silent placeholder QR on oversize payloads (now honest role=alert banner, live-verified), server-side logo-size bypass via forged action input (length guard), and a real functional bug — Next's 1MB bodySizeLimit silently killed every logo save >~730KB (raised to 4mb; 1.47MB logo save live-verified end-to-end into style jsonb + bucket). Accepted-and-documented, not fixed: kit_limit check-then-insert race (DB backstop would duplicate entitlement constants against the single-source hard rule; revisit at P8 where limits carry money), zero-width-only kit names render blank chips (cosmetic), invalid image bytes as logo show broken glyph while chip stays green (unreachable via real file picker; polish: pre-decode check). **P4 units U1–U4 complete.** Post-U4 the founder adopted **Resend as core design inspiration** (accent policy: violet-only chrome, glows may take user-content hue; scope: studio + primitives now, marketing at P9). Infusion landed `7a710a0..4f05d15` (planned via approved plan file, CI green): brand primitives moved to `components/brand/` (magic.tsx + new ArtifactStage/AccentText/glow-tile), studio QR restaged as a floating luminous artifact (paper-hex seamless mat, ink-tinted bloom via solid-under-blur — interpolates where gradients can't, recessed `--surface-studio` 0.12 floor), lit selected tiles in the rail; grammar codified in design-system.md. Live-reviewed in founder's Chrome both themes: re-hue smooth, light-mode adaptation holds, no seam, contrast fine. Note: run 29893887310 (docs-only `377bfda`) failed on a `supabase/setup-cli` download flake — infra, not code; code-identical runs green either side. Founder review round 2 returned five notes — all landed `278e420..72e9b5e` + docs reconcile `7de700a`, CI green, live-verified: sticky preview stage (lg+, `top-24` derived from real bar height), full color picker (react-colorful + vendored popover, rainbow trigger = custom-active state), four new engine-backed configs (gradient ink w/ deg→rad boundary conversion, eye color w/ null-inherit "Match ink", transparent paper w/ checkerboard + truthful transparentBackdrop reporting, ECC L/M/Q/H showing effectiveEcc), kit bar redesigned as project pill + dropdown (rename/default/two-step-delete-in-menu/new), and the glow rig restructured as authored lighting (inner halo + offset field + ink-tinted reflection streak; base bloom trimmed). Deps added: react-colorful only (popover rides the existing radix-ui meta-package). Tests 136→145. Round 3 notes landed `408e6c0..27c96df` (CI green): kit pill dots eliminated (dirty state lives in a self-labeled "Save changes" button, DEFAULT is a mono tag in the menu), studio artifact is now genuinely 3D — `TiltStage` (components/brand/) drives rotateX/rotateY from cursor position over the FULL stage via motion springs (zero re-renders, composed transform strings, ±12° clamp, moving specular sheen, counter-shifting ink-tinted floor shadow, reduced-motion = fully static; bloom rig retired from studio, kept as the P9 marketing treatment) — fulfills the checkpoint-A transitions.dev "3D tilt" mandate; scannability feedback is an instrument panel (clean: `● SCANNABLE · V{n} · ECC {x}` from real engine metadata via RenderResult.version; issues: count chip + full never-truncated list). Orchestrator widened tilt tracking from card-only to full stage per the founder's literal ask (`27c96df`). Tilt FEEL (spring stiffness 150/damping 20, sheen 0.08/0.13, ±12°) is automation-unverifiable (hidden-tab rAF freeze) — founder judges it live; all four values are one-line tunables. Round 4/5 tilt-lighting iterations: two-sided sheen+shade `799b151`, then planar shading `21f2bea` (founder: radial shade unnoticeable on white, still read as skew → four per-edge linear-gradient ramps with motion-driven opacity + perspective 1100→750px for real foreshortening; sheen ceilings 0.11/0.16). **Vercel deployed by founder** (`qrcdn.vercel.app`, team willgibs — repo connected, root dir correctly resolving): `/explore/precision` serves 200 but `/` and `/login` 500 — classic missing-env signature (proxy.ts builds the Supabase client per request; `/explore` is excluded from the matcher). Fix: add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public, in .env.example) + `SUPABASE_SECRET_KEY` (founder paste) to Vercel env, redeploy; then add `https://qrcdn.vercel.app/**` to Supabase auth redirect allow-list + the origin to the Google OAuth client for auth to work there. Founder's Supabase dashboard session has expired — needs their login before I can drive it. **P4 CLOSED (2026-07-22, founder: "works for now, proceed")** — one open circle-back: tilt polish "nail it" round, deferred. **Vercel is LIVE**: founder added the 3 env vars + redeployed → all routes 200; I added `https://qrcdn.vercel.app/**` to the Supabase redirect allow-list (dashboard, founder session) and verified **Google sign-in end-to-end on qrcdn.vercel.app** → /studio with kits loaded. Google-client JS origins NOT needed for the server-side redirect flow (GCP passkey-gated anyway; optional hygiene). Supabase tooling decision pending founder: keep MCP + one-time `pnpm supabase login` so CLI `db push`/`config push` covers the auth-config gap (version-controlled auth config in supabase/config.toml).

**Supabase CLI is now linked** (founder ran `pnpm supabase login`; project linked to `yklhpbhfowuvxlwlalhf`). Migration ledger repaired: the five MCP-applied migrations were recorded remotely under MCP-generated timestamps — `migration repair` reverted those entries and marked the repo-canonical versions applied; `migration list` now shows clean 5/5 parity. **Migration path from now on: write file → CI green → `pnpm supabase db push`** (MCP stays for SQL/advisors/typegen). Auth config can move to `supabase/config.toml` + `config push` when next touched.

**P5 open** — spec: `docs/guides/p5-dynamic.md`. U1 landed (slugs, code actions, frozen snapshots, +`qr_codes.name` migration 006 via first `db push`; D12 amended to 30-char charset). U2 landed `669be40` (98 Worker tests, pure decision table). **U3 CUTOVER COMPLETE — qrcdn.com IS LIVE (2026-07-22):** Worker `qrcdn-redirect` deployed to the Will Gibson account (`account_id` pinned in wrangler.jsonc after the founder's dual-account login sent the first deploy to Partyreel Team — strays deleted), KV `1bad31228c81471a912e764aebabbbbe`, secrets set via shell pipes, route `qrcdn.com/*` attached. DNS: apex AAAA `100::` proxied, `www` CNAME `cname.vercel-dns.com` grey-cloud, `_vercel` TXT for domain verification. **Live-verified end-to-end on real hostnames**: slug 302+no-store with Supabase read-through + KV backfill, 301 canonicalization, real scan_event with edge geo + hashed IP (bot-filtered curl correctly ignored), www.qrcdn.com serving the app 200 (Vercel domain verified + attached). Test artifacts cleaned. Loose ends: Cloudflare zone-level managed robots.txt prepends AI-crawl content to the Worker's Disallow (reconcile at P10); Vercel suggests its newer per-project CNAME target (legacy supported, optional); Google OAuth origins for vercel.app never needed. U4 landed `7b068eb` (CI green, 141 web tests) and passed the live mint test: created code `VMQ2DBA` → willgibs.com from the studio UI, stage flipped to render the real printed code, production scan `qrcdn.com/VMQ2DBA` → 302 willgibs.com with KV backfill (incl. codeId) + scan_event (geo/device/hashed IP). Codes list shows labeled status + scan count (stays 0 until the P6 rollup — by design, D8). **Incident (self-inflicted, resolved, documented):** during stray cleanup, `wrangler delete` ran in workers/redirect where the fresh `account_id` pin overrode my `CLOUDFLARE_ACCOUNT_ID` env intent — deleted the PRODUCTION worker instead of the Partyreel stray (~4 min of apex 522, zero real users). Redeployed + re-put secrets (secrets die with a deleted worker); lesson recorded: config `account_id` wins over env var — never run destructive wrangler commands from a directory whose config pins a different target than intended. The Partyreel stray worker still exists — delete later from a neutral cwd or dashboard. Retarget live-verified end-to-end (studio inline confirm → Postgres → scan follows the NEW destination) after finding+fixing a real staleness gap: KV backfill entries had no TTL, so with app-side write-through unconfigured a retargeted slug pinned its old destination forever — Worker now backfills with `expirationTtl: 300` (`1912a43`), capping staleness at 5 min unconditionally. Pause path verified at the Worker level (unit + workers.dev); UI action shape identical to retarget. **Retarget propagation is now INSTANT** (`32a3d4c`, CI green, Vercel deployed): replaced the planned CF-API write-through with a first-party Worker endpoint `PUT /__kv-sync/{slug}` (shared-secret header, timing-safe digest compare, strict body validation, universal 5-min-TTL KV writes) — no Cloudflare API token exists anywhere; one `SYNC_SECRET`/`KV_SYNC_SECRET` pair provisioned via shell pipes (Worker secret + Vercel prod env + .env.local, value never in any transcript). Live-verified: sync 204 → scan follows immediately; wrong secret 401; GET 405. Env contract: CF_* trio replaced by `KV_SYNC_SECRET` (+ optional `KV_SYNC_URL`) in .env.example. Outstanding cosmetic: stray inert `qrcdn-redirect` worker in Partyreel Team (current CLI token correctly can't reach that account; dashboard pane wouldn't render this session) — one founder click: Partyreel → Workers & Pages → qrcdn-redirect → Delete. **P5 functionally complete → founder checkpoint.** Login page styling is scaffold-grade (full-width card) — bring to quality floor in P4. Note: printed QR URLs use the apex (`qrcdn.com/{slug}`), so email-vs-Worker routing never collides: Resend only takes `send.qrcdn.com` (bounce MX) + TXT records, no web traffic impact.

**P6 SHIPPED (2026-07-22/23) — dashboard + analytics rollups.** Spec: `docs/guides/p6-dashboard.md`. U1 `4163a49`: migration 007 (scan_daily gains by_referer/by_city; `_cap_top_n_jsonb` top-50 tally cap summing the tail into "other"; `rollup_scan_daily(window_days)` security-definer + PostgREST-revoked, hourly pg_cron at :05, upsert-by-name so re-push is safe) + `supabase/tests/rollup.test.sql` (16 pgTAP assertions). Implementer caught a real Postgres gotcha: a WITH-chained scan_count update reads the pre-insert snapshot and silently undercounts forever — split into two statements (documented inline). D8 amended (dated, in DECISIONS.md): scan_count hourly not nightly; retention purge app-side so entitlement day-counts stay single-sourced. Migration pushed to cloud, advisors clean, types regenerated (`771941b`). U2 `9de80aa` (+32 tests → web 174): lib/analytics.ts (server-side range clamping, UTC window math, zero-filled chart series), lib/purge.ts (REST-only batched deletes, ≤500 ids/statement), admin client, `/api/cron/purge` (Vercel Cron daily 09:00 UTC, CRON_SECRET bearer, constant-time compare, per-plan isolation), vercel.json. U3 `abc5ce9` (+4 tests → 178, prod build green): `/codes` overview (stat tiles + real Table) + `/codes/{slug}` analytics (range-gated AreaChart scans+per-day-uniques, Pro-locked 90/365 upsell affordances, top-5+Other breakdowns, cityGeo-gated cities, live "today so far" + last-10 recent-activity feed off raw scan_events per D8's live-24h allowance), layout-matched skeletons, value-change-keyed stat pop-ins (≤300ms, reduced-motion keeps fade drops movement; review-animations rubric applied), nav links + codes-list "View analytics". Backfill verified against cloud: `rollup_scan_daily(7)` rolled the P5 phone scan into scan_daily (US/mobile/direct/Greenville) and `VMQ2DBA.scan_count` went 0→1 — first real nonzero count. **Incident found+fixed during U4: Vercel CLI was linked to a stray empty project `web`** (auto-created by `vercel link` last session defaulting to the directory name) — so KV_SYNC_SECRET (P5) and CRON_SECRET (P6) had been added to the WRONG project; production retargets were silently on the 5-min-TTL fallback, not the instant sync path (local testing masked it via .env.local). Fixed: relinked to `qrcdn` (`.vercel/project.json` now correct), both secrets re-provisioned to the real project via shell pipes, redeploy triggered by this docs commit. Residue: stray project `web` (no domains/deployments, holds stale secret copies) — CLI deletion blocked by permission guardrail; founder one-click: Vercel → Projects → web → Settings → Delete. Founder checkpoint: live review of /codes + /codes/{slug} pending.

**GOVERNANCE SHIFT (2026-07-22, board-approved):** founder is now the **board**; Claude is the **CEO executing through launch**. Board approves vision (✅ road-to-launch plan approved — `~/.claude/plans/vivid-wibbling-bird.md`), pricing/positioning changes, and go/no-go at Checkpoint C; CEO decides the rest. Launch bar: pixel-perfect full product, not move-fast. Roadmap: P6.5 ✅ → P7 API → P7.5 Pro-feature completion (vanity slugs, expires/password enforcement, bulk) → P8 Stripe → P9 marketing → P10 hardening → Checkpoint C.

**P6.5 SHIPPED (2026-07-23) — dashboard cohesion + critical ops debt** (board's P6 notes + pulled-forward findings). U1 `e0cdeda` (+6 tests → web 184): global scans-only AreaChart on `/codes` (owner-wide scan_daily query, `sumDailyAcrossCodes` JS summing — PostgREST aggregates off; uniques deliberately not charted, cross-code summing double-counts; max_rows=1000 truncation flagged for P8 RPC revisit), shared `RangeSelector` extraction, and a real app shell: `(app)/layout.tsx` + sticky `AppNav` (Studio|Codes active states, account cluster; **layout guard is defense-in-depth only — every page keeps its own getClaims(), hard rule**), studio top-bar trimmed to KitBar, preview-stage sticky offset re-measured (57px nav + 32px pad → `top-[89px]`, verified scrolled via a throwaway measuring harness). U2 `eb59ff9`: `/u/{slug}` fallback page (was a live 404 — the Worker 302s paused/archived/unknown/Supabase-down there indistinguishably): static SSG (empty `generateStaticParams` — the Next 16 way), neutral non-leaking copy ("isn't live right now"), 64-char slug echo, CTA → /login, `proxy.ts` matcher excludes `u/[^/]+` precisely. U3 `7625dfd`: nightly DB backup workflow (`.github/workflows/backup.yml`, 07:17 UTC dump → 14d private artifact — **blocked on board pasting `gh secret set SUPABASE_DB_URL`**, session-mode :5432); Supabase Auth **site URL flipped localhost→https://www.qrcdn.com** (dashboard, additive, allow-list verified intact — magic-link emails now default to production); env quick-refs hardened. ⚠️ **Board flag: Supabase org quota banner escalated — "projects will be restricted from 21 Aug 2026" if the org stays over quota (org-level, would hit QRCDN). May pull the Supabase Pro upgrade ahead of D15's "first customers" trigger — board/billing call.** Close-out: skeletons re-matched to the new page structure. Live verification + board demo note: this session.

**P7 SHIPPED (2026-07-23) — public API live on production, full matrix green.** Spec: `docs/guides/p7-api.md`. A0 `0aff4f9` (CI burn cut ~75-85%: path-gated rls.yml, cancel-in-progress, docs-ignore — docs-only pushes proven to trigger zero runs). A1: backup armed zero-transcript (Management-API DB password rotation + session-pooler `SUPABASE_DB_URL` secret; first artifact pending Actions restoration). U1 `05d5593` (+22 lib tests, migration 008 + 13 pgTAP; caught the fresh-stack table-grant gap on post-004 tables), types `5d87776`. U2 `b6f18fe` (+25: owner-scoped codes-core — the API's only tenant boundary under the admin client; personally audited every chain). U3 `8189b15` (+26: bearer pipeline 401-CRC-gate/403-plan/429-quota/`after()` last-used; revoked ≡ unknown; live PostgREST bytea round-trip gate passed pre-done). U4 `91b1173` (+19: /api-keys reveal-once mint, two-step revoke, month usage, honest free upsell, "API" nav). U5 `10429a6`: /developers static+indexable at the floor register, shapes mirrored from route code. **Live matrix on production (throwaway pro test user, cascade-deleted to verified zero residue; founder account untouched):** 401/401-CRC/403-free → 201 create `QFS279E` → scan 302 → **API retarget followed by the very next scan** → pause → post-60s-cache scan 302 → `/u/QFS279E` → analytics live/rollup split correct → revoked 401 byte-identical → `api_usage` = exact authenticated-request count. Teardown hiccup owned: the scripted teardown ran with empty env and its inputs got cleaned prematurely — recovered via identity-checked SQL deletes, residue verified zero across all tables. Tests now: web 295, monorepo 489 vitest + 53 pgTAP assertions. CI re-proof of P7 commits queued for Actions restoration (billing freeze — board decision pending: spending limit vs Aug 1 reset). Founder checkpoint: /developers + /api-keys review at leisure; P7.5 (vanity slugs, expires/password enforcement, bulk) is next.

**⚠️ INCIDENT + CORRECTION — GitHub Actions billing exhausted (2026-07-23).** All Actions runs since late P6.5 fail instantly: "job was not started because recent account payments have failed or your spending limit needs to be increased" — the free 2,000 min/mo is burned (the board's hunch was right; ~40 runs/2 days, each booting the Supabase Docker stack). **Correction to this file's P6.5 entry: the CI runs for `e0cdeda` and `e9ba32e` never actually started — my watchers attached to older in-flight runs, so earlier "CI green" claims for those two commits were wrong.** Their code remains verified (full local lint/typecheck/test suites, production build, live production checks) — the gap is CI re-proof only, queued for when Actions resume. Process fix: runs are now watched by exact commit SHA, never "latest". **A0 shipped (`0aff4f9`)**: rls split into a path-gated workflow (`supabase/**` only), cancel-in-progress on both, docs-only pushes skip CI — post-resume burn drops ~70-85%, comfortably inside the free tier at our mix. **Board decision: raise the Actions spending limit now, or wait for the Aug 1 reset** — execution continues either way on the standing local verification bar (+ scratch-Postgres hand-verification for SQL, the P6-U1 precedent; Docker Desktop absent locally so pgTAP itself is CI-only). **A1 done (shell-only, zero-transcript):** DB password reset via Management API (nothing else consumed the old one), session-pooler `SUPABASE_DB_URL` secret set, temp material destroyed; first backup artifact pending Actions restoration (dispatch + nightly schedule both fail-fast on billing until then). Org-quota flag: board-handled (external project transferring out; moot before 2026-08-21).

**P8 SHIPPED (2026-07-30) — Proof & Protection. Stripe deferred to P8.5.** Spec: `docs/guides/p8-proof-protection.md`. **The board asked whether Stripe could be deferred; the answer is yes and it was verified by grep, not memory**: zero application code, no `package.json` entry, no commit in the entire history mentions it, and `profiles.plan` has no app write path at all (`authenticated` is revoked; pgTAP proves `42501`), so Stripe would be its *first* writer. It blocks nothing. The more useful finding: the original P8 was the wrong next build anyway — P7.5-RT proved **we ship blind**, so this phase bought proof and protection before making the product chargeable.

**U1 e2e `ffd3dae`** — 14 Playwright tests over the money path against `next build`+`next start` (never `next dev`: the bundled action registry is the thing under test) and real cloud Supabase; auth via `generateLink`→`/auth/confirm` (real product code, no mailbox); outage detection is a blanket "no `next-action` response may be 5xx" listener; live Worker leg asserted (302+no-store+Location). **Proof performed twice — by the implementer and independently by me**: reintroducing `export type { QrCode }` leaves `next build` GREEN and makes the suite FAIL (mint blocked, 12 tests never ran); reverting restores 14/14, fixture user auto-deleted. Four-layer never-touch-founder-data guardrail (manifest-only teardown; reap of `@e2e.qrcdn.test` — an IANA-reserved TLD used as an allowlist; a vitest guard on email literals; specs never touch a row they didn't mint). **U2 Sentry `f4e18fe`** in apps/web, inert without a DSN (the agent *measured* that `withSentryConfig` unconfigured both warned and made an outbound telemetry call, so the wrap itself is gated); scrubber strips auth/cookie/destination-shaped data per D3. **U2 reversal `ac99fa9` — Sentry REMOVED from the Worker after measurement**: it took the bundle **13.9 KB → 515.7 KB (37×)**, partly via the `nodejs_compat` flag it requires, on the most latency-critical path in the product, for nothing until a DSN exists. Replaced with Cloudflare-native Workers Logs + a `console.error` on ingest's swallowed catch — same visibility, zero bytes. Worker redeployed (`b9582c44`, 13.53 KiB / 4.38 KiB gzip) and verified live. **U3 canary `125e96b`+`ccde74b`** — hourly, asserts 302 + no-store + not-`/u/`; deliberately does NOT assert the destination so a legitimate retarget never cries wolf; dedup issue on failure, auto-close on recovery; **needed no dedicated code and no free-plan slot** (watches an existing code via a repo variable). **U4 rate limiting `1384969`** — migration 009 mirroring the `api_usage` precedent (definer RPC, revoked from PostgREST roles, pg_cron cleanup), per-IP on `/p` and per-user on Studio mutations, fails open only when the limiter itself errors; **CI + the real pgTAP suite both green**; cloud verified (both cron jobs registered, `check_rate_limit` revoked from `authenticated`). **U5 `98566c4`** — Safe Browsing (in `codes-core.ts`, so it covers the API path too) + Turnstile (Supabase verifies natively; no siteverify of our own), both staged inert and fail-open by construction; inert-ness verified live via DOM inspection.

**Bug found and fixed by the new suite on its first run (`c87974b`):** closing the Access dialog left its dropdown open — `preventDefault()` stopped Radix's focus race *and* stopped the menu closing at all. Jank for a person; in automation the stray popover swallowed every later click (deterministic 30s hang, and it broke the *next* test's unrelated button). Fixed via controlled state, and **the e2e workarounds were deleted rather than kept**, so the suite keeps proving the fix — verified by re-running with them removed, 14/14.

**Tests now:** web 449 + worker 138 + qr-engine 53 + shared 23, plus pgTAP (rls/rollup/api_usage/rate_limits) and 14 e2e. **Actions burn (measured per-run):** CI 55s · E2E 92s · RLS 78s · uptime 12s · backup 36s → post-private-flip floor ≈ **750 of 2,000 free min/mo** (uptime 720 + backup 30), which is exactly why the canary is hourly. **Board items, none blocking:** Sentry is the one new account (free, no card — code lands inert); Turnstile + Safe Browsing keys switch those on; `www.qrcdn.com/` still serves the create-next-app scaffold (P9's job, flagged early).

**P9 SHIPPED (2026-07-30) — marketing site.** Spec: `docs/guides/p9-marketing.md` (as-built amendments appended at close — read those for the full deviation record). Board locked four scope decisions before work began: Pro CTA pre-Stripe = "Start free" → /login with an honest billing-opens-at-launch line · core pages only (landing, /pricing, /terms, /privacy, designed 404; FAQ = pricing accordion, contact = footer mailto) · legal CEO-drafted honestly now, counsel review queued to P10 · `/explore` deleted at end of phase after harvest. Anonymous playground download (SVG/PNG, no account) approved via plan. Review cadence = the P4 pattern: units land on main and deploy; the scaffold `/` meant every deploy was a strict upgrade; launch *moment* stays Checkpoint C's.

**Execution order was U1 → U3 → U4 → U2 → U5 → U6**, not the spec's numeric layout — so by the time U2's board review round 1 happened, pricing and legal already existed too, and round 1 reviewed a materially complete site rather than landing in isolation.

**U1 `649f5ee`** — foundation: `SiteNav`/`SiteFooter` chrome, `app/(marketing)/layout.tsx`, a designed `app/not-found.tsx` (glass card, mono receipt line, restrained copy, CTA home), `metadataBase`, icons (`app/icon.svg` + `app/apple-icon.png`; stock `favicon.ico` deleted rather than kept as a third convention), and the brand-image pipeline (`apps/web/scripts/generate-brand-images.ts` — D4's anticipated "PNG via `@resvg/resvg-js`" line, now real: hand-laid SVG string → `Resvg` raster with committed Inter TTFs → self-verifying zxing decode before the file is ever written) plus the homepage OG. Proxy matcher v1 (`/explore` still alive at this point).

**U3 `1109480`** — pricing: `apps/web/lib/pricing.ts` derives every comparison-matrix row from `PLAN_LIMITS`/`PRICING` (annual savings pct computed from the constants, never a literal), co-located vitest proving the derivation (change a limit, the row changes). `/pricing` renders the full matrix, the annual-default toggle, the trust FAQ accordion, and the honest pre-Stripe CTA line.

**U4 `12bdd5b`** — legal: `/terms` + `/privacy` at the floor register (`components/marketing/legal-shell.tsx`), the CEO-drafted content (D3/D14-grounded) verbatim in substance, five `[COUNSEL: ...]` review flags left as source-adjacent JSX comments (confirmed absent from the served HTML by grep, not just by reading JSX). **Found and fixed during verification: privacy's retention sentence rendered "365days" with no space** in production HTML — a JSX whitespace-collapsing gotcha (an expression immediately followed by same-line text loses its leading space when the expression's own preceding sibling is another expression rather than plain text); caught by curling the production HTML rather than trusting a screenshot, which read fine at a glance. **Also traced to this commit: the "E2E transient + single-use-token cascade" finding.** The E2E check run for this exact commit needed a job-level re-run to go green — GitHub run `30583216675` shows "Re-run triggered" in its run detail (the pre-rerun attempt's own log isn't inspectable without a GitHub sign-in this session didn't have), consistent with the failure signature this phase's U6 unit fixes: `global-setup.ts` minted the sign-in suite's one magic-link token into the manifest, tokens are single-use, and money-path.spec.ts's serial describe block retries the WHOLE group from sign-in on any mid-suite failure — so whatever the original flake was, Playwright's own in-job retry was structurally guaranteed to die at a dead token rather than get a real second chance, forcing the human-triggered rerun this run's history shows. Fixed at U6 below.

**U2 `14b926d` + fix `d2af287`** — landing: the atomic swap (scaffold `app/page.tsx` deleted, real `app/(marketing)/page.tsx` in), Hero (v4.2 bones + `AccentText` — built at P4 for P9, unused until now — wrapping "Every destination.") → the live playground (`ColorField` picker, real shape swatches, the real scannability instrument fed genuine engine metadata, `ArtifactStage` staging, anonymous SVG/PNG download) → framed product windows refreshed to current product truth (`StudioWindow`, `DashboardWindow`) → the never-dies retarget moment → API section → a compact pricing pair. **Board review round 1 on live production is with the board now** (both themes + mobile) — no reactions recorded here yet; none invented. **Orchestrator review ahead of round 1 found both instrument-bearing surfaces — the playground's default, the brand-system section's `StudioWindow` mock — opening on a warning state in dark mode**: both staged their QR preview on `brandQrStyles.precision[mode]`, which flips ink AND paper with the SITE's color scheme, so a dark-mode visitor's very first scannability reading criticized our own default (and the brand-system section explaining that the instrument keeps you honest depicted it flagging our own showcase style). Fixed (`d2af287`): both now stage on an explicit, non-transparent white paper mat with the D13-locked light ink, independent of site theme — print-true, matching the real Studio's own default new-kit style. Codified as a standing rule in `docs/guides/design-system.md` (added at U6): surfaces bearing the instrument or an export stage on their own paper mat; decorative theme-flipped inversion stays hero-only (the `ScanNetwork` tile, which carries no instrument and no download, was never the bug and is untouched).

**U5 `19022d6`** — cleanup & unification: executed the migration table exactly, re-grepping at execution per its own "re-verify" instruction rather than trusting the table as originally drafted — real deviations found, recorded in the spec's as-built amendments and `design-system.md`'s component inventory: `HeroBackdrop` → `components/brand/backdrop.tsx` landed with **6** real importers (not the 5 planned — U1's `not-found.tsx` and U2's `hero.tsx` didn't exist when the table was drafted), `brandQrStyles`/`brandQrBackdrop` → `lib/brand-qr.ts` with **5**, `QrSvg` → `components/qr/qr-svg.tsx` with **0** (kept anyway, as the neutral QR-render primitive), `lib/explore.ts`'s brand-switcher exports (`BRANDS`/`isBrand`/`brandCopy`/`Brand`) deleted outright rather than moved. `/developers` moved into `(marketing)` (URL unchanged, drops its hand-rolled header for shared chrome). Proxy matcher v2 (drops `explore`). `app/robots.ts` (allow-all, disallow `/api/` + `/auth/`, sitemap URL — `/login`/`/u`/`/p` deliberately NOT disallowed since their page-level noindex needs crawl access to be seen) and `app/sitemap.ts` (the 5 marketing routes) are live. `@vercel/analytics`'s `<Analytics/>` mounted in root layout (cookieless, Hobby-free 50k events/mo — the dashboard-side toggle is a separate ops step, not code, and stays open).

**U6 (this commit)** — proof & docs. `apps/web/e2e/marketing.spec.ts`: 11 plain, independent tests (no serial machinery, no auth, no fixture-user dependency) — all 5 public pages 200 with zero `a[href="#"]` placeholders, nav "Start free" → /login, an unknown route hits the real custom 404 at a real 404 status (not Next's generic default), `/robots.txt`/`/sitemap.xml` respond and cross-reference each other, `/pricing`'s rendered numbers asserted against the exact same `PLAN_LIMITS`/`PRICING` imports the page itself reads from, and the landing playground's scannability instrument opens clean — a standing regression guard on the `d2af287` fix above. **E2E retry-resilience fix**, closing the U4 finding: `apps/web/e2e/auth-token.ts`'s `mintSignInToken` mints a fresh magic-link token at test time, on every sign-in attempt, instead of `global-setup.ts` minting one token for the whole run; the fixture manifest now carries only `userId`/`email`/`createdAt`. **Proved directly, not just argued**: two `mintSignInToken` calls in one process against one throwaway user produced two distinct tokens, both exchanged successfully via `/auth/confirm` (simulating attempt 1 + a serial-group retry's attempt 2) — while re-exchanging the first token a second time was correctly rejected, confirming both the bug's premise (tokens really are single-use) and the fix (minting fresh sidesteps it every time). Full suite green locally against a production build: 25 tests (14 money-path + 11 marketing), 20.0s wall-clock.

Marketing routes all render `○ (Static)` in `next build` output — verified this unit: `/`, `/pricing`, `/terms`, `/privacy`, `/developers`, plus `/robots.txt`, `/sitemap.xml`, `/_not-found`. **Flagged for P10, not fixed here (out of this unit's scope):** the hero's headline/subcopy/CTA (`components/marketing/hero.tsx`) are each wrapped in `Reveal` (`components/brand/magic.tsx`), which animates in on `whileInView` — a scroll-triggered pattern designed for below-the-fold sections that should wait for the user to scroll to them. The hero is already in the viewport at load, so this gates the very first paint of the page's most important content (the LCP element) behind an IntersectionObserver callback firing, rather than rendering it immediately — worth a mount-triggered (or no) entrance for the hero specifically, not a scroll trigger with nothing to wait for. **Legal counsel review remains queued to P10** (D3/D14-grounded content shipped honestly at U4, not attorney-reviewed — flag still open, nothing new here). Tests now: web 467 + worker 138 + qr-engine 53 + shared 23 (681 vitest), plus pgTAP (rls/rollup/api_usage/rate_limits) and 25 e2e (14 money-path + 11 marketing). **Board review round 2 is next** — phase closes on that.

**P7.5 RED-TEAM (2026-07-29) — found a production outage the whole gate stack missed.** Driven live in a real authenticated Pro session (throwaway account, magic-link token minted via the admin API — the founder's account and entitlements were never touched; cascade-deleted after, residue verified zero).

🔴 **CRITICAL, FIXED (`758511f`): every Studio server action had been returning 500 in production since `b6f18fe` (P7-U2).** `ReferenceError: QrCode is not defined` at module evaluation of the SSR chunk. Cause: `export type { ... }` from a `"use server"` file — such a module's export list becomes a runtime server-action registry and the bundler emits a runtime binding for every exported name, including ones TypeScript erases. **Nothing in our stack could see it**: `tsc --noEmit` passes (the types are valid), `next build` passes (bundling succeeds), unit suites pass (they call the cores directly, never the bundled action module), and every live check since P7-U2 went through `/api/v1`, which doesn't import code-actions. So create/retarget/pause/access from the Studio UI, plus brand-kit and API-key actions, were all broken in production for days while every gate stayed green. Fix: types moved to their owning lib modules (`codes-core`, new `lib/brand-kits.ts`, `lib/api-keys.ts`), all as `import type`. **Guard added** (`lib/use-server-contract.test.ts`): a source-level assertion that every `"use server"` file exports async functions only — it immediately caught two further instances I had not found by hand (`studio/actions.ts`, `api-keys/actions.ts`). **Lesson: this is precisely the gap Playwright e2e exists to close — pull it forward into P8 rather than leaving it at P10, since P8 is the money path.**

🟠 **CSV formula injection, FIXED (`8ad0ebb`):** bulk-export fields beginning `= + - @` were written raw, so a code name like `=HYPERLINK("http://evil","Invoice")` became a live formula in whoever opened the file (CWE-1236). RFC-4180 quoting — which the export already did correctly — does not prevent this. Now apostrophe-prefixed; `csvField`/`buildResultsCsv` moved to `lib/csv.ts` to be testable at all (+14 tests). Low risk today, real once exports are shared.

🟠 **Display lie, FIXED (`f9a5c1f`):** `status` stays `"active"` when `expires_at` passes, so an expired code rendered **"Active"** in both the rail and the /codes table while its scans landed on `/u`. New `lib/access.ts` folds expiry into the label (order mirrors the Worker's decision table; boundary test pins the same `>=`). Also: password protection was invisible in both lists — now a labeled "Protected" tag. Also: every Access-dialog error read "try again", masking validation problems (and, as it turned out, the 500) — mapped to actionable copy.

✅ **Passed adversarially:** XSS payload as a code name renders as escaped literal text (0 injected elements, `window.alert` untouched); `javascript:` destination rejected; 90-char name rejected; blank/whitespace lines skipped; partial success order-preserved; **no scrypt hash anywhere in the DOM or inline scripts** (the U2 invariant); `datetime-local` → UTC conversion correct across a year boundary *and* a DST change (local `2026-12-31 23:30` → stored `2027-01-01 04:30Z`, using EST not the current EDT offset); empty save rejected server-side.

**P7.5 SHIPPED (2026-07-23/29) — every Pro pricing row now exists.** Spec: `docs/guides/p7.5-pro-features.md`. U1 `498ac62` (worker 118→138): expiry + password-wall in the redirect decision (order: paused → **expired** → protected → destination; expiry outranks password so a dead code never invites a guess), `/p/{slug}` response builder, additive KV fields (**the hash never reaches KV** — only a derived boolean), deployed `69c13ce7`. U2 `b180b5a` (+110 tests): `lib/passwords.ts` (async scrypt — never sync, it blocks the loop under Fluid compute; **explicit 64MiB maxmem** because N=2¹⁵·r=8 needs exactly Node's 32MiB default; self-describing `scrypt$N$r$p$…` so future cost bumps never rehash), the `toKvRecord` **KV-wipe fix**, `setCodeAccessCore`, the raw-hash-never-crosses-the-boundary invariant (studio page switched off its duplicate query so stripping lives in one place), `/p` unlock page + the app's first public server action (TOCTOU re-fetch, indistinguishable failures, constant delay). U3 `eb5972f`: vanity slugs on the **narrow** charset (print-confusability applies to human picks too), single-attempt insert → `slug_taken`. U4 `63e5187`: bulk core with sequential **partial success** + CSV. Docs `1a8a290`.

**Live matrix (2026-07-29, production, throwaway pro+free users, cascade-deleted to verified zero residue):** vanity create (lowercase `p75test` → `P75TEST`, response carries the new access fields) → scan 302 ✓ · reserved `ADMIN` → `invalid_slug`, **live-confirming the blocklist is a dead tripwire** (isValidSlug rejects first — recorded in D12, pinned by a test for any future charset widening) · duplicate → `slug_taken`, no silent retry ✓ · **retarget a protected code → next scan still hit `/p`** — the single most important result of the phase, proving U1+U2 together, since before the `toKvRecord` fix the retarget would have wiped protection and sent scanners straight past the password ✓ · `/p` in-browser: wrong password → inline error, correct → forwarded to destination ✓ · past expiry → `/u` **not** `/p` (decision order live) ✓ · **clear expiry → code revived, and returned to its password wall, not the destination** — "your code never dies" proven ✓ · bulk 3-line batch via the shipped core against the real DB: 2 minted, 1 bad line failed in place, order preserved, bulk-created code scans ✓. Untested-by-design: the two Studio dialogs (Access, Bulk) need an authenticated session — founder review; and `vanity_slugs_not_available`/`plan_required` are structurally unreachable via the API (it's Pro-only and Pro has both entitlements), so they were **removed from the public error table** rather than documented as codes no integrator can receive.

**Tooling change:** the Supabase MCP was withdrawn (board reassigned it to another project). No replacement needed — the Management API covers raw SQL and advisors with the CLI's existing keychain token; migrations use `db push`, typegen uses `--linked`, fixtures use the admin client. Verified live before continuing.

**P7.5 Part A (public-repo hardening) COMPLETE.** Board made the repo **public** for free Actions (private again before launch — added to the P10 checklist with a visibility-assumption re-audit). Immediate consequence found + fixed: two unencrypted DB-dump artifacts had become publicly downloadable (exposure minimal — one founder profile + own test scans — but the pattern was broken). **Purged both artifacts (zero remain), backup.yml now encrypts dumps (AES-256-CBC/PBKDF2, `BACKUP_PASSPHRASE` secret + .env.local copy, plaintext removed pre-upload); dispatched run verified: artifact is genuine ciphertext (`Salted__` magic).** First real backups exist at last. Git history scanned for public exposure: clean (only the `sb_secret_x` test fixture). **CI debt cleared**: rerun CI @ `10429a6` **green**, rerun RLS @ `05d5593` **green** — the full pgTAP suite (rollup + api_usage) has now truly run against a fresh stack, confirming the scratch-Postgres hand-verifications. Fork-PR posture documented in infra.md (no secrets to fork PRs; backup is schedule/dispatch-only; never attach secrets to pull_request triggers while public). Part B (vanity slugs, access controls, bulk) in flight — spec at U5.

Historical:
Founder reviewed the three explorations and chose "Precision instrument" as the anchor, refined toward an Apple-esque register per references lazy.so / genie.io / stellar.work. The reference formula (already extracted): one enormous plain-spoken headline owning the viewport · extreme restraint (single accent, hierarchy from scale/space) · quiet gray subcopy · one strong CTA · eyebrow-labeled benefit sections · product visuals in soft frames.

Iteration history: v1 (three directions) → founder picked precision + references → v2 (Inter display, restraint) → founder: "far too minimalist, zero design magic, hero looked broken at laptop viewports" → v3 rejected ("still nowhere close" — founder supplied his own broken-viewport screenshot + Genie/Pipeline/Stellar full-page references, mandated precision-only, transitions.dev, and the emilkowalski skills) → v4 reviewed (founder: massive improvement; first two sections appeared broken in his dev-tab view — root-caused to mid-compile HMR states, production build verifies clean; remaining sections needed the same bar) → **v4.1 (current, awaiting review on the PRODUCTION server localhost:3001)**: analytics rebuilt as a framed dashboard window with stat pop-ins + top-codes strip; pricing gained the monthly/annual sliding toggle (annual default, $8/mo framing), trust FAQ accordion (transitions.dev pattern), structured footer. Review each round on `next start -p 3001`, never the dev server. v4 notes: D13 lock executed precision-only; scan-network hero artwork (Pipeline-style traces + cycling destination chips); Genie-style framed product windows (studio + dashboard); taste toolchain installed (9 agent skills under .agents/skills/); motion token system; review-animations gate run and its Block findings fixed (transition-all removal, chip translateY entrances, reduced-motion gaps, token-consistent easings). Superseded v3 notes: atmosphere layer (violet glow + QR-module grid texture), two-column hero fitting the 1440×900 fold, glass gradient-border QR card with a live retargeting demo, motion system (`motion` pkg; entrance stagger + scroll reveals, reduced-motion aware), ModuleMark eyebrow glyphs, functional ink-color studio control, gradient chart fill, glowing Pro pricing card + "never dies" guarantee strip.

In flight:
- After founder approves v2 → run the D13 lock protocol: (1) copy precision's Layer 0/1 values into `:root`/`.dark` in `globals.css`, (2) delete `app/themes/*.css` + their imports, (3) remove `data-brand` plumbing from explore pages or delete `/explore` entirely, (4) remove unused font loaders from `app/fonts.ts` (keep Inter + JetBrains Mono), (5) update `brandQrBackdrop`/`brandQrStyles` consumers. Semantic token names never change (D13).

**P9.5 OPEN (2026-07-30) — The Ascent.** Spec: `docs/guides/p9.5-ascent.md`. Board round 1 on P9: directionally great, far from Resend-level — full polish campaign approved with a pacing mandate (quality over speed, chunked board reviews). Board locked: **open source approved, MIT** (P10's flip-private REVERSED; README/LICENSE/SECURITY/CONTRIBUTING land in T6) · archetype comparison now, named-vendor pages post-launch · blog bylined Will Gibson but company-forward voice · two-register copy principle. Planning found three correctness defects (Recharts on the landing against the design guide's own rule; hero LCP SSRs opacity:0; ScanNetwork chips at 7.3px on md/lg) and the magic-link root cause (`/auth/confirm` GET consumes single-use tokens → mail-scanner prefetch burns them; fix = token_hash+type=email template + scanner-proof interstitial). New D16 incoming: dashboard is authoritative for `[auth]`; `supabase config push` banned (no dry-run; committed site_url=localhost would clobber production auth). Sequence: T0 auth → T1 system → T2 artifact gate → T3a/b/c landing chunks → T4/T5 → T-F feature pages ×2 → T6 changelog/status/OSS + T-R blog/help → T7 product quick wins → T8 close.

**T3a (this commit) — landing chunk 1: hero v4 + section-system migration.** Spec: board-locked recipe rounds 2-4, copy deck v3 (`p95-copy-deck-v3.md`), the A1-R2 orbit-dial reference artifact. Hero rebuilt to the v4 recipe: no eyebrow, two-line H1 ("The modern" / `AccentText`-wrapped "QR platform."), new sub, both now riding the bumped fluid type scale (`--text-display` 44→88 raised to 48→94 over 360-1440px, `--text-lede` 17→20 gentled to 17→19 — globals.css, doc'd in design-system.md's new "Landing copy & hero v4" section) instead of static Tailwind breakpoint classes. New `components/marketing/pillar-strip.tsx` closes the hero as a fourth `hero-enter` stagger step: five real `<a>` doorway chips (four in-page anchors, one external repo link). New destination-identity palette (`--dest-1..4`, `--dest-1` = `--primary`, 2-4 amber/teal/rose, mapped through the original `@theme inline` block) is scoped ONLY to hero/network destination identity, never UI chrome — D13's single-accent lock is unchanged, this is additive. `ScanNetwork`'s chips/flowing-packet now tint per-destination via a shared label→hue map (`components/marketing/destination-hues.ts`, also consumed by the new `<md` artwork); `QrTile` (extracted to its own `qr-tile.tsx` to avoid a circular import with the new orbit island) now carries the marketing site's own URL as payload (`HTTPS://WWW.QRCDN.COM`, scanning the hero lands you on the page you're on) with the slug caption removed, on every stage variant; the old "destination updated live" mono tagline is gone from every breakpoint. New `components/marketing/orbit-stage.tsx` replaces the `<md` chip-pile fallback: a single 7px packet rides a ring between three destinations (layered HTML+SVG, not foreignObject — the reference artifact's own clipped-shadow bug and fix), ported from the reference's vanilla-DOM engine to React refs + rAF (packet/trail mutated imperatively, bypassing React re-renders; chip/node/count highlighting stays declarative state, consistent with the rest of the codebase's Tailwind-hue-class-lookup convention). Trail opacity is set via inline style, not the SVG attribute, replicating the reference's own documented fix for a real CSS cascade bug (a stylesheet-declared `opacity` always wins over a presentation attribute). Dwell timing is asymmetric per the board's ask (first hop at 1400ms so motion lands before a visitor scrolls past; every hop after, 2200ms); reduced motion parks fully on the first destination with zero timers ever started. Found and fixed in passing: `Eyebrow`'s `index` prop (built at T1b, unused in production until this unit) rendered its ordinal with a trailing em dash (`"01 —"`) — caught before it ever shipped live, fixed to a plain gap (no separator glyph needed; the ordinal's own lighter tint already reads as a secondary cue).

Every existing landing section (studio/playground, brand system, dynamic codes, analytics, API, pricing teaser) is now migrated onto the T1 `Section`/`SectionHeading`/`SectionBody` primitives with the deck's IA mapping (variant/surface/id, surface alternation tint→floor→default→tint→floor→default→default→default, hairlines only between same-surface neighbors) and carries the deck's eyebrow ordinals/heads/ledes/mono strips — bodies (StudioWindow, DashboardWindow, the curl/JSON example, the pricing cards) are untouched this chunk, per the deck's own T3a/T3b split. New `components/marketing/how-it-works-section.tsx` (section 01, rebuilt fully: three steps with a reused `ModuleMark` glyph per step, a mono pipeline strip) and `closing-section.tsx` (rebuilt per the deck's CLOSING block) round out the page. New `components/marketing/mono-strip.tsx` extracts the "developer proof line" visual (originally one-off in dynamic-codes) so every section's mono strip shares one register; new `lib/marketing-flags.ts`'s `FEATURE_DOORWAYS_ENABLED` (default false) gates every doorway into a `/features/*` page that doesn't exist until T-F, keeping the "real hrefs only" rule intact — doorways already pointing at real pages (API's "Read the docs" → /developers, pricing's "Compare everything" → /pricing) are not gated. `Section` itself picked up `scroll-mt-24` (new anchor targets from the pillar strip needed it to clear the sticky nav; verified live — a jumped-to heading clears the nav by ~183px). Sections 05 (guardrails) and 08-10 (comparison/open-source/manifesto) are intentionally out of this chunk's scope (T3b/T3c), so the live ordinal sequence currently skips from 04 to 06 to 07 to 11 — expected, not a bug.

One deck deviation, flagged as instructed: the pricing lede's entitlement number renders as the digit "3" (`{PLAN_LIMITS.free.dynamicCodes}`) where the deck's literal text spells out "three" — required by the hard rule that every entitlement number renders from the `lib/entitlements.ts`/`lib/pricing.ts` imports, never a hand-typed literal (spelling out the word would have been exactly that literal). No other deviations. Verified: `pnpm lint && pnpm typecheck && pnpm test` all green, `pnpm build` keeps `/` at `○ (Static)`, live production-build review (`next start`) at 390/768/1024/1440 in both themes — H1 never wraps, no console errors, all four dest tokens confirmed distinct via computed-style inspection in both modes, orbit engine's hue/count/tick mechanism confirmed via DOM inspection (screenshot-only verification is unreliable here per this file's own browser-pane testing note — rAF freezes AND, newly noted this unit, programmatic scroll doesn't repaint in the hidden pane either; resizing the viewport to the full page height instead of scrolling was the workaround). e2e (`apps/web/e2e/marketing.spec.ts`): hero h1 asserted on raw served HTML (no inline `opacity:0` anywhere in its markup) and on `textContent` (regex-tolerant of the two-line markup's lack of a literal space between spans), pillar strip asserted at 5 links, tagline string asserted gone — full suite not yet re-run post-edit in CI, queued with the push.

**T3b (this commit) — landing chunk 2: product-story bodies + board round 5 hero fixes.** Spec: `t3b-build-spec.md` (scratchpad). Rebuilt the section BODIES T3a left untouched, per the board's three body-level notes ("studio and brand system builders nearly identical", "dynamic codes very bland, no real magic", "analytics: would love a bit more") — heads/ledes/mono strips stay exactly as T3a shipped them. Full pattern writeup: `docs/guides/design-system.md`'s new "Landing product-story bodies (P9.5-T3b)" section. Headline items: 02 (playground) gets a 3-preset shelf (Café Norte/Second Story/Personal) and a live contrast-ratio meter plotting the engine's own newly-exported `CONTRAST_ERROR_MIN`/`CONTRAST_WARN_MIN` (`@qrcdn/qr-engine`, additive — also swept every scannability issue message's em dash while in the file); 03 (brand system) retires `StudioWindow` (the board's exact "second builder" complaint) for `kit-contact-sheet.tsx`, one shared `QrStyle` rendered across 5 print artifacts at module scope, zero client JS; 04 (dynamic codes) gets `retarget-theatre.tsx` (new client island — visitor-tap-driven retarget demo in the hero orbit's own visual grammar, "hero watches, theatre drives") plus `state-cards.tsx` (three state mocks checked truthfully against the real `/u`/`/p` routes and, for "expired" — which has no distinct scan-facing page, `redirect-decision.ts` routes it to the same `/u` fallback as paused/archived — the real dashboard's `statusMeta` status pill, imported not re-typed); 06 (analytics) enriches `dashboard-window.tsx` in place (country/device breakdown bars, a third pulsing "Today so far" tile, the retention row moved in from a MonoStrip to the window's own footer chrome).

Real bug found and fixed, not just a testing artifact: the preset shelf's module-size tween initially used `motion`/`framer-motion`'s imperative `animate()` (rAF-driven) — its `onUpdate` never fires without animation frames, which a backgrounded/hidden tab doesn't produce, so a real user switching tabs mid-click would leave the preset visibly stuck at its old value forever. Caught via this repo's own browser-pane rAF-freeze limitation (already documented in design-system.md), confirmed as a genuine bug (not just unverifiable) by watching the preset chip silently fail to reach its target through the full built UI, then fixed by replacing `animate()` with a hand-rolled `setInterval` tween against a Newton-Raphson cubic-bezier solver matching `EASE_OUT` exactly — verified end-to-end afterward (state, DOM, and the preset's own "active" ring all correct). `motion.div`/`motion.circle` declarative `animate` props elsewhere (including the new theatre's own packet) are a different, already-precedented usage (`OrbitStage` gates its own state the same way) and are unaffected.

Folded in mid-unit: board round 5's four hero fixes (live-device review), all in the same commit since they touch the exact files this chunk was already reasoning about. (1) `OrbitStage`'s active destination chip was invisible on iOS Safari — traced to two compounding bugs: Tailwind's `border-dest-N/50`/`bg-dest-N/10` opacity utilities compile through `color-mix(in oklab, ...)` behind an `@supports` gate that Safari satisfies but then mis-paints as transparent (verified via a throwaway `tailwindcss@4.3.3` compile), AND those Tailwind classes set `background-color`/`border-color`, which have zero effect on an SVG `<rect>`'s actual paint in any browser (confirmed by computed-style inspection — only `fill`/`stroke` do). Fixed with a new `HUE_TINT` map (`color-mix(in srgb, ...)`, inline `style`, targeting `fill`/`stroke` for the SVG consumer and `backgroundColor`/`borderColor` for the two HTML-div consumers) and a color-mix-free `HUE_GLOW` (`drop-shadow(0 0 8px var(--dest-N))`, no alpha needed once blurred) — verified live in WebKit (`playwright install webkit`, a throwaway script at 390×844): the active chip's computed `fill`/`stroke`/`filter` all resolved to real, non-transparent `color(srgb ...)`/`drop-shadow(lab(...))` values post-fix, screenshotted for a visual second check. (2) Hero pillar strip now `hidden md:block` — it was pushing `ScanNetwork`/`OrbitStage` down; the board wants the orbit stage higher above the fold on mobile. (3) `QrTile`'s inner paddings tightened (card 14px→10px, qr-box 10px→8px, outer footprint untouched) so the printed code reads ~20% larger in area at the hero's own tile size, landing at the top of the board's "15-20% larger" ask — the qr-box padding trimmed here is presentational only, not the D6 scannability quiet zone (baked into `renderQr`'s own SVG output regardless). (4) H1 accent line drops its trailing period ("QR platform." → "QR platform").

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every workspace package (689 tests: 54 qr-engine + 138 worker + 23 shared + 474 web), `pnpm build` keeps `/` at `○ (Static)`. e2e additions: preset shelf (3 named presets + one applied and verified via its Module-size readout), RetargetTheatre (3 chips render, a tap flips the destination readout + receipt line, idle hint and retired-tagline caption present, all 3 state-cards present), analytics breakdown/today-tile/retention row, pillar strip's new desktop-vs-390 split. No deck deviations (this chunk didn't touch deck-governed copy — heads/ledes/mono strips are byte-identical to what T3a shipped).

**T3c (this commit) — landing chunk 3: credibility sections + heads v4. The 01-11 ordinal sequence is now complete.** Spec: `t3c-build-spec.md` (scratchpad), copy deck v3's heads-v4 amendment block. Four new sections fill the gaps T3a/T3b intentionally left open, plus the API section's body is rebuilt:

- **05 Guardrails** (new, `guardrails-section.tsx` + `guardrails-plot.tsx`) — an authored, zero-client-JS SVG plotting the REAL 2026-07-21 adversarial zxing decode campaign on its actual axis: effective knockout ratio (not a generic "contrast" axis — contrast is explicitly analytic-only per qr-engine.md's "Why decode round-trips cannot validate contrast," with no campaign pass/fail data to plot honestly). Two threshold lines (warn/fail) import `LOGO_EFFECTIVE_WARN`/`LOGO_EFFECTIVE_ERROR` directly from `@qrcdn/qr-engine` — both **exported this unit** (`packages/qr-engine/src/guardrails.ts`/`index.ts`, additive, same reasoning P9.5-T3b already established for `CONTRAST_ERROR_MIN`/`CONTRAST_WARN_MIN`; locked by a new guardrails.test.ts assertion). The pass/fail point clouds are a fixed, authored scatter (never `Math.random()`) honoring the guide's real documented boundary (pass ≤0.407, fail ≥0.418) — the figure's own caption states plainly that qr-engine.md records that aggregate boundary, not itemized per-combination results, so the plotted points illustrate the documented range rather than exact per-run values (the spec's own "plot honestly at the granularity that exists" instruction).
- **07 API — the console** (`api-console.tsx` + `api-console-tabs.tsx` replace the section's old single static code block). Three tabs (Create · Retarget · Analytics) sourced from the same `lib/api-reference.ts` data `/developers` renders — never a second hand-copied sample. Every pane is shiki-highlighted at build via the existing `CodeBlock`; the only client island is `ApiConsoleTabs`, a ~70-line `useState`-only visibility switch (native `hidden` attribute, `role="tablist"/"tab"/"tabpanel"`) that receives already-rendered server JSX as `panes[].panel` and never imports `lib/highlight.ts` itself.
- **08 Comparison** (new, `comparison-section.tsx`) — archetype columns (never a named vendor, per the board's standing lock), deck-verbatim cells (✓/✕/~ glyphs + short notes) in a real `<table>` (hand-rolled, not the vendored `components/ui/table.tsx` — that one ships `"use client"`, which would violate this section's zero-client-JS requirement). QRCDN's column carries a primary-tinted background/text treatment; mobile gets a horizontally-scrollable `overflow-x-auto` wrapper (verified: page `scrollWidth` stays pinned to `innerWidth` at 390px — the table scrolls, the page never does). The `$0 / $8/mo annual` price cell reads `ANNUAL_MONTHLY_EQUIV_USD` from `lib/pricing.ts`, never retyped. Footnote ("Category patterns, not claims about any specific vendor.") always renders, unconditionally.
- **09 Built in the open** (new, `open-source-section.tsx`, `id="open-source"`) — the visual is a REAL build-time excerpt of `packages/qr-engine/src/guardrails.ts`'s threshold-constants block: `lib/guardrails-excerpt.ts` reads the file off disk (`node:fs`, path resolved from `import.meta.url` so it's independent of the build's invocation cwd) and slices it by content anchor, never a hand-typed copy that could drift — proven by a new `guardrails-excerpt.test.ts` that asserts the excerpt contains the real, currently-exported constants and excludes code outside that block. The hero pillar strip's "open source" chip now anchors to `#open-source` instead of the external repo URL (the T3a-flagged switch point); `LearnMoreLink` picked up an additive `external` prop (plain `<a target="_blank">` instead of `next/link`) so "View the repo" keeps the same chevron-hover treatment as every other doorway link.
- **10 Manifesto** (new, `manifesto-section.tsx`, centered/air/tint) — `variant="centered"` (not `"band"`) is the one that actually triggers the real centering CSS (`globals.css`'s `[data-variant="centered"]` rule); the "band" look (tinted, full-bleed, no hairline) comes from `surface="tint"` + explicit `divider="none"` composed on top of it. Typography only: three commitments (claim + a separate small mono cite line, no dash glyph between them) plus the infra `MonoStrip`. Still well under the design system's "≤3 centered sections per page" budget (2 total: this one + `ClosingSection`).
- **Heads v4** (deck round 5 amendment): 02 "Design it here. It's yours." → "Try the studio right here."; 03 "One kit. Every code on-brand." → "Every code inherits your kit."; 04 "Print once. Point anywhere." → "Change the destination after printing."; 11 "Free forever means forever." → "Free codes never stop redirecting." Every landing e2e assertion matching an old head string is updated (`e2e/marketing.spec.ts`).
- **Surface/divider audit for the completed sequence**: 01 tint, 02 floor, 03 default, 04 tint, 05 default (the same neutral-pause role 03 already plays), 06 floor, 07 default, 08 tint, 09 floor, 10 tint (centered), 11 default, closing default — every `divider` set per the Section system's own rule (hairline only between same-surface neighbors). One necessary side-effect edit: `PricingTeaser` (11) now sits directly after Manifesto (10, tint) instead of API (07, default), so its own divider flips from the implicit default (hairline) to explicit `"none"`.
- **Small riders**: `app/u/[slug]/page.tsx`'s pre-existing em dash (flagged at T3b, out of that unit's scope) is fixed with the same comma restructure `state-cards.tsx`'s mirrored copy already used — that file's own doc comment updated to say both now agree, rather than left stale.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every workspace package (692 tests: 55 qr-engine + 138 worker + 23 shared + 476 web — the qr-engine decode round-trip suite also re-run directly per the playbook, since this unit touched `packages/qr-engine`), `pnpm build` keeps `/` at `○ (Static)`, and a `.next/static/chunks` grep confirms zero `shiki` leakage into client bundles despite the console's extra `CodeBlock` usages. Live production-build review (`next start`) at desktop/mobile, both themes, via the browser pane's own documented workarounds for its hidden-tab rAF freeze (this unit found and used a stronger fix than the prior "reset inline opacity" trick: `document.getAnimations({subtree:true})` were still re-triggering after a resize, so a scoped `<style>` block with `!important` overrides is what actually holds still for a screenshot — worth folding into that testing note if a future unit hits the same issue). e2e additions: guardrails plot (svg present, exactly 2 `stroke-dasharray` threshold lines), API console (Retarget tab click flips the visible `tabpanel` and `aria-selected`), comparison (4 columns + footnote), `#open-source` anchor + pillar strip href, manifesto's 3 commitments, heads-v4 strings. One safety-net catch worth recording: two new string literals ("PATCH", "QRCDN") tripped `lib/e2e-safety.test.ts`'s static slug-literal scanner (both happen to be all-uppercase runs inside the narrow `SLUG_CHARSET`) — fixed by asserting via regex literals instead of string literals (the scanner's own documented exemption — a regex is never a value sent anywhere, so it can't target a real row), not by weakening the guardrail; the same scanner caught a THIRD offender later (a test's own *name* containing "QRCDN" as a bare word), fixed by rewording the name rather than the same regex trick (a test name isn't asserted against, so there's nothing to swap for a regex — it just needed to not contain the literal).

**Post-push review round 1** (founder review of the pushed diff, before declaring the unit done) landed three more fixes, all in the same working tree before the final push: (1) the guardrails plot's own e2e assertion over-matched — `section.locator("svg")` also picked up the two decorative `ModuleMark` icons sharing the section (`Eyebrow` + `MonoStrip`), so "exactly 1 svg" was strict-mode-violating at 3 regardless of the plot's own markup; rescoped to the plot's accessible name (`role="img"` + its `aria-label`). (2) the same test's "pass"/"fail" legend assertions had the identical class of bug one level down — the plot's SVG carries its OWN "warn"/"fail" threshold-line labels, so an unscoped `section.getByText("fail", { exact: true })` matched both the HTML legend's span and the SVG's `<text>`; rescoped to the legend's own container (`figure > div` first child, the legend row, structurally before the plot-frame div). Both fixes are spec-only — neither the plot nor its data changed. (3) product fix, not spec: the comparison table's QRCDN column now leads the column order at `<md` (`comparison-section.tsx`'s `ComparisonTable` takes a `columnOrder` prop, rendered twice — `md:hidden`/`hidden md:block` — off the same `ROWS`/`COLUMNS` data, since native `<table>` columns don't support CSS `order` the way flex/grid items do) so the elevated column is visible without scrolling on a narrow viewport; a static, JS-free edge-fade hints at the remaining horizontal scroll. Desktop's column order (QRCDN last) is unchanged. The guardrails plot's caption also picked up a reviewer-directed copy change in the same round: "Actual campaign data. The gap between every pass and every fail is where the thresholds live." → "Real campaigns, real thresholds. The gap between every pass and every fail is where they live." **This is a real, flagged deck deviation** — the deck's own section-05 note quotes that caption verbatim in quotation marks the same way it quotes every head/lede/mono-strip string, and the original T3c build was byte-verified against it; the replacement text is not in `p95-copy-deck-v3.md`. Recorded here rather than folded silently into "no deck deviations" from the rest of this unit.

**T4 (this commit) — supporting surfaces: /pricing v2, legal alignment, /login value panel, 404.** Spec: `t4-build-spec.md` (scratchpad). The landing stayed untouched, per the spec's own explicit boundary — this unit is the four remaining marketing/auth surfaces.

- **`/pricing` rebuilt on the Section/token system.** Poster head (`titleAs="h1"` reaches `text-display`, the same page-title scale `/pricing`'s own doc comment always reserved for "the one true page-title context per page") with the exact spec lede, every figure interpolated from `PLAN_LIMITS`/`lib/pricing.ts` (never retyped, including the metadata `description`, which the pre-T4 page had hand-typed as a `$12/mo or $96/yr` literal — closed that gap while in the file). The existing `PricingPlans` toggle+cards drop in unchanged as the head section's body. New **banded feature matrix**: `lib/pricing.ts` gains `PRICING_MATRIX_BANDS`, a pure grouping over the existing `PRICING_ROWS` (no row dropped, no new claim — `pricing.test.ts` proves full coverage + no duplicates + no empty band) rendered as a hand-rolled `<table>` (not `components/ui/table.tsx`, which ships `"use client"` — same zero-client-JS reasoning `comparison-section.tsx` already established) with `sticky top-24` band headers, the same nav-clearance value `Section`'s own `scroll-mt-24`/`/developers`' TOC rail already use. **Real bug found and fixed via live browser-pane verification, not just argued**: the matrix wrapper's `overflow-x-auto` (copied from `comparison-section.tsx`'s precedent without re-checking whether THIS table needed it) silently forced `overflow-y: auto` too — CSS's overflow computed-value rule collapses any (visible, non-visible) axis pair to (auto, auto) — which turned the wrapper into an unwanted `position: sticky` containing block, pulling every band header down to `96px` from the WRAPPER's top instead of the page's and stacking rows on top of each other. Fixed by dropping `overflow-x-auto` outright (this table is only 3 short columns, unlike the 4-competitor comparison table — it doesn't need the horizontal-scroll safety net; cells wrap instead) and moving corner-rounding to per-cell classes. Verified three ways post-fix: `getBoundingClientRect()` shows all 14 rows in strictly sequential, non-overlapping document-flow order; scrolling the page (not the wrapper) engages `position: sticky` correctly on each header in turn; `document.elementFromPoint()` at the sticky header's screen position resolves to exactly the currently-relevant band (later DOM-order headers legitimately occlude earlier still-stuck ones at an identical rect — correct stacked-header behavior, not a rendering conflict) — confirmed at both a normal desktop viewport and 375px mobile (`document.documentElement.scrollWidth === innerWidth`, matrix cells wrap instead of forcing scroll). Closing out the page: a real `variant="band"` guarantee Section (the deck-04 mono strip verbatim) and a `variant="split"` FAQ (heading+aside left, the existing accordion right — satisfies `Section`'s own dead-measure-ban doc comment) and an air-rhythm closing per the spec's literal copy. `/pricing` stays plain-eyebrow, no landing ordinals, exactly as instructed.
- **Legal pages (`/terms`, `/privacy`) realigned onto the token system**, not rewritten in substance. `legal-shell.tsx`: outer frame is now `Section` (fluid `px-gutter`/`py-section`, replacing static `px-6 py-16 sm:py-20`) wrapping a `max-w-prose` column (the SAME 65ch measure, now the named `--container-prose` token instead of a raw arbitrary value) — deliberately NOT `SectionHeading`/`SectionBody` (both default to a scroll-triggered `Reveal`, and this shell's own doc comment has always said "no motion" — `/developers`' own precedent of `PageFrame` + a plain `<h1>` is what this now matches). Every mono-uppercase clause heading (`LegalSection`, `LegalCallout`, `LegalToc`, `LegalCrossLink`) moved onto the shared `text-eyebrow` token, replacing four slightly-different hand-tuned `text-xs`/`tracking-[0.12em]`/`tracking-[0.15em]` combinations with one — a real, disclosed simplification (the old 0.12/0.15em split wasn't a deliberate distinction worth preserving). Between-clause rhythm (`gap-10`/`pt-10`) moved to the fluid `gap-block`/`pt-block` pair. Effective-date line format is untouched, per the spec. **Full em-dash sentence audit below.**
- **`/login` gains a value panel at lg+**, existing auth card functionally byte-identical. The card block (wordmark, glass form card, `LoginForm`, mono sign-off) is the exact same JSX/classes as before, just given a `lg:flex-row` sibling: a small `QrTile` (payload `HTTPS://WWW.QRCDN.COM`, the shared component, unmodified), the three spec checks verbatim, and the mono sign-off. Below `lg` the panel is `hidden` (zero box), so the single-column experience is pixel-identical to before this unit — verified live at 1280px (panel visible) and 375px (panel absent, card unchanged). `login-form.tsx` was never opened for this unit; `git diff` confirms zero bytes changed. The two rendered em dashes on this page (the auth-error copy, the subhead) were swept the same way as the legal sentences.
- **404 rebuilt**: `app/not-found.tsx`'s h1 is now the `text-display`-scale "404" glyph itself (the "display-scale code glyph" the spec asked for), one line of copy below it, two real links (`Back home` → `/`, `Contact support` → `mailto:hello@qrcdn.com`). Zero client JS added — `SiteNav`/`SiteFooter` are pre-existing sitewide chrome, not something this unit introduced. Updates the one existing e2e assertion that named the old h1 text (`"This page doesn't exist."`) since that string moved to a `<p>`; the marketing e2e suite's own `mailto:hello@qrcdn.com` assertion needed a regex literal, not a string literal, to clear `lib/e2e-safety.test.ts`'s static email-literal scanner (same "PATCH"/"QRCDN" regex-exemption precedent T3c already used) — a real support address baked into served markup, not a test fixture, but the scanner can't tell the difference from a string alone.
- **Found in passing, correctly left alone (out of scope):** `app/layout.tsx`'s root `metadata.description` (P9-U5) has a pre-existing em dash and is what 404 inherits (it sets no override) — this is sitewide/landing identity copy, not one of the four target surfaces, so it wasn't touched. `/pricing`'s poster `SectionHeading` (like every other `SectionHeading` on the site, and like the pre-T4 `/pricing` page itself already did) defaults to a scroll-triggered `Reveal` on its h1 — the same class of "gates the LCP paint behind an IntersectionObserver" issue P9-U6 flagged for the landing hero specifically, but that flag was scoped to `hero.tsx` (P10), not extended sitewide, and this unit's spec didn't ask for it either; noted here rather than silently changed.

**Legal em-dash sentence audit (complete, old → new; meaning preserved, typography only).** Terms (7): "Printed codes keep working — we cap features" → "…working: we cap features"; "Keep your sign-in email accurate — it's how we reach you" → "…accurate; it's how we reach you"; "become read-only — you can't edit them" → "…read-only: you can't edit them"; "may pause a code — meaning scanners see a neutral… — when a destination endangers" → "…a code (meaning scanners see a neutral…) when a destination endangers" (double-em-dash parenthetical → parentheses); "write to us — we're reasonable" → "write to us. We're reasonable"; "serve them — that's all we do with them" → "…serve them: that's all we do with them"; "database is down — the redirect layer is independent" → "…is down: the redirect layer is independent". Privacy (9): "store a raw IP address — we keep a one-way hash" → "…address: we keep a one-way hash"; "Google profile — nothing else" → "Google profile. Nothing else"; "Coarse location — country, region, and city — derived" → "Coarse location (country, region, and city) derived" (double-em-dash → parentheses); "two unrelated hashes — we can count unique visitors" → "…hashes: we can count unique visitors"; "Aggregate daily counts — how many scans… by device type — persist" → "Aggregate daily counts (how many scans… by device type) persist" (double-em-dash → parentheses); "our auth provider) — that's what keeps you logged in" → "…provider). That's what keeps you logged in"; "and — once billing opens — Stripe" → "and, once billing opens, Stripe" (double-em-dash → comma pair); "writing to us — deletion is immediate" → "writing to us. Deletion is immediate"; "hello@qrcdn.com — a person reads it" → "hello@qrcdn.com: a person reads it". Verified against the actual prerendered HTML (`.next/server/app/{terms,privacy}.html`), not just the JSX source — every fix renders with correct spacing, zero missing/doubled spaces (the exact class of bug `d2af287`'s sibling incident, "365days", already burned this codebase once).

**Matrix band → row-count mapping:** Codes & limits → 1 (Dynamic codes), Design & export → 1 (Brand kits), Analytics → 2 (Analytics history, Scan geography), Access controls → 2 (Expiry/password/scheduling, Vanity short links — grouped with access rather than with API/bulk per `PricingPlans`' own existing feature-bullet grouping), API & bulk → 2 (API access, Bulk generation). 8 rows total, matching `PRICING_ROWS.length` exactly.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every workspace package (694 tests: 55 qr-engine + 138 worker + 23 shared + 478 web — two new `pricing.test.ts` cases for `PRICING_MATRIX_BANDS` coverage), `pnpm build` keeps `/`, `/pricing`, `/terms`, `/privacy` at `○ (Static)` and `/login` at `ƒ (Dynamic)` — byte-identical render-mode set to the pre-T4 baseline. Live production-build review (`next start`) at desktop/375px mobile, both themes, via the browser pane's documented workarounds (scoped `<style>` `!important` override for the frozen-rAF/no-repaint-on-scroll issues; `elementFromPoint`/`getBoundingClientRect` for anything scroll-position-dependent, since screenshots don't repaint on programmatic scroll in this pane). Full local e2e run (`pnpm test:e2e`, all three spec files against `next start -p 3100`): 42/42 green, including the three new/updated marketing.spec.ts assertions and the entire pre-existing money-path + auth-scanner-safety suites (unrelated to this unit, confirming nothing else broke), fixture created and torn down cleanly. No deck deviations (this unit's copy is spec-authored, not deck-governed) — one flagged spec-adjacent judgment call: the matrix band→row mapping itself (band NAMES are spec-verbatim; which existing row goes in which band was this unit's own reasonable call, recorded above for review).

**T5 (this commit): /developers content ascent, quickstart-first, comprehensive.** Spec:
`t5-build-spec.md` (scratchpad). T1b built the skeleton (docs grid, scroll-spy TOC, the
`lib/api-reference.ts` model, shiki `CodeBlock`); this unit is the content pass on top of it,
per the board's own ask ("comprehensive yet intuitive for easy startup... this is where we need
to win devs over"). Ground truth for everything documented is the actual route handlers under
`app/api/v1/**` and their shared auth pipeline (`lib/api-auth.ts`), read directly rather than
assumed: several real gaps and one genuine bug turned up doing that.

- **Quickstart** (`components/marketing/developers/quickstart.tsx`, new, first section in the
  grid and the TOC): five true-sequence steps, mint a key, create a code, print it, scan it,
  repoint it, closing on the deck-quoted "Scan the same print again. New destination, same code.
  That is the whole product." Steps 2 and 5 render `QUICKSTART_CREATE_EXAMPLE`/
  `QUICKSTART_REPOINT_EXAMPLE` (new, `lib/api-reference.ts`), a deliberately minimal, plan-safe
  pair distinct from the comprehensive reference's own create-code/update-code samples: the
  reference's create-code example demonstrates the Pro-only vanity `slug` field (real, valuable
  documentation), but a brand-new signup following the Quickstart is very likely still on the
  free plan, where a `slug` in the body 403s with `vanity_slugs_not_available`, and shipping that
  as someone's first copy-pasted call would break for most readers. The two quickstart steps link
  down to their full reference entries (`#create-code`/`#update-code`); each step carries a stable
  `id` so a future surface can link back up. update-code's own reference sample changed from
  demonstrating `expiresAt` to demonstrating `destination` (retargeting, unlike expiry, is not
  Pro-gated, and it is literally the endpoint's headline behavior) so quickstart step 5 could
  reuse it byte-for-byte rather than inventing a third sample.
- **Reference restructure** (comprehensive): every one of the 5 real endpoints under
  `app/api/v1/**` (verified against the handler, not memory: `app/api/v1/codes/route.ts` GET+POST,
  `app/api/v1/codes/[slug]/route.ts` GET+PATCH, `app/api/v1/codes/[slug]/analytics/route.ts` GET;
  there is no DELETE anywhere in this surface) now renders a Parameters table, the request/response
  samples, a Response fields table, and an Errors table, from a typed extension of
  `lib/api-reference.ts` (`ApiParam`/`ApiResponseField`/`ApiEndpointError`, new). The shared "code
  object" response shape (`CODE_OBJECT_FIELDS`) is keyed as `Record<keyof ApiCode, ...>` against
  the real `ApiCode` type (`app/api/v1/_lib/to-api-code.ts`), so a field the API stops returning,
  or a field this module forgets, fails `pnpm typecheck` rather than waiting on review: the same
  "prove it, don't hand-maintain it" posture `lib/pricing.ts`'s `PRICING_MATRIX_BANDS` already
  established for `/pricing`. Every plan number (code limits, API cap, retention windows) is
  imported from `lib/entitlements.ts`/`lib/analytics.ts`'s `RANGE_OPTIONS`, never hand-typed. New
  shared components: `params-table.tsx`, `fields-table.tsx`, `errors-table.tsx` (all three always
  render a real `<table>`, even a zero-row one, so "every endpoint has a params table" is
  structurally true, not just usually true), and `callout.tsx` (a small "by design" note, first
  used to frame the 404-indistinguishability property as a feature in the shared Errors section,
  per the spec's explicit ask). Auth section gained key scoping and the exact 401/403 JSON shapes;
  Errors section gained a `PIPELINE_ERRORS` table (401/403/429/500, apply identically regardless of
  endpoint) plus the by-design callout; Rate limits tightened with the "over-cap request itself
  gets rejected, not the next one" nuance read off `increment_api_usage()`
  (migration `20260723000008_api_usage.sql`). TOC gained a Quickstart entry; the Endpoints group is
  unchanged in shape (still one nested list) since the actual endpoint count did not change.
- **Real findings while reading the handlers, not assumed:** (1) the public API's slug lookup
  (`getCodeBySlugCore`'s plain `.eq("slug", slug)`) is case-sensitive, unlike the redirect Worker's
  documented case-insensitive matching (D12): never previously documented, now a `notes` line on
  every `slug` path param. (2) `status` on every code object is `"active" | "paused" | "archived"`
  only; an expired code still reports `status: "active"` (`qr_codes.status`'s own check constraint
  has no `"expired"` value: that is a derived, dashboard-only label from `lib/access.ts`'s
  `codeState()`, never a raw column value), so a caller has to compare `expiresAt` themselves.
  (3) `scanCount` is not real-time: it is written by the hourly `rollup_scan_daily()` cron
  (D8 amendment), not per-scan, so a fresh scan may not show up in it for up to an hour, while
  `today.scans` on the analytics endpoint is live. (4) PATCH's response is a genuinely narrower
  shape than the full code object (`slug`/`destination`/`status`/`expiresAt` only, no `name`,
  `scanCount`, `passwordProtected`, `url`, or `createdAt`), implicit in the old sample, now
  explicit in its own Response fields table. None of these required a handler change (out of
  scope per the spec); all four are now documented for the first time.
- **Riders.** `/login`: the card's own mono sign-off is now `lg:hidden` (the value panel's copy is
  the one that survives at lg+; both were rendering at once before this unit). Root layout
  `metadata.description`'s em dash removed (restructured to a colon, meaning unchanged): the
  spec's own stated reason ("the last known em-dash in served marketing HTML") did not fully hold.
  The homepage's own `metadata.description` (`app/(marketing)/page.tsx`, which overrides the root
  layout's on `/`) had a second one, and the root layout's own `title.default` (rendered into
  every page's `<title>` and, via Next's metadata resolution, its `og:title`/`twitter:title`) had a
  third. Both fixed in the same pass, same restructure style. A fourth was found one layer deeper:
  the homepage's OG image alt text (`app/(marketing)/opengraph-image.alt.txt`, a plain committed
  text sidecar to the generated PNG, not the image itself) had one too, sourced from a hardcoded
  string in `scripts/generate-brand-images.ts`, fixed in both the checked-in file and the
  generator source so a future re-run does not reintroduce it. `/pricing`'s poster `SectionHeading`
  now passes `reveal={false}` (the component already supported this prop, used elsewhere on the
  same page for the FAQ heading) so the h1 no longer SSRs `opacity:0`, the same LCP-class fix
  P9.5-T1a applied to the landing hero.
- **A real "365days"-class bug, caught by diffing raw served HTML against the JSX source, not
  assumed correct from review:** the Quickstart's step 3 sentence rendered as
  "...response's <code>url</code>is the code's..." with the space after the `InlineCode` silently
  dropped by the JSX/Turbopack whitespace collapse (the same failure class `d2af287`'s "365days"
  incident and the T4 legal em-dash audit both already burned this codebase on). Fixed with an
  explicit `{" "}`, reverified against the rebuilt `.next/server/app/developers.html`, not just the
  source, plus a small script (`</(?:code|a|span)>` immediately followed by a word character) run
  across every touched page's prerendered HTML to confirm no sibling instance existed anywhere
  else in this unit's own new copy.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every workspace package (694
tests, unchanged count: 55 qr-engine + 138 worker + 23 shared + 478 web; this unit added zero new
vitest tests, relying on the `Record<keyof ApiCode, ...>` compile-time coupling above instead for
the one place hand-maintenance risk was highest), `pnpm build` keeps `/developers` at `○ (Static)`
and every other route's render mode byte-identical to the T4 baseline. `.next/static/chunks`
grepped clean for `shiki` (server-only, confirmed again). Live production-build review (`next
start`) via the browser pane, both a full-page tall-viewport screenshot and (for the parts the
pane's known hidden-tab/no-repaint-on-scroll limitations couldn't screenshot reliably this round)
a full `get_page_text` read-through of the entire rendered page, top to bottom. Full local e2e run
(`pnpm test:e2e`, `next start -p 3100`): 48/48 green, including 6 new/extended assertions (login
sign-off count, quickstart step/copy-button count, quickstart cross-links, per-endpoint params
tables, the 404-by-design callout, pricing h1 opacity) and the entire pre-existing money-path +
auth-scanner-safety suites, confirming nothing else broke. Static-HTML em-dash sweep across every
marketing page's prerendered output (`/`, `/developers`, `/pricing`, `/terms`, `/privacy`,
`/_not-found`): zero on every page this unit touched; the 9 remaining on `/` are all inside
section 09's build-time verbatim excerpt of `packages/qr-engine/src/guardrails.ts`'s real source
comments (`lib/guardrails-excerpt.ts`), correctly left alone, since "fixing" them would mean
editing qr-engine's own source comments (a different package, out of scope) and would break the
excerpt's own "never hand-copied" honesty guarantee.

**T-F chunk 1 (this commit): the first two feature pages, /features/dynamic-codes +
/features/analytics.** Spec: the combined CEO deck + build spec for T-F chunk 1
(scratchpad `tf1-deck-and-spec.md`) — deck strings verbatim-locked, page-depth copy
composing the landing's already-proven section-04/06 components rather than a new
visual system. Both routes render `○ (Static)`, zero new client JS (the only client
island either page uses is `RetargetTheatre`, already shipped and already bundled
for the landing).

- **True reuse, not forks.** `RetargetTheatre` and `DashboardWindow` render with zero
  prop changes ("reused as-is," per the deck). `StateCards` gained one additive
  `layout?: "sidebar" | "grid"` prop (default `"sidebar"`, byte-identical to the
  landing's existing behavior) — its original grid forces back to 1 column at `lg`
  specifically to fit the landing's 280px sidebar, which read sparse as a standalone
  section's full-width body, so `/features/dynamic-codes` passes `layout="grid"`
  instead. `ClosingSection` gained additive `title`/`lede` props (defaults byte-
  identical to today's landing copy) — the dynamic-codes page's own closing CTA head
  is verbatim identical to the existing default, so it reuses the component with
  zero props at all; the analytics page overrides `title` only. Net-new, shared
  between both pages: `components/marketing/features/feature-hero.tsx` (the
  centered/air hero shape, built from `Section`/`SectionHeading`/`MonoStrip` —
  deliberately NOT the landing's own bespoke `Hero`, which isn't in this chunk's
  reuse list and carries machinery specific to its one headline) and `faq-list.tsx`
  (a static, always-open `<dl>` Q&A list — deliberately NOT `PricingFaq`'s
  `"use client"` accordion pattern, since the zero-new-client-JS non-negotiable rules
  out a second interactive island). Net-new, single-page: `address-layers-diagram.tsx`
  (dynamic-codes S1's authored two-layer diagram — the shared `QrTile`, sacred-still
  as always, plus a dashed-border "destination row" mock whose dashed/solid contrast
  against the QR tile's own solid gradient border carries "one of these changes and
  one doesn't" without a caption having to say so; connected by a plain `lucide-react`
  arrow, already a project dependency, inert SVG output in a server component).
- **Doorway-flag refactor, forced by the chunking itself.** `lib/marketing-flags.ts`'s
  single `FEATURE_DOORWAYS_ENABLED` assumed every `/features/*` page would land in one
  unit; chunk 1 ships two of what turned out to be **four** consumers (grep found a
  second `/features/brand-studio` doorway in `playground.tsx`/section 02, beyond the
  already-known one in `brand-system-section.tsx`/section 03 — the deck's own build
  notes didn't anticipate this second call site). Split into three named flags —
  `DYNAMIC_CODES_DOORWAY_ENABLED`/`ANALYTICS_DOORWAY_ENABLED` now `true`,
  `BRAND_STUDIO_DOORWAY_ENABLED` stays `false` (both of ITS call sites) — so the two
  real pages go live without exposing the two links to a page that doesn't exist yet
  (SiteNav/SiteFooter's standing "real hrefs only" rule).
- **Honest-content check (the task's own required D2/D8 + Worker-source cross-check).**
  Both numeric claims are TRUE of the shipped product, verified against the Worker
  source directly, not assumed from the decision log's prose:
  - **"≤ 5 min worst case" / "the hard ceiling is five minutes of edge cache."**
    `workers/redirect/src/index.ts`'s read-through KV backfill and
    `kv-sync-endpoint.ts`'s write-through sync both literally write
    `{ expirationTtl: 300 }` (5 minutes) — confirmed by reading both call sites, not
    inferred. **Finding, not a blocker:** D2's own prose ("worst-case staleness ≈
    60s," from `KV.get(slug, {cacheTtl: 60})`) predates this — the P5 STATUS entry
    documents the 60s→300s change (a real bug found and fixed: KV backfill entries
    originally had no TTL at all, so an unavailable write-through could pin a stale
    destination forever; the fix capped it at 300s) but D2 itself was never amended
    to match, unlike D8's own explicit "Amended at P6" pattern. The Worker source is
    the ground truth for what the product actually does today, and it matches the
    deck exactly; D2's stale "≈60s" sentence is a decision-log hygiene gap worth a
    future one-line fix, not a reason to withhold this claim.
  - **Hourly rollup.** `supabase/migrations/20260723000007_scan_rollup.sql` schedules
    `cron.schedule('rollup_scan_daily_hourly', '5 * * * *', ...)` — literally hourly,
    matching D8's own already-amended "Amended at P6... hourly, not nightly" text and
    the deck's "An hourly job rolls logs into daily counts per code" / "Totals update
    hourly by design" lines exactly. No discrepancy.
  Both FAQ claims about live vs. rolled-up numbers (today tile live, `scanCount` up to
  an hour stale) match the T5 STATUS entry's own findings from reading the API route
  handlers directly. No claim required stopping.
- **Judgment calls, not deck deviations** (the deck left these unspecified): both FAQ
  sections needed a `SectionHeading`'s required `title`, which the deck gives Q&A
  pairs for but no section head — invented "Before you print." (dynamic-codes) and
  "Before you trust the numbers." (analytics), same class of gap-fill /pricing's own
  "Before you pick a plan." already set precedent for. The honest plans-and-limits
  table's "Retargets" row has no `PlanLimits` field behind it (D14: retargeting is
  unconditionally unlimited on both plans, never a numeric cap) — its "Unlimited"/
  "Unlimited" cells are the one static pair in an otherwise `PRICING_ROWS`-sourced
  table (`dynamicCodes`/`accessControls`/`apiMonthlyRequests` rows all read the exact
  strings `/pricing` itself renders, not re-derived a second way).
- **Sitemap + OG.** `app/sitemap.ts` gains both routes (priority 0.8, monthly).
  `scripts/generate-brand-images.ts` extended with two independent SVG builders
  (`buildDynamicCodesOgSvg`/`buildAnalyticsOgSvg`, same canvas language as the
  existing pricing/legal builders, kept independent per the file's own established
  reasoning) and two new deep-linking QR payloads
  (`HTTPS://QRCDN.COM/FEATURES/DYNAMIC-CODES`, `.../FEATURES/ANALYTICS` — both
  self-verified via the existing zxing-wasm decode-before-write gate). Re-running the
  generator reproduced every pre-existing image byte-identical (git-diff-confirmed)
  and wrote the two new OG PNGs + alt-text files.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every workspace
package (694 tests, unchanged count: 55 qr-engine + 138 worker + 23 shared + 478 web —
this unit's new logic is compositional, not new pure functions, so it's covered by e2e
rather than new vitest cases, same reasoning T5 gave), `pnpm build` keeps
`/features/dynamic-codes` and `/features/analytics` at `○ (Static)` and every other
route's render mode byte-identical to the T5 baseline. Full local e2e run
(`pnpm test:e2e`, `next start -p 3100`, real cloud Supabase fixture): 55/55 green,
including 6 new/extended assertions (both pages' PUBLIC_PAGES 200-with-no-`href="#"`
sweep, hero h1 + one section-body marker each, honest plan table + FAQ, retention line
+ FAQ + the analytics-endpoint-anchor link, landing doorways present on 04/06 and
absent for brand-studio, sitemap contains both new paths) plus the entire pre-existing
marketing/money-path/auth-scanner-safety suites, confirming nothing else broke. Live
production-build review (`next start`, throwaway port) at desktop/1280px and
375px mobile, both themes, via the browser pane's documented `!important`-override
workaround for the hidden-tab rAF freeze: both pages read cleanly section to section,
the two-layer diagram's connecting arrow correctly reflows from a rightward to a
downward orientation at the mobile breakpoint, and `scrollWidth === innerWidth` at
375px confirmed zero horizontal overflow anywhere on either page.

**T-F chunk 2 (this commit): the second pair of feature pages,
/features/brand-studio + /features/access-controls.** Spec: the combined CEO
deck + build spec for T-F chunk 2 (scratchpad `tf2-deck-and-spec.md`). Same
composition discipline as chunk 1: deck strings verbatim outside the four
named truth-gate variants, page-depth copy composing already-proven landing
components, zero new client JS.

- **True reuse, not forks.** `KitContactSheet` and `GuardrailsPlot` render
  with zero prop changes. `StateCards` gained one additive `only?:
  "unclaimed" | "password" | "expired"` prop (default `undefined` — every
  existing call keeps rendering all three cards, byte-identical): when set,
  the grid wrapper is skipped and the single named `<StateCard>` renders
  bare, so `/features/access-controls` can show exactly the password card
  (S1) or the expired-code row (S2) the deck calls for. `Playground` gained
  one additive `embedded?: boolean` prop (default `false`, landing call
  site unchanged) — the one component in this chunk's reuse list that
  bakes in its own `Section`/`SectionHeading`/closing doorway (unlike every
  other reused body component), so `embedded=true` skips that outer shell
  (the feature page supplies its own S2 head/lede instead) and always
  drops the closing doorway link (a page can't doorway-link to itself).
  `ClosingSection`'s existing `title` prop covers both new pages' closing
  CTAs with no further changes. Net-new, shared with chunk 1:
  `FeatureHero`/`FaqList` (unchanged, no new props needed).
- **Doorway-flag state.** `lib/marketing-flags.ts`'s
  `BRAND_STUDIO_DOORWAY_ENABLED` flips `true` (both call sites: section 02
  `playground.tsx`, section 03 `brand-system-section.tsx` — the latter
  gained `id="brand-system"` this unit, closing the one omission versus
  every sibling doorway-bearing section, which all already had an anchor
  id). A new `ACCESS_CONTROLS_DOORWAY_ENABLED` flips `true` for the one
  natural slot the spec asked to look for: section 04 `dynamic-codes-
  section.tsx`, beside the existing dynamic-codes doorway link — that
  section's own state-cards already depict the password gate and the
  expired-code row the new page expands on, so a second `LearnMoreLink`
  drops in with zero layout change.
- **All four truth-gate verdicts** (each proven against real source, not
  assumed — full reasoning lives in both new page.tsx files' own header
  comments):
  - **G1 (studio export block behavior) — variant B, warn-only.** Proven
    against `components/studio/studio-shell.tsx` (`handleExportSvg`/
    `handleExportPng` call `downloadBlob`/`rasterizeSvgToPng` directly,
    with no gate on the live `scannabilityReport` result) and
    `components/studio/controls-rail.tsx` (the Export section's Download
    buttons disable only while `exporting !== null`, never on
    scannability state). `ScannabilityChip` is read-only instrumentation;
    it never disables anything. Shipped: "...the studio warns before you
    export, while you decide."
  - **G2 (password check location + destination-in-HTML) — variant A.**
    Proven against `workers/redirect/src/responses.ts`
    (`scanRedirectToPasswordWall` only ever redirects to `/p/{slug}`, never
    sees or checks a password), `app/p/[slug]/actions.ts` (`verifyCodeAccess`
    is a `"use server"` action — the scrypt comparison runs server-side,
    never in browser JS), and `app/p/[slug]/page.tsx` (fetches
    `destination_url` but never renders it in the one branch where the gate
    form actually shows — it's referenced only in the two branches that
    redirect away before the gate renders). Shipped mono, verbatim:
    "password checked server-side · destination never in the gate's HTML".
  - **G3 (vanity slug rules)** — read from `lib/slug.ts`: 4-30 characters,
    the narrow 30-symbol charset (digits 2-9 + A-Z minus I/L/O/U — the same
    print-confusability charset as auto-generated slugs, D12's P7.5-U3
    amendment), case-insensitive input normalized to uppercase, single-
    attempt insert (collision -> `slug_taken`), plus the `RESERVED_SLUGS`
    blocklist. Shipped mono: "4-30 chars · charset skips 0 O 1 I L U ·
    reserved words blocked".
  - **G4 (expiry revival)** — yes, immediately, by design. Read from
    `lib/codes-core.ts`'s `setCodeAccessCore`, `lib/validation.ts`'s
    `parseExpiresAt` (`null` explicitly clears `expires_at`; past dates are
    "deliberately accepted... not a mistake to reject"), and
    `lib/access.ts`'s `isCodeExpired`/`codeState` (purely derived from the
    live `expires_at` value on every call — no separate "died once" flag
    exists anywhere in the schema). Both S2's lede and S6 FAQ #3 ship this.
  - **Two verify-before-shipping FAQ answers**, both confirmed true and
    shipped close to verbatim: "Do controls slow the scan down?" (the
    password/expiry checks are synchronous conditionals over the exact
    `kvRecord`/`restResult` the Worker already fetched to resolve the
    destination — `workers/redirect/src/index.ts` +
    `redirect-decision.ts` — no extra lookup) and "Do gated scans still
    count in analytics?" (yes: `index.ts` fires scan ingest based on
    `resolveCodeId` alone, independent of the redirect `decision.kind` —
    `ingest-decision.ts`'s `decideIngest` never inspects paused/protected/
    expired state, matching `resolveCodeId`'s own doc comment, "a scan
    against a paused code is still a scan").
- **Deviation, flagged and sourced (not silent).** The deck's hero lede and
  S2 lede both listed/described a code "scheduling" capability ("schedule
  its start") alongside expiry. No such feature exists: `supabase/
  migrations` shows `qr_codes` has `expires_at` and `password_hash` only
  (no `starts_at`/`scheduled_at` column), `code-access-dialog.tsx` exposes
  only "Expires" + "Password" inputs, and `lib/api-reference.ts` documents
  no scheduling field on the public API's PATCH surface either. Per the
  task's own directive ("a claim you cannot prove does not ship"), both
  ledes drop the scheduling clause and describe only the real expiry
  capability. `lib/pricing.ts`'s pre-existing "Expiry, password &
  scheduling" row label carries the same imprecision but is a shared,
  already-shipped `/pricing` surface out of this chunk's scope to edit —
  S5's table on `/features/access-controls` overrides that one row's LABEL
  text locally to "Expiry & password" (its free/pro VALUES are still read
  unchanged from `PRICING_ROWS`) rather than perpetuating the claim on a
  new page.
- **Honest plans-and-limits tables**, same "import what exists, one static
  pair for a policy fact" discipline chunk 1 established. Brand-studio:
  brand kits + dynamic codes read `PRICING_ROWS`; static codes and export
  formats have no `PlanLimits` field (D14: both unconditionally unlimited
  on every plan) so they're the static pairs. Access-controls: vanity
  slugs + bulk generation read `PRICING_ROWS`; pause/resume has no
  `PlanLimits` field either — verified by reading `setCodePausedCore`
  (`lib/codes-core.ts`) directly, which carries no plan gate at all
  (matching D14's "retargeting always allowed, never deactivated"
  framing) — so it's a static Included/Included pair, not assumed.
- **Sitemap + OG.** `app/sitemap.ts` gains both routes (priority 0.8,
  monthly, matching chunk 1's pair exactly).
  `scripts/generate-brand-images.ts` extended with two more independent SVG
  builders (`buildBrandStudioOgSvg`/`buildAccessControlsOgSvg`) and two new
  deep-linking QR payloads (`HTTPS://QRCDN.COM/FEATURES/BRAND-STUDIO`,
  `.../FEATURES/ACCESS-CONTROLS`, both self-verified via the existing
  zxing-wasm decode-before-write gate). Re-running the generator reproduced
  every one of the six pre-existing images byte-identical (git-diff-
  confirmed zero changes to any existing PNG/alt-text file) and wrote the
  four new files.
- **D2 amendment (the task's own rider).** `docs/DECISIONS.md`'s D2 gained
  an "Amended at P9.5" note, following D8's own pattern: the "~60s"
  worst-case staleness prose was stale versus the real P5 fix — both KV
  write call sites (`workers/redirect/src/index.ts`'s backfill,
  `workers/redirect/src/kv-sync-endpoint.ts`'s write-through) have used
  `expirationTtl: 300` since a real bug fix (an untimed backfill entry
  could otherwise pin a stale destination forever if write-through sync
  ever failed). Worst-case staleness is 300s, not 60s; `cacheTtl: 60` on
  the initial `KV.get` is a separate, still-accurate read-cache hint. This
  closes the exact "future one-line fix" chunk 1's own STATUS entry
  flagged but didn't execute.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across every
workspace package (694 tests, unchanged count: 55 qr-engine + 138 worker +
23 shared + 478 web — this unit's new logic is compositional, covered by
e2e rather than new vitest cases, same reasoning chunks 1 and T5 both
gave), `pnpm build` keeps `/features/brand-studio` and
`/features/access-controls` at `○ (Static)` and every other route's render
mode byte-identical to the chunk-1 baseline. Full local e2e run (`pnpm
test:e2e`, `next start -p 3100`, real cloud Supabase fixture): 61/61 green,
including 6 new assertions (both pages' hero h1 + one section-body marker
each, both pages' truth-gate mono/copy lines + honest plan table + FAQ, and
the rewritten landing-doorways test covering all four now-live `/features/*`
links — two of them, `#studio`/`#brand-system`, sharing one destination and
one link string, scoped per-section to avoid a strict-mode violation) plus
the entire pre-existing money-path/auth-scanner-safety/marketing suites,
confirming nothing else broke. Live production-build review (`next start`,
throwaway port) at 1280px desktop and 390px mobile, both themes, via the
browser pane's documented `!important`-override workaround for the
hidden-tab rAF freeze (re-applied after every fresh navigation, not just
once, after an initial dark/mobile capture of `/features/access-controls`
came back with several sections visually blank — confirmed as the
known frozen-entrance-animation artifact, not a real bug, by re-navigating
and re-injecting the override, which recovered every section): both new
pages read cleanly section to section in both themes, and
`document.documentElement.scrollWidth === innerWidth` at 390px confirmed
zero horizontal overflow anywhere on either page.

**T6 (this commit): changelog, status.qrcdn.com, and the OSS pack.** Spec:
`t6-build-spec.md` (scratchpad). Three deliverables, all live.

- **`/changelog` + RSS.** `lib/changelog.ts` is the single typed source
  (`CHANGELOG_ENTRIES`, `CHANGELOG_TAGS`) both `/changelog` (poster head,
  `reveal={false}` per the now-standard LCP fix) and the new
  `/changelog/rss.xml` route handler (`force-static`, since a GET Route
  Handler defaults to dynamic as of Next 15+ per the bundled docs) render
  from — never a second hand-copied list. 10 entries, curated by hand from
  this file's own ledger + `git log`, real day-precision dates
  (2026-07-21 → 2026-08-01), mono tags from the closed 8-tag set
  (engine/studio/codes/api/analytics/worker/site/security), zero internal
  phase codes anywhere (a co-located `lib/changelog.test.ts` statically
  greps every id/summary for a `P\d+`/`T\d[a-c]?`/`Checkpoint [ABC]`-shaped
  token so this can't silently regress later, the same "prove it, don't
  hand-maintain it" posture `lib/pricing.test.ts` already established) and
  no em dash (also tested). Footer gains a Resources-flavored cluster:
  Changelog + Status land beside Terms/Privacy in the existing Legal
  column (no Resources column exists yet, and the spec's own fallback was
  "beside Terms/Privacy cleanly"); GitHub lands beside API reference in
  the Developers column; `/developers`' own intro gained a "View the
  source on GitHub" `LearnMoreLink` in the one natural slot that page has
  for it.
- **`workers/status` → status.qrcdn.com, live.** New dependency-free
  workspace package: three parallel request-time probes (~3s timeout
  each), a pure `evaluate.ts` (vitest-covered) deciding pass/fail from raw
  attempts, a pure `render.ts` producing one self-contained dark-themed
  HTML page (literal color values hand-copied from `globals.css`'s
  dark-mode block, no import from `apps/web` — genuinely independent
  infrastructure), and a thin `probe.ts`/`index.ts` I/O shell, mirroring
  workers/redirect's own "pure decision layer, thin shell" split. P1's
  contract was verified against `workers/redirect/src/{route,redirect-
  decision,responses}.ts` directly before writing the probe, not assumed:
  an unknown-but-slug-shaped path is NOT a 404 — it resolves to
  `{kind:"unclaimed"}` and gets the exact same 302 + `Cache-Control:
  no-store` contract a real scan gets, just pointed at `/u/{slug}`. The
  probe asserts exactly those two invariants (status 302, header present)
  and deliberately not the `Location` value, so a future presentational
  change to the unclaimed page can't false-positive this monitor. P3
  verified against `lib/api-auth.ts`'s `authenticateApiRequest`: a
  missing/malformed Authorization header is a 401 before any code-core
  logic runs, so 401 for a keyless request IS the healthy state.
  **Real platform issue found and fixed on the first live deploy, not
  anticipated in planning:** `qrcdn.com` (workers/redirect) and
  `status.qrcdn.com` (this Worker) share one Cloudflare zone, and a
  Worker's `fetch()` to another Worker on its own zone does not reach the
  public Internet by default — Cloudflare intercepts it internally, and
  since workers/redirect runs on a Route (not a Custom Domain) that
  interception fails outright (edge error 1042, surfaced as a bare 522).
  Reproduced twice live (direct external `curl qrcdn.com` succeeded both
  times at the same moment this Worker's own P1 fetch 522'd), confirmed
  against Cloudflare's own docs, fixed with **one config-only line** in
  `workers/status/wrangler.jsonc` (`compatibility_flags:
  ["global_fetch_strictly_public"]`) that touches nothing in
  workers/redirect — and is the semantically MORE correct behavior for an
  honest external-style probe regardless, not merely a workaround.
  Deployed via `wrangler deploy` from `workers/status/` with the existing
  local OAuth session (same account as workers/redirect, confirmed via
  `wrangler whoami` before deploying; `account_id` pinned in
  `wrangler.jsonc` per the P5-U3 incident precedent); Custom Domain
  `status.qrcdn.com` provisioned automatically, zero manual DNS. Live
  double-curl proof: both requests returned `200`, `Cache-Control:
  no-store`, "All systems normal," all three probes passing. `wrangler
  dev`'s bundled workerd binary only supports compatibility dates up to
  2026-07-21 (this session's real date is later) — `compatibility_date`
  pinned to that value so local `wrangler dev` verification stays
  possible; this Worker uses nothing runtime-exotic enough for the exact
  date to matter.
- **OSS pack.** Root `LICENSE` (MIT, copyright (c) 2026 QRCDN), `README.md`
  (the spec's content verbatim — the architecture table's six paths were
  already accurate against the real tree, including the brand-new
  `workers/status` row; added a real CI badge,
  `github.com/willgibs/QRCDN/actions/workflows/ci.yml/badge.svg`, since
  `.github/workflows/ci.yml` genuinely exists — the spec's "keep the CI
  badge only if the URL is real" condition read as permission to add one,
  not an instruction to keep something already there), `SECURITY.md`
  (hello@qrcdn.com, no bounty claim, no fake SLA), `CONTRIBUTING.md`
  ("built in the open, developed as a cathedral," the standing repo rules
  as contributor guardrails). **Repo-goes-private mentions aligned with
  the P9.5 open-source reversal**, found by grep across `docs/` and
  `.github/`, not just the two files the spec named: `docs/guides/
  infra.md`'s "Repo visibility" section rewritten (was "flip back private
  before launch — P10 checklist"; now permanent, with the P10 item
  explicitly noted gone) plus its uptime-cadence sentence; the live
  `uptime.yml` and `backup.yml` workflow comments corrected (both are
  operational code, not historical record); `docs/guides/
  p8-proof-protection.md` got a **dated amendment note** rather than a
  silent rewrite, preserving what P8 actually shipped against (this
  file's own established convention — see D2/D8/D12 in DECISIONS.md).
  Deliberately left untouched: this file's own P7.5 Part A paragraph
  (historical record of what was true when it was written) and the P9.5
  OPEN entry + `p9.5-ascent.md` (both already state the reversal
  correctly).

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across
every workspace package including the new `workers/status`
(730 tests: 23 shared + 25 workers/status + 55 qr-engine + 138
workers/redirect + 489 web, +11 web from `lib/changelog.test.ts`),
`pnpm build` keeps `/changelog` and `/changelog/rss.xml` at `○ (Static)`
with every other route's render mode byte-identical to the T-F2
baseline. Full local e2e run (`pnpm test:e2e`, `next start -p 3100`, real
cloud Supabase fixture): **66/66 green** (62 baseline + 4 new: changelog
entries/dates render from the live import, the RSS feed is valid and
carries every entry, the three new footer links resolve to real hrefs,
`/developers`' new GitHub link renders) — fixture created and torn down
cleanly. Two new literal strings ("QRCDN" in the GitHub URL and the RSS
`<title>`) tripped `lib/e2e-safety.test.ts`'s static slug-charset scanner
(Q/R/C/D/N all fall inside the narrow uppercase slug charset) — fixed via
regex literals, the same exemption-by-construction precedent T3c/T4
already established for "PATCH"/"QRCDN" elsewhere in this file, not by
weakening the guardrail.

No deviations from the spec's substance. Judgment calls, all recorded
above: `wrangler.jsonc` (not the spec's literal `wrangler.toml`) to match
workers/redirect's existing config format; the CI badge added rather than
found-and-kept; footer link placement (Legal column, not a new Resources
column); the `global_fetch_strictly_public` fix, found live rather than
anticipated.

**P9.5-T-R (this commit): the blog, the help center, and the nav/footer
evolution the whole marketing surface still lacked.** Spec: the T-R
deck+editorial brief (scratchpad). Three deliverables, all live.

- **MDX-vs-TSX, decided by actually trying it, not just reading docs.**
  `@next/mdx` was installed, wired into `next.config.ts`, and a throwaway
  `.mdx` page was built and compiled clean under Turbopack in a real
  `pnpm build` — confirming the bundled Next 16 docs' one caveat
  ("remark/rehype plugins without serializable options cannot yet be used
  with Turbopack") is narrower than "MDX doesn't work here": the trivial,
  plugin-free case genuinely builds. Reverted anyway (deps + config +
  scratch files all removed, `pnpm install` back to the committed
  lockfile, re-verified via `--frozen-lockfile`) because the real fit
  problem is orthogonal to Turbopack: this repo has no
  `@tailwindcss/typography` and no prior MDX element-style mapping, so raw
  markdown output would render unstyled without hand-building a parallel
  typography layer that duplicates what `Section`/`CodeBlock`/the type
  scale already give typed TSX for free — and `--container-prose` (65ch)
  was reserved back at P9.5-T1b explicitly as "the future blog unit['s]"
  measure, a standing signal this codebase expected typed components here.
  Shipped: `lib/blog.ts` (typed metadata, mirrors `lib/changelog.ts`'s own
  split) + one TSX file per post under `components/marketing/blog/posts/`
  + a slug->component registry, the sanctioned fallback the deck itself
  pre-authorized.
- **`/blog`** — 4 launch posts (`what-actually-scans`,
  `redirects-that-outlive-us`, `counting-without-tracking`,
  `why-open-source`), byline "Will Gibson," dated 2026-08-01 per the deck.
  Every fact traces to primary source, verified against the actual file
  before writing (not the docs' paraphrase of it): the 0.395/0.412
  effective-knockout thresholds and the 160+-combo campaign narrative read
  straight from `packages/qr-engine/src/guardrails.ts`'s own comments; the
  302/no-store contract and the 300s KV ceiling from
  `workers/redirect/src/{index,redirect-decision,responses,kv-sync-
  endpoint}.ts` directly (D2's own amendment, not the pre-amendment
  "~60s" prose); the hash formula, geo/device/referer columns, hourly
  rollup, and live-today-tile split from `scan-hash.ts`/`ingest.ts`/
  migration `20260723000007_scan_rollup.sql`/`lib/analytics.ts`; the
  open-source facts from the real `LICENSE`/`README.md`/`CONTRIBUTING.md`
  already in the repo. All three [V]-line sets ship byte-verbatim — proven
  by a vitest suite (`lib/blog.test.ts`) that reads each post's compiled
  TSX source directly off disk (this repo's vitest has no jsdom/RSC
  renderer) and asserts word count (900-1400, all four land inside range:
  1152/955/1049/930), zero em dash, zero internal phase code, and every
  [V] string as an exact substring — not a one-time manual check, a
  standing regression guard. RSS at `/blog/rss.xml` mirrors
  `/changelog/rss.xml`'s own route handler almost exactly (`force-static`,
  same RFC-822-noon-UTC convention).
- **`/help`** — 10 articles across the deck's 5 categories (Getting
  started/Codes/Access/Billing & plans/Account), typed data in
  `lib/help.ts` (doIt steps + one whatToExpect note + cross-links),
  150-350 words each (vitest-proven the same way, `lib/help.test.ts`).
  Every step verified against the real UI/handlers before writing, not
  assumed from marketing copy — two real findings changed what shipped:
  (1) **the deck's "CSV shape" framing for bulk-create doesn't match the
  real input**: `bulk-create-dialog.tsx`'s actual textarea parses plain
  line-delimited text with an optional `Name | URL` pipe syntax, never
  comma-separated values — the article documents that real format; the
  genuinely-CSV artifact is the *results* export (`buildResultsCsv`),
  which the article also documents, correctly, as the output, not the
  input. (2) **article 10, the account-deletion truth-check the deck
  explicitly demanded**: grepped for `deleteUser`/`/settings`/`/account`
  across `apps/web` and found none reachable by a real signed-in user —
  `auth.admin.deleteUser` exists only in e2e teardown scripts. Self-serve
  deletion is not in the product today. The article says exactly that (a
  request to hello@, handled by hand) rather than describing a button
  that doesn't exist. Found in passing, fixed as directly motivated by
  that same check: `app/(marketing)/privacy/page.tsx` claimed deletion
  works "from within the product or by writing to us" — corrected to the
  honest single path; the cascade-delete guarantee it goes on to state
  (codes/kits/keys/scan history all cascade) was independently verified
  against the real `on delete cascade` FK chain in
  `supabase/migrations/20260721000001_initial_schema.sql` and left as is,
  since it's true. **A third, softer finding** shaped article 8
  ("What happens when I downgrade," the deck's own literal title): Stripe
  billing has never shipped (P8's own finding, still true), so downgrading
  cannot happen yet at all — `/pricing`'s own CTA already says "Paid
  checkout opens at launch." The article leads with that honestly rather
  than describing a self-serve flow, then states the real policy
  commitment (D14, the terms) for when billing exists.
- **Nav + footer evolution.** `SiteNav`: "Features" is now a dropdown
  (vendored Radix `DropdownMenu`, same primitive `codes-list.tsx`'s row
  actions menu already uses) over the 4 real feature pages; "API" renamed
  to "Docs" (same `/developers` href); "Blog" added. Mobile disclosure
  mirrors all 7 items flat, feature links first, a hairline, then
  Docs/Pricing/Blog — no nested menu on top of an already-open sheet.
  `SiteFooter` gained the deck's full resource map: Product (4 features +
  Pricing + Studio), Resources (Docs/Help/Blog/Changelog/Status),
  Open source (GitHub + the real `LICENSE`/`SECURITY.md` files in the
  repo, not fabricated in-app pages), Legal (Terms/Privacy) — the mono
  "your code never dies" sign-off row is untouched. **A real, found-live
  bug, not just a test-authoring issue**: the mobile disclosure's links
  stay mounted in the DOM even while closed (the existing grid-rows
  collapse animation needs that), and without any hiding mechanism they
  were both keyboard-tabbable while invisible (a real WAI-ARIA violation)
  and silently duplicated page vocabulary sitewide — "Analytics" and
  "Access controls" are now both nav labels and, e.g., `/pricing`'s
  comparison-table column headers. Fixed with `inert={!open}` on the
  disclosure wrapper (React 19 supports it as a plain DOM prop): correct
  for real assistive tech and keyboard users (no accessibility-tree
  presence, no focus, no pointer interaction while collapsed), though
  empirically confirmed live that it does NOT prevent Playwright's plain
  `getByText()` from still counting the (still-mounted, still-`display:
  none`-via-`sm:hidden`) node — that locator, unlike `getByRole()`, isn't
  accessibility-tree-based, so it counts DOM matches regardless of
  `display`/`inert`. The one pre-existing test this broke
  (`pricing page renders the banded matrix`) was fixed by scoping to the
  comparison `table` specifically, the same disambiguation pattern this
  file already used elsewhere for table headers — not a workaround, the
  established convention applied to a newly-real collision.
- **Sitemap + e2e.** `app/sitemap.ts` now derives its `/blog`/`/help`
  entries from `BLOG_POSTS`/`HELP_ARTICLES` directly (never a hand-copied
  URL list, so a future post/article can't silently miss the sitemap).
  `apps/web/e2e/marketing.spec.ts` gained 13 new tests: the Features
  dropdown opens with exactly 4 links and navigates correctly, the mobile
  disclosure mirrors flat with no nested menu, the footer's full resource
  map renders with every real href, the blog index/post/RSS/404 render
  against `BLOG_POSTS` directly, the help index/article/404 render against
  `HELP_ARTICLES` directly, and the deletion article's honest-path
  language is asserted verbatim. `PUBLIC_PAGES` gained `/blog` and
  `/help`; the sitemap test now checks every real post/article URL.

Verified: `pnpm lint && pnpm typecheck && pnpm test` all green across
every workspace package (779 vitest: 23 shared + 25 workers/status + 55
qr-engine + 138 workers/redirect + 538 web, +49 web from
`lib/blog.test.ts`/`lib/help.test.ts`), `pnpm build` keeps every existing
route's render mode byte-identical to the T6 baseline and adds `/blog`
(`○`), `/blog/[slug]` (`●`, 4 real paths), `/blog/rss.xml` (`○`), `/help`
(`○`), `/help/[slug]` (`●`, 10 real paths). Full local e2e run
(`pnpm test:e2e`, `next start`, real cloud Supabase fixture): **79/79
green** (65 marketing + 14 money-path/auth-scanner-safety), including all
13 new assertions above. Live production-build review (`next start`,
throwaway port) in the browser pane at desktop and mobile, both the
Features dropdown opening and the mobile disclosure's flat mirror,
confirmed visually before the e2e proof.

No deviations from the deck's substance. Judgment calls, all recorded
above: typed-TSX over MDX (tried live, reasoned decision, not a docs-only
call); bulk-create's real input format documented instead of the deck's
"CSV" framing; the account-deletion and downgrade articles state current
reality rather than the aspirational policy alone; `inert` added to fix a
real, found-live accessibility gap the nav evolution introduced.

**P9.5-T7 (this commit): four product quick wins inside the authenticated
app, plus three riders** — the deep studio/codes redesign stays deferred,
as scoped. Spec: a CEO-authored build spec (scratchpad), Rev 2 with its
VERIFIED claims independently checked against source before the unit
started. Two of those claims turned out wrong anyway, both caught by
re-verifying rather than trusting the label — see "Spec corrections" below.

- **`/api-keys` free-state showcase.** The free-plan branch of `/api-keys`
  used to be a single "upgrade to Pro" card with no real content. Now:
  `components/api-keys/api-keys-free-showcase.tsx`, a new async Server
  Component rendering the real `create-code` curl sample
  (`lib/api-reference.ts`, through the shared shiki `CodeBlock`), one
  sentence on what a key unlocks, a "What Pro includes" list generated from
  `PLAN_LIMITS.pro` (imports only, never hand-typed), and an honest "See
  pricing" CTA with the same "Paid checkout opens at launch" line
  `pricing-teaser.tsx`/`pricing-plans.tsx`/`pricing-faq.tsx` already use
  verbatim elsewhere — no fake upgrade button. **Approach, not the spec's
  first-choice slot pattern:** the spec's primary suggestion was rendering
  `CodeBlock` in `page.tsx` and passing it into `ApiKeysPanel` as a
  children/prop slot, with "split into its own server component" offered as
  the fallback if the panel's shape made the slot awkward. It did: the
  panel's Pro-only hooks/state (create form, revoke, reveal-once card) have
  no use for a free-state prop, so `app/(app)/api-keys/page.tsx` now
  branches on `plan === "pro"` directly and renders either
  `ApiKeysPanel` (Pro, untouched apart from dropping its now-always-true
  `plan` prop and the `ProUpsell` branch it used to hide behind) or
  `ApiKeysFreeShowcase` (free, zero client JS for that branch — a real
  bundle-size win the slot approach wouldn't have given free-plan visitors,
  since today's `ApiKeysPanel` mounts its full hook set regardless of which
  branch it returns).
- **`/codes` entry + pause.** Header gains a "Create code" button
  (`app/(app)/codes/page.tsx`, the pre-existing empty right-hand flex slot)
  linking honestly to `/studio` — the real create entry point; there is no
  separate create route to deep-link to; `CreateCodeControl`
  (`components/studio/create-code.tsx`) lives inside the Studio itself,
  wired to the live payload/style being edited there. Per-row Pause/Resume:
  a new `toggleCodePausedAction` (`app/(app)/codes/actions.ts`) wraps the
  pre-existing `setCodePaused` (`app/(app)/studio/code-actions.ts:176`,
  itself wrapping `setCodePausedCore` at `lib/codes-core.ts:615`) unchanged
  — same `getUser()` re-verification (not `getClaims()`) the
  "changes what a printed code does" family already uses for
  retarget/pause, same `STUDIO_MUTATE_LIMIT` gate, no new guard logic
  anywhere. `CodesTable` (`components/codes/codes-table.tsx`) stays a plain
  server-rendered table with no `"use client"` of its own; the new control
  is `PauseToggleButton` (`components/codes/pause-toggle-button.tsx`), a
  small client leaf mounted per row — the same "island inside a
  server-rendered tree" shape `copy-button.tsx` already establishes inside
  `CodeBlock`. Row click-through: the table never had a row-wide anchor
  (only the pre-existing inline "View analytics" text link), so there was
  no actual nested-interactive-element hazard to design around, contrary to
  what the spec's phrasing implied — the new button and the existing link
  are plain siblings in the same cell.
  **Two real, non-obvious Next 16 findings surfaced building this, both
  confirmed live via the e2e suite, not assumed from docs (full detail in
  `app/(app)/codes/actions.ts`'s own doc comment):** (1) a plain
  `<form action={fn.bind(...)}>` with no `useActionState` invokes a Server
  Action correctly (the mutation lands, `refresh()`/`revalidatePath()` both
  run server-side) but the browser never applies the fresh RSC payload the
  docs say the same response carries — the row stayed stuck on stale data
  until an unrelated navigation. Fixing this needed `useActionState` in a
  small client leaf, not a config change. (2) `useActionState` alone then
  worked for exactly one submission per mounted instance: pausing a row
  updated it live, but resuming the same row right after did not (the
  mutation still landed, proven server-side both times) — fixed by mounting
  `PauseToggleButton` with `key={code.status}` so a status change forces a
  real remount instead of reusing the instance. Found only because the e2e
  spec tests pause-then-resume back to back on the same row; a one-off
  manual click-through checking "does pause work" would very plausibly have
  shipped this half-working.
- **Studio rail grouping.** `components/studio/controls-rail.tsx`'s six
  existing sections (Payload, Codes, Colors, Shape, Logo, Export — 483
  lines pre-unit, confirmed) are now two labelled clusters: "Design"
  (Colors, Shape, Logo) and "Content & output" (Payload, Codes, Export),
  via a new `ClusterHeading` label one tier above each section's own
  `Eyebrow`. Controls themselves byte-identical, zero added/removed — pure
  regrouping. Cluster order (Design first) keeps Export as the literal last
  section on the page, preserving its existing bottom placement.
  **Export emphasis/bottom placement: verified already satisfied, not
  re-done** — it was already the rail's last section pre-unit; no second
  emphasis treatment added. Zero-kit empty state: `components/studio/
  top-bar.tsx` now shows one honest line ("No brand kit yet. Create one to
  save your colors and shapes for reuse across codes.") beside the existing
  `KitBar`, only when `kits.length === 0` — read `StudioShell`/`KitBar`
  first per the spec's own instruction: `KitBar` already renders a "New
  kit" button for the empty case, so this adds context for that existing
  button rather than a second, competing create affordance.
- **Riders.** (a) `lib/pricing.ts:120`'s matrix row label corrected
  "Expiry, password & scheduling" → "Expiry & password" (no scheduling
  feature exists — T-F2's own finding); the local label override in
  `app/(marketing)/features/access-controls/page.tsx` (which carried a
  documented DEVIATION note explaining why it existed) is retired —
  verified live (production build, both `/pricing` and
  `/features/access-controls`) that both pages render the identical
  corrected words; the DEVIATION comment updated to record the history
  rather than deleted outright. A new "## P10 backlog" section in this
  file records the API-slug-case-sensitivity-vs-Worker finding from T5 as
  a real tracked item (it was only ever documented in `lib/api-reference.ts`'s
  own notes, never turned into a follow-up) — behavior unchanged, note
  only. (b) Em-dash sweep: 47 real violations fixed across 15 files
  (`app/auth/confirm/page.tsx`, `app/p/[slug]/unlock-form.tsx`,
  `app/(app)/codes/page.tsx`, `components/api-keys/api-keys-panel.tsx`,
  `components/codes/code-analytics-panel.tsx`, `components/studio/{bulk-
  create-dialog,code-access-dialog,codes-list,controls-rail,create-code,
  kit-bar,studio-shell}.tsx`, `lib/preview.ts`, `lib/pricing.ts`) — nearly
  all the documented `"Couldn't <verb> — try again."` →
  `"Couldn't <verb>. Try again."` shape, a few structural ones restructured
  with a colon or period per the spec's own guidance. One found violation
  deliberately left alone: `lib/guardrails-excerpt.ts`'s thrown
  build-time-invariant Error message, judged not customer-facing (never
  reachable by a real visitor — `next build` fails first if its anchor
  markers ever break) and recorded as an explicit, reasoned exemption
  rather than silently skipped. New standing regression guard:
  `lib/no-em-dash.test.ts`, a source-sweep vitest spec (comment-stripped,
  line-number-preserving) over `app/`/`components`/`lib` — its own header
  comment states plainly what it covers (em-dash outside comments in those
  three trees) and what it misses (not a real parser; a handful of named
  edge cases; `e2e`/`scripts`/other packages/doc prose out of scope by
  design), plus a canary test asserting the walker actually visits a
  non-trivial file count so the main assertion can't silently pass by
  finding nothing to check.
- **Spec corrections, both caught by direct verification, not trusted from
  the label:** (1) rider 4b's VERIFIED claim that `app/u/[slug]/page.tsx`
  still shipped an em dash was false — that copy, and
  `components/marketing/state-cards.tsx`'s own comment documenting it, were
  already fixed at P9.5-T3c (`d1cee95`); both files were re-verified
  against source and left untouched. (2) the Proof section's assumption
  that the e2e fixture user is free-tier was also false —
  `e2e/global-setup.ts` mints exactly one fixture user and calls
  `setProfileToPro` unconditionally; there is no free-tier fixture. Fixed
  by adding one more step to `money-path.spec.ts`'s existing serial
  block: flip `profiles.plan` to `"free"` via the admin client, assert the
  showcase, done — placed as the deliberate LAST test in the file (an
  orchestrator-caught defect in an earlier draft restored the plan inline
  with no guard, which would have cascaded one honest failure into several
  Pro-dependent ones downstream; moving the step to last deletes that
  failure mode instead of guarding it) so no restore is needed at all
  (`playwright.config.ts` pins `workers: 1` + `fullyParallel: false`, and
  teardown deletes the fixture user regardless). The step's own comment
  states this invariant explicitly for whoever adds a test after it next.

Verified: `pnpm lint && pnpm typecheck && pnpm test` green across every
workspace package (782 vitest: 23 shared + 25 workers/status + 55
qr-engine + 138 workers/redirect + 541 web, +2 from
`lib/no-em-dash.test.ts`). `pnpm build` keeps every route's render mode
unchanged — marketing stays `○` (Static), `/api-keys`/`/codes`/`/studio`
stay `ƒ` (Dynamic). Full local e2e (`pnpm test:e2e`, `next start`, real
production Supabase fixture): **81/81 green** (65 marketing + 16
money-path/auth-scanner-safety, +2 over the T-R baseline: the `/codes`
Create-button-and-pause-toggle test and the `/api-keys` free-showcase
test), including both new assertions above.

No deviations from the spec's four numbered items. Judgment calls, all
recorded above: splitting the free `/api-keys` state into its own Server
Component rather than the spec's first-choice slot pattern; the
`useActionState` + status-keyed-remount architecture the pause control
actually needed, one tier past what "a form-action server action" alone
implied; Design-cluster-first ordering in the rail (preserves Export's
bottom placement, not separately specified); the em-dash regression test's
one explicit exemption (`lib/guardrails-excerpt.ts`).

## Phase ledger

| Phase | Status | Ref |
|---|---|---|
| P0 Foundation (monorepo, Next 16, CI, Supabase project) | ✅ | `c61b5c6` |
| P1 qr-engine (renderer + adversarially-verified guardrails, 35 tests) | ✅ | `73d663e` |
| P2 Three-way exploration at `/explore/[brand]` | ✅ | `5a74f86` |
| Checkpoint A — direction lock | ✅ closed | hero floor in design guide |
| P3 Auth + schema + RLS + pgTAP | ✅ closed (Google OAuth + SMTP verified live) | `003545b`, `1f29d47`, `2e4fb61` |
| P4 Studio + generator (Resend-infused design system, TiltStage, instrument panel) | ✅ closed | `91cd8c5`…`21f2bea` |
| P5 Dynamic codes + redirect Worker + KV + DNS cutover (qrcdn.com LIVE, instant retarget) | ✅ closed (founder-tested) | `7b068eb`, `32a3d4c` |
| P6 Dashboard + analytics rollups | ✅ shipped → founder review | `4163a49`…`abc5ce9` |
| P7 Public API + docs pages (/api/v1 live, /developers, /api-keys) | ✅ shipped | `05d5593`…`10429a6` |
| P7.5 Pro feature completion (vanity slugs, expiry+password, bulk) | ✅ shipped → founder review | `498ac62`…`1a8a290` |
| P8 Proof & Protection (e2e, monitoring, uptime, rate limiting, staged abuse controls) | ✅ shipped | `ffd3dae`…`c87974b` |
| P8.5 Stripe billing + entitlements | — deferred (board creating the account; verified zero coupling) | — |
| P9 Marketing site (reference-site IA: big-idea landing + supporting pages) | ✅ shipped → board round 2 | `649f5ee`…U6 (this commit) |
| P10 Launch hardening → **Checkpoint C** (pre-launch founder review) | — | — |

## P10 backlog

- **API slug lookups are case-sensitive while the redirect Worker matches
  case-insensitively (D12).** Found at P9.5-T5 (`lib/api-reference.ts`'s
  `slug` path-param notes document the current behavior honestly for API
  callers) but never turned into a tracked follow-up until now. Align them
  in a deliberate unit — this is a behavior decision (which side changes,
  and what it does to already-integrated callers), not a one-line fix, so
  it stays out of scope for P9.5-T7, which only adds this note.

## Open founder checkpoints

- **A (closed 2026-07-21):** precision direction locked; v4.2 hero is the codified quality floor (stale "open" note corrected 2026-07-30 — the header of this file had it right).
- **B (closed 2026-07-21):** pricing approved — Free forever tier (3 dynamic codes, never deactivated) + single Pro $12/mo · $96/yr; "your code never dies" positioning.
- **C (future):** pre-launch review.

## Environment quick refs

Supabase project `qrcdn` = `yklhpbhfowuvxlwlalhf` (free tier, org `mmfclcuvgwdmpwtnzgvw`, region `us-east-1`) · Vercel team `willgibs`, project `qrcdn` (a stray CLI-created project `web` was deleted 2026-07-22 — always confirm `.vercel/project.json` says `qrcdn` before env/deploy operations) · GitHub `willgibs/QRCDN` · DNS on Cloudflare, Workers `qrcdn-redirect` (qrcdn.com/*) and `qrcdn-status` (status.qrcdn.com, live since P9.5-T6) both on the "Will Gibson" account, `7982310e22cd9430e06c34942acf3b9a` (same account also runs two unrelated Workers `partyreel-export`/`partyreel-backup` — never touch those). Costs: $0 while building; $25/mo at launch (details: `docs/guides/infra.md`).

## Operating model (from founder, session 2)

Fable orchestrates and reviews; sonnet agents implement from tight specs and do research; haiku for mechanical edits. Every sub-agent gets `CLAUDE.md` + `docs/guides/agent-playbook.md` + the guide module for its domain. Verify (`pnpm lint && pnpm typecheck && pnpm test`) before any "done". Commit at every coherent unit; push to run CI.
