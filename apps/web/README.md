# web

The Next.js 16 app: marketing site, authenticated studio and codes app, and
the `/api/v1` surface. Deploys to Vercel; canonical host `www.qrcdn.com`.

- Run from the repo root: `pnpm dev` (this package is the target).
- Verify from the repo root: `pnpm lint && pnpm typecheck && pnpm test`.
- End-to-end tests live in `e2e/` and run against a production build
  (`next build` + `next start`), never the dev server: the bundled
  server-action registry is part of what they exist to test.
- Conventions that surprise: Next.js 16 (`proxy.ts` instead of
  `middleware.ts`, async-only request APIs, Turbopack) — see `AGENTS.md`;
  Tailwind v4 is CSS-first (`app/globals.css`, no config file); shadcn/ui is
  vendored under `components/ui/`. Invariants: the root `CONTRIBUTING.md`.
