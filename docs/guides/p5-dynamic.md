# P5 spec — Dynamic codes + redirect Worker + KV + DNS

Read alongside: `docs/DECISIONS.md` (D1 topology, D2 KV-cache/Postgres-truth, D3 scan ingest, D5 frozen snapshots), `docs/guides/infra.md` (DNS plan, env conventions, cost posture), `docs/guides/agent-playbook.md`.

## Scope

1. **Dynamic code CRUD** — create from the studio's current style (snapshot frozen into `qr_codes.style` at create time, D5 — brand-kit edits NEVER touch it), list codes, retarget (update destination), pause/resume. Entitlements: free = 3 dynamic codes, pro = 250 (`lib/entitlements.ts` only).
2. **Slug generation** — 7 chars, QR-alphanumeric charset minus confusables (`23456789ABCDEFGHJKMNPQRSTVWXYZ` — no 0/O/1/I/L/U), uppercase (schema check already enforces), collision-retry on unique violation. Printed form `HTTPS://QRCDN.COM/{slug}` (alphanumeric-mode dense encoding, D1).
3. **Redirect Worker** (`workers/redirect`) — `GET qrcdn.com/{slug}`: `KV.get(slug, {cacheTtl: 60})` → miss = read-through to Supabase REST (secret key as Worker secret) + KV backfill → **302 + `Cache-Control: no-store`, never 301** (hard rule). Paused/missing → 302 to `www.qrcdn.com/u/{slug}`. Non-slug paths → 301 to `www.qrcdn.com`. Scan ingest fire-and-forget via `ctx.waitUntil` (D3: geo from request.cf, coarse UA, sha256(ip+daily salt), referer; bot filter; 1 retry).
4. **Retarget flow** — Postgres UPDATE first, then write-through PUT to KV (retry once). Staleness ≤60s ("live everywhere within ~1 minute").
5. **Infra** — KV namespace (Cloudflare MCP), wrangler.jsonc route + binding uncommented, Worker secrets via `wrangler secret put`, deploy. DNS: apex `qrcdn.com` proxied dummy AAAA `100::` + Worker route `qrcdn.com/*`; `www` CNAME → `cname.vercel-dns.com` grey-cloud (D1); Vercel domain attach for www. Zone SSL Full (strict) verify.
6. **Studio hook** — "Create dynamic code" affordance (payload becomes managed; shows assigned short URL); codes list surface (minimal — full dashboard is P6).

Out of scope: analytics dashboard (P6), rollup job (P6), API (P7), custom domains.

## Units

| Unit | Owner | Contents |
|---|---|---|
| U1 backend | sonnet | slug util (+tests incl. charset/collision), dynamic-code server actions (create w/ snapshot + entitlement, list, retarget, pause/resume) — retarget also fire-and-forget PUTs KV via Worker admin route? NO: KV write-through happens via Cloudflare REST API from the server action (env-gated, no-op locally without creds); pgTAP already covers qr_codes RLS |
| U2 worker | sonnet | Worker redirect logic + scan ingest + unit tests (vitest + workers-types v5, wrangler dev harness); hard-rule assertions (302/no-store) as tests |
| U3 infra | fable (+ Cloudflare MCP) | KV namespace, secrets, deploy, routes, DNS records, Vercel www domain, live cutover verification (curl matrix) |
| U4 studio hook | sonnet | create-code UI + codes list at floor register; live review |

Verification bar unchanged. Worker hard rules restated in every unit brief: 302+no-store never 301; no per-scan qr_codes writes; ip hashed never raw.
