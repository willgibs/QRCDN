# QRCDN

Design-forward QR platform: brand style system → generator → dynamic codes on persistent short URLs → scan analytics → single scoped API endpoint. Free tier + Pro ($12/mo · $96/yr). Core positioning: "your code never dies" — free dynamic codes redirect forever.

Architecture decisions and their rationale: `docs/DECISIONS.md`. Read it before changing infrastructure, schema, or the redirect path.

## Repo layout (pnpm workspaces)

- `apps/web` — Next.js 16 App Router on Vercel: marketing `(marketing)`, authenticated app `(app)`, API routes. Canonical host: `www.qrcdn.com`.
- `workers/redirect` — Cloudflare Worker serving `qrcdn.com/{slug}` scan redirects (KV cache over Postgres, 302 + no-store, waitUntil ingest).
- `packages/qr-engine` — pure-TS styled QR renderer (SVG string generation, zero DOM/Node deps). Same code renders browser previews and server exports.
- `packages/shared` — style JSON zod schema (version-tagged), slug utils, shared types.
- `supabase/` — migrations (source of truth for schema), pgTAP RLS tests.

## Hard rules

- Scan redirects are **302 + `Cache-Control: no-store`, never 301** (301 caches client-side forever and kills retargeting).
- `qr_codes.style` is a **frozen snapshot**; never mutate it when a brand kit changes. Style schema evolves additively only.
- Exported QR assets are **sRGB hex only** — oklch design tokens must never leak into `qr-engine` output.
- Per-scan writes never touch `qr_codes` (no hot-row counters); analytics reads come from `scan_daily` rollups.
- Supabase: new `sb_publishable_`/`sb_secret_` keys only; `getClaims()` for page guards, `getUser()` before destructive/billing actions, never trust `getSession()` server-side.
- Entitlement limits live in `apps/web/lib/entitlements.ts` only; enforce in every server action and API route.
- Downgrade behavior: codes pause or go read-only — **never delete, never stop redirecting** (product promise).

## Gotchas

- **Next.js 16 differs from training data.** Bundled docs: `apps/web/node_modules/next/dist/docs/`. Highlights: `proxy.ts` replaces `middleware.ts`; `cookies()/headers()/params/searchParams` are async-only; Turbopack is default for dev+build; `revalidateTag(tag, profile)` takes two args, `updateTag` for read-your-writes.
- Tailwind v4 CSS-first: tokens in `app/globals.css` via `@theme`; no tailwind.config.
- shadcn/ui current CLI: style `radix-nova`, components vendored under `components/ui` — pin after customizing; upgrades are manual diffs.
- zod is v4, vitest is v4, `@cloudflare/workers-types` is v5 — check current APIs before assuming v3-era signatures.

## Commands

- `pnpm dev` — Next dev server (from root)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` — fan out to all packages
- `pnpm supabase <cmd>` — Supabase CLI (project ref `yklhpbhfowuvxlwlalhf`)
