# Agent playbook

**Every sub-agent reads this file before starting work.** Read this when you are any Claude agent (fable or sonnet, orchestrator or sub-agent) picking up a QRCDN task.

## Mission context

QRCDN is a design-forward QR platform: brand style system → generator → dynamic codes on persistent short URLs → scan analytics → single scoped API endpoint. Free tier + Pro ($12/mo · $96/yr). Core positioning: "your code never dies." Full repo map and knowledge-module index: `CLAUDE.md` (root). Current phase, in-flight work, and next actions: `docs/STATUS.md` — **read it every session**, it's the single source of truth for "what's happening right now."

## Model tiers

| Tier | Use for |
|---|---|
| **fable** | Architecture decisions, security-sensitive changes, founder-facing work (copy/positioning/pricing decisions, anything that needs a founder checkpoint) |
| **sonnet** | Implementation from a tight spec, research, doc drafting |
| **haiku** | Mechanical edits/renames — no judgment calls |

Orchestration model (from the founder, `docs/STATUS.md`): fable orchestrates and reviews; sonnet agents implement from tight specs and do research; haiku handles mechanical edits. Every sub-agent gets `CLAUDE.md` + this file + the guide module for its domain (`docs/guides/qr-engine.md`, `docs/guides/design-system.md`, or `docs/guides/infra.md`). `docs/DECISIONS.md` is cross-cutting, not optional: read it whenever your task touches infrastructure, schema, redirect behavior, billing, or pricing — and read the specific `D#` any doc cites at you.

## Mandatory guardrails

### The 7 hard rules (verbatim from `CLAUDE.md` — non-negotiable)

- Scan redirects: **302 + `Cache-Control: no-store`, never 301.**
- `qr_codes.style` is a **frozen snapshot** — never mutated by brand-kit edits. Style schema evolves additively only.
- Exported QR assets are **sRGB hex only** — oklch tokens never reach `qr-engine` output.
- No per-scan writes to `qr_codes`; dashboards read `scan_daily` rollups.
- Supabase: new `sb_publishable_`/`sb_secret_` keys only; `getClaims()` for page guards, `getUser()` before destructive/billing actions, never trust `getSession()` server-side.
- Entitlement limits live in `apps/web/lib/entitlements.ts` only.
- Downgrade: codes pause or go read-only — **never delete, never stop redirecting.**

### Additional standing rules for every agent

- **Never run destructive git commands** (`push --force`, `reset --hard`, `checkout .`/`restore .`, `clean -f`, `branch -D`) unless the user/orchestrator explicitly requests it in this task's instructions.
- **Never touch `supabase/migrations` retroactively** — schema changes are new migration files only, forward-only. Editing a migration that's already landed rewrites history other environments have already applied.
- **Never commit secrets or env values** — no `.env` contents, API keys, Supabase secret keys, or Worker secrets in commits, logs, or reports. Reference them by name, never by value.
- **Never add a dependency silently** — if a task requires a new package, add it, but call it out explicitly in your final report (name, version, why). Don't let it hide in a diff.
- **Exported QR assets are sRGB hex, never oklch** — this is the same rule as the hard-rules list above, repeated here because it's the rule most likely to be violated accidentally when wiring UI (oklch) tokens into `qr-engine` (hex-only) inputs. See `docs/guides/design-system.md` for the `--qr-fg`/`--qr-bg` bridge tokens that exist specifically to enforce this boundary.

## Verification protocol — run before reporting "done"

From the repo root:

```
pnpm lint && pnpm typecheck && pnpm test
```

If your task touched `packages/qr-engine` (renderer, guardrails, or the style schema in `packages/shared`), also run the decode round-trip suite directly — it's slower than the rest of the test fan-out and worth calling out separately in your report:

```
cd packages/qr-engine && pnpm vitest run
```

Do not report a task complete with a failing or skipped verification step. If a step fails for a reason unrelated to your change (pre-existing failure), say so explicitly in your report rather than silently omitting it.

## Commit conventions

- Subject: imperative, prefixed with the phase tag, e.g. `P3: add RLS policies for qr_codes`. See `docs/STATUS.md`'s phase ledger for the current phase tag (`P0`–`P10`, or `Checkpoint A/B/C` for founder-review points).
- Body: explain **why**, not a restatement of the diff — link to the relevant `D#` decision or `STATUS.md` line if the change follows from one.
- Footer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Sub-agents normally do not commit** — the orchestrator commits after reviewing sub-agent output, unless the task explicitly says otherwise. If you're a sub-agent and unsure, don't commit; hand back a diff/summary instead.

## Reporting format

Every "done" report should cover:

1. **What changed** — one or two sentences, plain language.
2. **Files touched** — absolute paths.
3. **Verification output** — the actual result of `pnpm lint && pnpm typecheck && pnpm test` (and the qr-engine decode suite if applicable), not just "passed."
4. **Anything surprising** — contradictions with `DECISIONS.md`/`STATUS.md`, dead code found, existing bugs noticed but out of scope.
5. **Dependencies added**, if any (name, version, why) — see guardrail above.

## Version gotchas (from `CLAUDE.md`)

- **Next.js 16 differs from training data.** Docs are bundled locally at `apps/web/node_modules/next/dist/docs/` — read the relevant guide there before writing App Router code. `apps/web/AGENTS.md` reinforces this: "This is NOT the Next.js you know." Specifics: `proxy.ts` replaces `middleware.ts`; request APIs (`params`, `searchParams`, `cookies()`, `headers()`) are async-only; Turbopack is the default bundler; `revalidateTag(tag, profile)` takes a second argument now.
- **Tailwind v4 is CSS-first** — theme config lives in `@theme`/`@theme inline` blocks inside `apps/web/app/globals.css`; there is no `tailwind.config.ts`. See `docs/guides/design-system.md` for the token layering this enables.
- **zod v4, vitest v4, `@cloudflare/workers-types` v5** are all in use — verify current APIs against installed `node_modules` or current docs before assuming v3-era signatures; training-data examples for these libraries are likely stale.
- shadcn/ui style is `radix-nova` (`apps/web/components.json`), vendored under `apps/web/components/ui/` — don't reintroduce a different shadcn style or bypass the vendored components for primitives that already exist there.
