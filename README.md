# QRCDN

[![CI](https://github.com/willgibs/QRCDN/actions/workflows/ci.yml/badge.svg)](https://github.com/willgibs/QRCDN/actions/workflows/ci.yml)

**The modern QR platform.** A brand studio for the code itself, permanent short
links with destinations you control, scan analytics, and an API. This
repository is the entire product: the engine, the redirect layer, the app, and
the site you read this on.

Hosted at [qrcdn.com](https://www.qrcdn.com). The hosted service is the
product; this repo is the receipt.

## Why it's open

A QR code is a promise printed on paper. If the company behind it disappears,
the promise usually dies with it. Ours doesn't: the engine, the redirect
worker, and the app are MIT-licensed and public. If we ever vanish, the path
off is right here, and your printed codes can be re-pointed at infrastructure
you run yourself. That is the point.

## What's in here

| Path | What it is |
| --- | --- |
| `packages/qr-engine` | Pure-TypeScript styled QR renderer: deterministic SVG, scannability guardrails calibrated on real decode campaigns |
| `packages/shared` | The style schema, slug rules, shared types |
| `workers/redirect` | The edge redirect layer: `qrcdn.com/{slug}`, 302 + `no-store`, KV in front of Postgres |
| `workers/status` | The status probe at status.qrcdn.com, on separate infrastructure from the product |
| `apps/web` | The app and this site: studio, dashboards, API, docs |
| `supabase/` | Schema migrations and RLS tests: the database source of truth |

## Honest engineering, in short

- Scan redirects are always `302` with `Cache-Control: no-store`. Never `301`:
  a printed code must stay repointable.
- A code's style is frozen at mint. Re-renders are identical forever.
- Raw IP addresses are never stored. Scans are hashed with a salt that rotates
  daily.
- Free codes are never deactivated, and a downgrade never breaks a printed
  code. This is policy, in the terms.

## Running it

```bash
pnpm install
pnpm dev        # app + site
pnpm test       # engine, worker, shared, web
```

You'll need your own Supabase project and Cloudflare account to run the full
stack; see `docs/` for the architecture and decision log. The decode-campaign
data behind the scannability thresholds is documented in
`docs/guides/qr-engine.md`.

## Security

Found something? Read [SECURITY.md](SECURITY.md): disclosure goes to
hello@qrcdn.com and a person reads it.

## License

[MIT](LICENSE). Print something that can change its mind.
