# Architecture Decision Log

Decisions from the approved build plan (2026-07-21), backed by a 5-agent research
workflow with adversarial fact-checking against primary sources. Change these only
with a documented reason and founder sign-off where marked (product).

## D1 — Domain topology: short URLs on the apex

`qrcdn.com/{slug}` is served by a Cloudflare Worker (apex orange-clouded, route
`qrcdn.com/*`); non-slug paths 301 to `www.qrcdn.com`, which is the canonical
app+marketing host, grey-cloud (DNS-only) to Vercel — Vercel explicitly warns
against proxying Cloudflare in front of it. Printed URLs are uppercase
(`HTTPS://QRCDN.COM/K7M2X9A`): fully QR-alphanumeric-mode encodable → version 2–3
symbols, materially denser than byte mode. Zone SSL: Full (strict).

## D2 — Redirect data path: KV as cache, Postgres as truth

Worker does `KV.get(slug, {cacheTtl: 60})`; on miss, read-through to Supabase REST
and backfill. Retarget = Postgres UPDATE then write-through PUT to KV (retry once);
worst-case staleness ≈ 60s ("live everywhere within ~1 minute" in UX copy).
Scan redirects: **302 + no-store, never 301.** Paused/expired/password → 302 to
`www.qrcdn.com/u/{slug}`. Redirects keep working even if Supabase is down/paused.

## D3 — Scan ingest: waitUntil fire-and-forget at v1

`ctx.waitUntil()` POST to Supabase REST (secret key as Worker secret) with one retry.
Event: code_id, ts, geo from `request.cf` (free on all CF plans), coarse UA parse,
`sha256(ip + daily salt)` (no raw IP), referer. Bot filter (UA + HEAD) at ingest.
<0.5% loss is acceptable — analytics is directional. Upgrade path: Cloudflare Queues
(+$0.80/M scans) when Pro customers depend on the numbers.

## D4 — Own the QR renderer

