# P7 spec — Public API + key management + docs page

Read alongside: `docs/DECISIONS.md` (D11 key format + its P7 amendment, D14 gating,
D15 cost posture), CLAUDE.md ("single scoped API endpoint" positioning),
`docs/guides/agent-playbook.md`.

## Scope (as shipped)

1. **Key format** (`apps/web/lib/api-keys.ts`) — `qrcdn_live_` + 32 base62
   (rejection-sampled CSPRNG) + 6-char zero-padded base62 CRC32 tail (IEEE 802.3,
   computed over prefix+random). sha256 → `\x<hex>` bytea storage, unique-index
   lookup; `key_prefix` (first 15 chars) is the only displayable remnant. CRC
   precheck rejects typos with zero DB cost.
2. **Quota** (migration 008) — `api_usage (key_id, month)` + `increment_api_usage()`:
   the app's first `.rpc()`, justified in-file (PostgREST upserts can't express
   `count = count + 1`); security-definer, revoked from PostgREST roles, granted to
   `service_role`. UTC calendar month, computed server-side. **Fresh-stack gotcha
   caught at U1:** new tables post-migration-004 need their own explicit table
   `grant` — cloud's default-privileges mask this; a from-scratch stack doesn't.
3. **Core extraction** (`apps/web/lib/codes-core.ts`) — the five studio actions'
   logic + `getCodeBySlugCore`/`getCodeAnalyticsCore`, every query explicitly
   `.eq("owner_id", …)`-scoped. Under the studio's RLS client that's
   defense-in-depth; under the API's admin client it is **the only tenant
   boundary** — treat any query change in that file as security-review-required.
   Analytics owner-gates before touching scan tables (IDOR guard).
4. **`/api/v1`** — bearer auth pipeline (`lib/api-auth.ts`): parse → CRC precheck →
   hash lookup → revoked check (**401 identical to unknown** — never reveals a key
   was once valid) → plan gate (403 `api_not_available` off Pro) → quota RPC (429)
   → `after()`-scheduled `last_used_at` touch. Routes: GET/POST `/codes`,
   GET/PATCH `/codes/{slug}`, GET `/codes/{slug}/analytics`. 404 =
   not-found-or-not-owned, indistinguishable. `url` field is the lowercase
   display form (the uppercase alphanumeric form stays print-only).
5. **Key management UI** (`/api-keys`) — reveal-once mint (secret exists only in
   transient client state; only the hash persists), two-step revoke, per-key
   this-month usage, Pro-gated at UI **and** server. Free plan sees an honest
   upsell.
6. **Docs** (`/developers`) — static, indexable, floor register, shapes mirrored
   from the route code.

Out of scope: burst rate limiting (P10 — Vercel WAF + `@vercel/firewall` are
Pro-tier; D11 amendment), vanity slugs in the API (P7.5), Stripe plan changes (P8).

## Behavioral fine print (documented, deliberate)

- Authenticated requests **count toward quota even when they later fail
  validation** (metering runs pre-handler); 401s never count.
- PATCH with both `destination` and `paused` = two sequential writes; a failure
  on the second leaves the first applied (accepted, same tone as the kit-limit
  race).
- Pause/retarget propagate to KV instantly, but the Worker reads KV with
  `cacheTtl: 60` — a just-changed code can serve the prior state for up to 60s
  at a given edge (verified live; D2's staleness envelope).
- 422 `message` currently carries machine codes for field-validation failures
  (`invalid_destination`, `empty_patch`, …) and human sentences elsewhere —
  normalize at P10 polish.
- Analytics `totals` come from `scan_daily` (excludes today); `today.scans` is
  the live layer. A fresh code shows `today > 0, totals = 0` until the hourly
  rollup ticks — correct, not a bug.

## Live verification (2026-07-23, production, full matrix green)

Throwaway pro test user (created via our own auth admin API, cascade-deleted to
zero residue afterward; founder's account untouched — no real entitlement
changes): 401 no-auth / 401 garbage-key (CRC gate) / 403 free-plan key /
**201 create → real slug QFS279E → live scan 302** / list + get 200 /
**PATCH retarget → next scan followed the new destination instantly** /
PATCH pause → post-cache scan 302 → `/u/QFS279E` (the P6.5 fallback page,
exercised by its own API sibling) / analytics live-vs-rollup split correct /
revoked key 401 byte-identical to unknown / `api_usage` count exactly matched
authenticated request count. PostgREST bytea `.eq()` round-trip proven live
before U3 was declared done.

## Units

| Unit | Owner | Contents |
|---|---|---|
| A0 CI efficiency | fable | rls.yml path-gated split, cancel-in-progress, docs-ignore |
| A1 backup arming | fable | Management-API password rotation + pooler secret, zero-transcript |
| U1 key lib + migration | sonnet | api-keys.ts (22 tests), migration 008, pgTAP (13), typegen |
| U2 codes-core | sonnet | owner-scoped extraction (+25 tests), thin actions |
| U3 /api/v1 | sonnet | api-auth.ts + 3 routes (+26 tests), proxy matcher |
| U4 key UI | sonnet | /api-keys page + actions (+19 tests), nav |
| U5 docs | sonnet/fable | /developers page, this spec, D11 amendment, live matrix |

Verification bar: local lint/typecheck/test green per unit (the standing primary
gate); pgTAP logic hand-verified on scratch Postgres during the Actions billing
freeze, CI re-proof queued for Actions restoration.
