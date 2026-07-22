# P4 spec — Studio + generator

Read this before touching P4 work. Companion modules: `qr-engine.md` (engine contract + scannability limits), `design-system.md` (quality floor + tokens), `agent-playbook.md` (guardrails).

## Scope

1. **Brand kit CRUD** — create/rename/delete kits, set default (one-default partial unique index already enforces), each kit stores a style JSON (shared zod schema, `STYLE_SCHEMA_VERSION`-tagged) + optional logo.
2. **Studio** — the authenticated `/studio` surface: style controls with **live qr-engine preview** and **live scannability report**; loads/saves brand kits.
3. **Static code create/download** — client-side SVG + PNG export. Static codes are unlimited/free and are **not persisted** (no `qr_codes` rows in P4 — that table is for dynamic codes, P5).

Out of scope: dynamic codes, slugs, redirects, analytics (P5/P6). Pro gating beyond kit-count (P8 wires Stripe; entitlement checks still enforced now from `lib/entitlements.ts`).

## Decisions

- **Preview renders client-side** with `@qrcdn/qr-engine` (isomorphic + deterministic — that's why it exists). Controls mutate a `QrStyle` object; preview + `scannabilityReport` re-run on change. No server round-trips for preview.
- **PNG export client-side**: SVG → canvas rasterize at user-chosen size (512/1024/2048/4096, engine pixelSize guard is 1..16384). sRGB hex only reaches the engine (hard rule) — studio controls emit hex, never oklch tokens.
- **Logo storage**: private Supabase Storage bucket `brand-logos`, path `{owner_id}/{kit_id}` — owner-scoped storage RLS (select/insert/update/delete where first path segment = auth.uid()). Studio embeds the logo in exports as a data URI (engine accepts png/jpeg/webp data URIs only — svg+xml is rejected by design).
- **Style snapshots stay frozen** (D5): P4 only touches `brand_kits.style`; when P5 creates dynamic codes it snapshots the kit style into `qr_codes.style`. Nothing in P4 may write `qr_codes`.
- **Entitlements**: kit creation checks `PLAN_LIMITS[plan].brandKits` server-side (free = 1). Limit reached → inline upgrade prompt, never a hard error page.
- **Server actions** (not route handlers) for kit CRUD; zod-parse every input with the shared schema; `getClaims()` guard + ownership enforced by RLS either way.

## Units

| Unit | Owner | Contents |
|---|---|---|
| U1 backend | sonnet agent | Storage bucket + RLS migration (005), kit CRUD server actions with entitlement checks, pgTAP for storage policies, vitest for validation logic |
| U2 studio shell | fable design → sonnet build | `/studio` layout at the quality floor (replaces P3 placeholder): controls rail / preview stage / kit bar; also lift `/login` card to the floor (currently scaffold-grade full-width — known issue) |
| U3 live engine | sonnet agent (fable reviews) | Controls ↔ engine binding, scannability chip (clean/warn/error states), logo upload + effective-ratio feedback, SVG/PNG export |
| U4 red team | fable | review-animations gate, breakpoint matrix on production build, adversarial scannability inputs (floor-version logos, dense payloads, low contrast), founder checkpoint |

Verification bar per unit: `pnpm lint && pnpm typecheck && pnpm test` + relevant pgTAP; UI units additionally follow the design-task addendum in the agent playbook.