`packages/qr-engine`: pure-TS SVG string generation; `qrcode` npm supplies the module
matrix behind a `boolean[][]` adapter (Nayuki qrcodegen vendorable as fallback).
Rejected `qr-code-styling` server-side (needs jsdom/node-canvas; stale forks). PNG via
`@resvg/resvg-js` in the web app only (Node runtime; 4.4MB prebuilt; MPL-2.0 fine as
unmodified dependency; proven by Vercel's own OG pipeline). Engine stays dependency-pure.

## D5 — Style JSON is a frozen snapshot per code

`qr_codes.style` snapshots the brand kit at creation; re-render must reproduce printed
artifacts forever. Explicit "re-sync from kit" re-snapshots. Schema is version-tagged
(`{v:1,...}`), additive-only evolution, zod-validated in `packages/shared`.

## D6 — Scannability guardrails (product differentiator)

Quiet zone ≥4 modules · ECC H forced when logo knockout on (Q allowed ≤10% coverage) ·
contrast ≥3:1 (4:1 recommended), worst gradient stop governs · dot sizeRatio ≥0.4 ·
eyes are dedicated solid shapes, exempt from dot styling · print calculator
≥0.33mm/module, warn <2×2cm · zxing-wasm decode round-trip in CI and live
"scannability score" in the studio.

**Logo limits are empirical, not theoretical** (measured 2026-07-21 across two
adversarial decode campaigns, 160+ combos): concentrated central knockout fails
beyond ~16-17% area even at ECC H — theoretical 30% codeword recovery does not
survive concentrated damage. Enforced as *effective* linear ratio — sizeRatio +
padding dilution **at the version the renderer actually floors to** (computing it
against the wrong version shipped score-100 undecodable codes): clean ≤0.395,
warn ≤0.412, error above. Floor version: v3 while effective-at-v3 ≤0.395, else v5.
ECC Q exemption also gates on the padding-inclusive effective ratio (≤0.316 ≈ 10%
area), never raw sizeRatio. Schema hard cap sizeRatio 0.40, studio default 0.32.
Leaf eye frames use 2.25/1.25 radii — heavier rounding broke zxing finder
detection on v7+ symbols at small rasters. Decode round-trips can NOT validate
contrast rules (zxing's binarizer reads 1.23:1 clean rasters fine) — the 3:1/4:1
contrast guardrail protects real camera/print conditions and must stay analytic.

## D7 — Hosted assets: on-demand + versioned immutable URLs

`www.qrcdn.com/a/{slug}/{styleVersion}.(svg|png)`, `max-age=31536000, immutable`.
Style edit bumps styleVersion → new URL; zero invalidation machinery. Printed materials
embed the *scan* URL, never the image URL. No pre-rendering into storage.

## D8 — Analytics storage: rollups over raw

`scan_events` append-only → pg_cron hourly upsert into `scan_daily` (+ nightly
scan_count update + retention purge: free 30d raw, Pro 365d). No partitioning or
materialized views until >5–10M rows/month. Free-tier 500MB ≈ 2M raw rows of headroom.

*Amended at P6 (2026-07-22):* two mechanics changed at implementation, intent
unchanged. (1) `scan_count` updates **hourly, not nightly** — folded into the same
pg_cron `rollup_scan_daily()` call as one cheap UPDATE scoped to touched codes;
users testing a fresh code should see numbers move within the hour, not overnight.
(2) The **retention purge moved off pg_cron** to an app-layer route
(`apps/web/app/api/cron/purge/route.ts`, Vercel Cron daily, `CRON_SECRET`-guarded):
the free/pro day-counts it needs are single-sourced in
`apps/web/lib/entitlements.ts` (hard rule), so a SQL cron job would have had to
duplicate them. Rollup stays in Postgres; retention enforcement lives where the
retention constants live.

## D9 — Auth: Supabase `@supabase/ssr`, new API keys only

`sb_publishable_`/`sb_secret_` keys (legacy anon/service_role die end-2026). Magic link
+ Google OAuth. Custom SMTP via Resend from day one (built-in SMTP throttles at a few
emails/hour). `proxy.ts` (Next 16) runs updateSession; all `(app)` routes force-dynamic.

## D10 — Stripe: sync-from-source webhooks

Webhooks never apply event deltas; every relevant event triggers
`syncStripeState(customerId)` — fetch current subs from Stripe, upsert, recompute
`profiles.plan` in one transaction. Idempotent, order-insensitive. Checkout + Billing
Portal; customer created and persisted before first session.

## D11 — API keys: prefix + sha256

`qrcdn_live_` + 32 base62 + CRC tail; store prefix (display) + sha256 hash
(unique-index O(1) lookup — slow hashes unnecessary at ≥128-bit entropy). Rate limiting:
Vercel WAF rule + `@vercel/firewall` checkRateLimit per key + Postgres monthly quotas.

## D12 — Slugs

Auto: 7 chars, uppercase A–Z + 2–9 minus `I L O 0 1` (31 symbols, ~27.5B space),
insert-on-conflict retry. Worker matches case-insensitively. Vanity (Pro): 4–30 chars,
reserved blocklist (`api www a u admin ...`), single namespace.

*Amended at P5-U1 (2026-07-22):* charset also drops `U` (V/U print confusion) —
final set `23456789ABCDEFGHJKMNPQRSTVWXYZ`, 30 symbols, ~21.9B space. Implemented
in `apps/web/lib/slug.ts` (charset-purity tests pin it); the U1 agent flagged the
drift between this entry and the P5 spec, spec won.

## D13 — Design tokens: 3-layer, names locked (product: direction TBD checkpoint A)

Layer 0 primitives + Layer 1 semantic vars (shadcn names verbatim + `--surface-studio`,
`--qr-fg/--qr-bg`, `--font-display/body/mono`) per-theme under `:root[data-brand=…]`;
Layer 2 `@theme inline` written once. Semantic *names* frozen; explorations change
*values* only. After direction pick: collapse winner into `:root`/`.dark`, delete rest.

## D14 — Pricing (product, approved 2026-07-21)

Free: unlimited static + studio, 3 dynamic codes forever (unlimited scans, retargeting
always allowed, never deactivated), 1 kit, 30d analytics. Pro $12/mo · $96/yr: 250
dynamic (soft cap), unlimited kits, full analytics + city geo, API 10k/mo, expiry/
password/bulk/vanity. Downgrade: codes keep redirecting, read-only beyond free 3.
"Your code never dies" is the core positioning; ToS carve-out for malicious use only.
Abuse controls: Turnstile signup, Safe Browsing on destination changes, retarget rate limits.

## D15 — Cost posture

Building: $0 (Vercel Hobby + Supabase Free `yklhpbhfowuvxlwlalhf` + CF Free).
Launch: $25/mo — Vercel Pro $20 + **Workers Paid $5 (mandatory: free tier's 100k
req/day cap would dead-end every printed code on one viral day)**. Supabase Pro $25
at first real customers (free tier has no backups — nightly pg_dump cron until then).
