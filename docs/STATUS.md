# Status

_Last updated: 2026-07-21 (session 2). Update this file at every phase boundary or significant commit._

## Current phase

**Checkpoint A (brand direction lock) — in progress.**
Founder reviewed the three explorations and chose "Precision instrument" as the anchor, refined toward an Apple-esque register per references lazy.so / genie.io / stellar.work. The reference formula (already extracted): one enormous plain-spoken headline owning the viewport · extreme restraint (single accent, hierarchy from scale/space) · quiet gray subcopy · one strong CTA · eyebrow-labeled benefit sections · product visuals in soft frames.

In flight:
- `apps/web/app/themes/precision.css` — v2 values done (Inter display, violet-blue accent, deeper dark surfaces).
- `apps/web/components/explore/hero.tsx` — being restructured (centered, larger scale, soft-framed QR card).
- After founder approves v2 → run the D13 lock protocol (collapse winner into `:root`/`.dark`, delete warmth/bold themes + unused fonts, remove `data-brand`).

## Phase ledger

| Phase | Status | Ref |
|---|---|---|
| P0 Foundation (monorepo, Next 16, CI, Supabase project) | ✅ | `c61b5c6` |
| P1 qr-engine (renderer + adversarially-verified guardrails, 35 tests) | ✅ | `73d663e` |
| P2 Three-way exploration at `/explore/[brand]` | ✅ | `5a74f86` |
| Checkpoint A — direction lock | 🔄 | this file |
| P3 Auth + schema + RLS + pgTAP | ⏭ next | — |
| P4 Studio + generator | — | — |
| P5 Redirect Worker + KV + DNS cutover | — | — |
| P6 Dashboard + analytics rollups | — | — |
| P7 Public API + docs pages | — | — |
| P8 Stripe billing + entitlements | — | — |
| P9 Marketing site (reference-site IA: big-idea landing + supporting pages) | — | — |
| P10 Launch hardening → **Checkpoint C** (pre-launch founder review) | — | — |

## Open founder checkpoints

- **A (open):** approve precision-v2 refinement → lock design system.
- **B (closed 2026-07-21):** pricing approved — Free forever tier (3 dynamic codes, never deactivated) + single Pro $12/mo · $96/yr; "your code never dies" positioning.
- **C (future):** pre-launch review.

## Environment quick refs

Supabase project `qrcdn` = `yklhpbhfowuvxlwlalhf` (free tier) · Vercel team `willgibs` · GitHub `willgibs/QRCDN` · DNS on Cloudflare (2 unrelated Workers already in account). Costs: $0 while building; $25/mo at launch (details: `docs/guides/infra.md`).

## Operating model (from founder, session 2)

Fable orchestrates and reviews; sonnet agents implement from tight specs and do research; haiku for mechanical edits. Every sub-agent gets `CLAUDE.md` + `docs/guides/agent-playbook.md` + the guide module for its domain. Verify (`pnpm lint && pnpm typecheck && pnpm test`) before any "done". Commit at every coherent unit; push to run CI.
