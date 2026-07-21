# Status

_Last updated: 2026-07-21 (session 2, checkpoint-A v3 shipped). Update this file at every phase boundary or significant commit._

## Current phase

**Checkpoint A (brand direction lock) — in progress.**
Founder reviewed the three explorations and chose "Precision instrument" as the anchor, refined toward an Apple-esque register per references lazy.so / genie.io / stellar.work. The reference formula (already extracted): one enormous plain-spoken headline owning the viewport · extreme restraint (single accent, hierarchy from scale/space) · quiet gray subcopy · one strong CTA · eyebrow-labeled benefit sections · product visuals in soft frames.

Iteration history: v1 (three directions) → founder picked precision + references → v2 (Inter display, restraint) → founder: "far too minimalist, zero design magic, hero looked broken at laptop viewports" → v3 rejected ("still nowhere close" — founder supplied his own broken-viewport screenshot + Genie/Pipeline/Stellar full-page references, mandated precision-only, transitions.dev, and the emilkowalski skills) → v4 reviewed (founder: massive improvement; first two sections appeared broken in his dev-tab view — root-caused to mid-compile HMR states, production build verifies clean; remaining sections needed the same bar) → **v4.1 (current, awaiting review on the PRODUCTION server localhost:3001)**: analytics rebuilt as a framed dashboard window with stat pop-ins + top-codes strip; pricing gained the monthly/annual sliding toggle (annual default, $8/mo framing), trust FAQ accordion (transitions.dev pattern), structured footer. Review each round on `next start -p 3001`, never the dev server. v4 notes: D13 lock executed precision-only; scan-network hero artwork (Pipeline-style traces + cycling destination chips); Genie-style framed product windows (studio + dashboard); taste toolchain installed (9 agent skills under .agents/skills/); motion token system; review-animations gate run and its Block findings fixed (transition-all removal, chip translateY entrances, reduced-motion gaps, token-consistent easings). Superseded v3 notes: atmosphere layer (violet glow + QR-module grid texture), two-column hero fitting the 1440×900 fold, glass gradient-border QR card with a live retargeting demo, motion system (`motion` pkg; entrance stagger + scroll reveals, reduced-motion aware), ModuleMark eyebrow glyphs, functional ink-color studio control, gradient chart fill, glowing Pro pricing card + "never dies" guarantee strip.

In flight:
- After founder approves v2 → run the D13 lock protocol: (1) copy precision's Layer 0/1 values into `:root`/`.dark` in `globals.css`, (2) delete `app/themes/*.css` + their imports, (3) remove `data-brand` plumbing from explore pages or delete `/explore` entirely, (4) remove unused font loaders from `app/fonts.ts` (keep Inter + JetBrains Mono), (5) update `brandQrBackdrop`/`brandQrStyles` consumers. Semantic token names never change (D13).

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
