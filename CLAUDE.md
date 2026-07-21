# QRCDN

Design-forward QR platform: brand style system → generator → dynamic codes on persistent short URLs → scan analytics → single scoped API endpoint. Free tier + Pro ($12/mo · $96/yr). Core positioning: "your code never dies."

**Start here every session:** `docs/STATUS.md` — current phase, in-flight work, next actions.

## Repo map (pnpm workspaces)

- `apps/web` — Next.js 16 App Router (Vercel): marketing + authenticated app + API. Canonical host `www.qrcdn.com`.
- `workers/redirect` — Cloudflare Worker: `qrcdn.com/{slug}` scan redirects.
- `packages/qr-engine` — pure-TS styled QR renderer (isomorphic, deterministic SVG).
- `packages/shared` — style JSON zod schema, slug utils, shared types.
- `supabase/` — migrations (schema source of truth), pgTAP RLS tests.

## Knowledge modules — read the one your task touches

- `docs/DECISIONS.md` — architecture decision log (D1–D15) with rationale. Read before changing infrastructure, schema, or redirect behavior.
- `docs/guides/agent-playbook.md` — **every sub-agent reads this**: delegation tiers, mandatory guardrails, verification before "done", commit conventions.
- `docs/guides/qr-engine.md` — engine contract, empirical scannability limits, how to extend styles safely.
- `docs/guides/design-system.md` — token architecture, lock protocol, brand direction, fonts, component inventory.
- `docs/guides/infra.md` — accounts/refs, env conventions, DNS topology, cost posture.

## Hard rules (non-negotiable)

- Scan redirects: **302 + `Cache-Control: no-store`, never 301.**
- `qr_codes.style` is a **frozen snapshot** — never mutated by brand-kit edits. Style schema evolves additively only.
- Exported QR assets are **sRGB hex only** — oklch tokens never reach `qr-engine` output.
- No per-scan writes to `qr_codes`; dashboards read `scan_daily` rollups.
- Supabase: new `sb_publishable_`/`sb_secret_` keys only; `getClaims()` for page guards, `getUser()` before destructive/billing actions, never trust `getSession()` server-side.
- Entitlement limits live in `apps/web/lib/entitlements.ts` only.
- Downgrade: codes pause or go read-only — **never delete, never stop redirecting.**

## Gotchas

- **Next.js 16 differs from training data** — docs bundled at `apps/web/node_modules/next/dist/docs/`. `proxy.ts` replaces `middleware.ts`; request APIs are async-only; Turbopack default; `revalidateTag(tag, profile)`.
- Tailwind v4 CSS-first (`@theme` in `app/globals.css`, no config file). zod v4, vitest v4, workers-types v5 — verify current APIs, don't assume v3-era signatures.
- shadcn/ui style `radix-nova`, vendored under `components/ui/`.

## Commands

`pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` (all from root, fan out) · `pnpm supabase <cmd>`
