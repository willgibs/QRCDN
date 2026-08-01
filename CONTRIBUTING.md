# Contributing

QRCDN is built in the open, developed as a cathedral: the source is public so
you can read it, audit it, and fork it if you ever need to. But the roadmap
is driven by the hosted product at [qrcdn.com](https://www.qrcdn.com), and
big features land through us, not through unsolicited pull requests.

## What's welcome

- Bug reports, filed as issues, with enough detail to reproduce
- Small, focused fixes: a typo, a broken link, a genuine bug with a clear,
  minimal patch
- Questions about how something works, also as issues

## What isn't

- Large feature PRs opened without discussion first. We'll likely close
  them, not because the idea is bad, but because product direction here
  isn't decided in a pull request.
- Changes to pricing, positioning, or anything under `docs/DECISIONS.md`.
  Those are product calls, not engineering ones.

## Running it locally

```bash
pnpm install
pnpm dev          # app + site, from the repo root
pnpm lint
pnpm typecheck
pnpm test         # engine, worker, shared, web
```

You'll need your own Supabase project and Cloudflare account for the full
stack to run end to end; a subset of the test suite (`packages/qr-engine`,
`packages/shared`) needs neither.

## Rules that aren't optional

These aren't style preferences. They're invariants the product depends on,
and a change that breaks one won't be merged regardless of how the rest of
the patch looks:

- Scan redirects are always `302` with `Cache-Control: no-store`. Never
  `301`. A cached permanent redirect would pin a scanner to a stale
  destination forever.
- A QR code's style is a frozen snapshot at creation time. Re-rendering it
  later must reproduce the exact same artifact. Nothing mutates it after the
  fact.
- No per-scan database write on the redirect path. Analytics are read from
  rollups, never accumulated by writing to the live table on every request.

## Reporting a security issue

Don't open a public issue. See [SECURITY.md](SECURITY.md).
