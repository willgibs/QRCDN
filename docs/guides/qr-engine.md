# qr-engine guide

Read this when touching `packages/qr-engine`, `packages/shared/src/style.ts`, or anything that renders/validates a QR code.

## Package contract

- Pure TypeScript. **Zero DOM or Node APIs in the render path** — `renderQr` must run identically in a browser and on the server (Node/Vercel).
- Deterministic bytes: same `(data, style, logoDataUri, pixelSize, quietZone)` in → byte-identical SVG string out, forever. This is why gradient angles are quantized (see below) instead of using raw `Math.cos`/`Math.sin` output.
- `packages/qr-engine` imports `@qrcdn/shared` **type-only** (`import type { QrStyle } from "@qrcdn/shared"` in both `guardrails.ts` and `render.ts`). No runtime dependency on the shared package's zod machinery leaks into the render path.
- The engine never fetches. Logos arrive pre-resolved as a base64 data URI (`RenderRequest.logoDataUri`) — callers (browser and server) resolve `assetId` → data URI themselves so both paths produce identical output (D4).
- Matrix generation is isolated behind `matrix.ts`: `qrcode` npm is the only file that touches a third-party encoder, so it's swappable (e.g. for vendored Nayuki qrcodegen) without touching render code (D4).

## Public API surface (`src/index.ts`)

| Export | From | Purpose |
|---|---|---|
| `ENGINE_VERSION` | `index.ts` | Bump when render output semantics change |
| `renderQr(req: RenderRequest): RenderResult` | `render.ts` | Main entry — data + style → SVG string + metadata |
| `DEFAULT_QUIET_ZONE` | `render.ts` | `4` modules (D6 floor) |
| `encodeMatrix(data, ecc, opts?): EncodedQr` | `matrix.ts` | Data → module matrix; `opts.minVersion` forces a floor version |
| `isDark(qr, x, y): boolean` | `matrix.ts` | Module lookup helper |
| `scannabilityReport(style, opts?): ScannabilityReport` | `guardrails.ts` | Live score (0–100) + issues, used in studio and CI |
| `effectiveEcc(style): EccLevel` | `guardrails.ts` | The ECC level the engine will *actually* use (never lower than requested) |
| `effectiveLogoRatio(logo): number` | `guardrails.ts` | Linear knockout ratio including padding, at the floor version |
| `contrastRatio`, `relativeLuminance` | `guardrails.ts` | WCAG-style contrast math |
| `logoFloorVersion(logo)` | `guardrails.ts` (not re-exported from `index.ts` — imported directly by `render.ts`) | Minimum symbol version for a knockout logo |

Types: `RenderRequest`, `RenderResult`, `EncodedQr`, `EccLevel`, `ScannabilityReport`, `ScannabilityIssue`, `ScannabilityOptions`.

`RenderRequest` fields: `data`, `style: QrStyle`, `logoDataUri?`, `pixelSize?` (px, guarded to `1..16384`), `quietZone?` (module count; values below the D6 floor of 4 are for internal previews only).

`RenderResult` fields: `svg`, `moduleCount`, `version`, `ecc`, `sideLength` (module units including quiet zone).

## Style JSON shape (`packages/shared/src/style.ts`)

`qrStyleSchema` (zod, version-tagged `{v: 1, ...}`):

- `ecc: "L"|"M"|"Q"|"H"` (default `"M"`) — requested level; engine may raise, never lower.
- `dots: { style: "square"|"rounded"|"circle", sizeRatio: number }` — `sizeRatio` floor `0.4`, max `1` (D6).
- `eyes: { frame: "square"|"rounded"|"circle"|"leaf", pupil: "square"|"rounded"|"circle"|"dot", color: hex|null }` — `color: null` inherits the foreground fill.
- `fill`: discriminated union on `type` — `solid` (`color`), `linearGradient` (`rotation` radians + 2-4 `stops`), `radialGradient` (2-4 `stops`).
- `background: { transparent: boolean, color: hex }`.
- `logo: { assetId, sizeRatio (0.1-0.4, default 0.32), padding (0-4 modules, default 1), knockout (default true), shape: "auto"|"circle"|"square" } | null`.
- `frame: null` — reserved for v1.1 frame/CTA support; present now so a future additive change doesn't need a new top-level key.

**Additive-only evolution (D5):** a style saved today must parse and render identically forever. New fields get defaults so old snapshots still validate; never repurpose or tighten an existing field's meaning. Colors are sRGB hex only — no oklch ever reaches engine input or output (D6, `CLAUDE.md`).

## Scannability guardrails — exact numbers (`src/guardrails.ts`)

These are empirical, not theoretical (measured 2026-07-21 across two adversarial zxing decode campaigns, 160+ combos) — see D6 for the full narrative. Operational summary, numbers copied verbatim from the source comments:

| Constant | Value | Meaning |
|---|---|---|
| `LOGO_EFFECTIVE_WARN` | `0.395` | Effective linear knockout ratio above this → `logo-over-recommended` warning |
| `LOGO_EFFECTIVE_ERROR` | `0.412` | Above this → `logo-unscannable` error |
| `LOGO_RATIO_ECC_Q_OK` | `0.316` | Effective ratio ceiling (≈10% area) for the ECC-Q exemption |

Every failing config in the campaign had effective linear ratio ≥ ~0.418; every passing one ≤ ~0.407 — the warn/error thresholds sit inside that gap.

**"Effective ratio" is load-bearing:** it is `sizeRatio + (2 * padding) / modulesForVersion(floorVersion)` — i.e. `logo.sizeRatio` diluted by knockout padding, computed **at the symbol version the renderer will actually floor to**, not the requested/raw version. Computing it against the wrong version previously shipped score-100 codes that didn't decode.

**Floor version logic (`logoFloorVersion`):** stays at v3 only while the effective ratio *at v3* (29 modules) is ≤ `LOGO_EFFECTIVE_WARN` (0.395); otherwise floors to v5. v5 also keeps v3's clipped alignment pattern out of the damage zone.

**ECC-Q exemption:** gates on the *effective*, padding-inclusive ratio (≤ 0.316 ≈ 10% area) — never raw `sizeRatio`. A small `sizeRatio` with enough padding can still push effective coverage past the exemption and force ECC H.

**Schema vs. studio defaults:** hard cap `sizeRatio` 0.40 (schema), but the studio's own default is 0.32 — deliberately inside the safe band, leaving headroom.

**Leaf eye frames use 2.25/1.25 radii** (outer wall / inner wall) — same as the "rounded" frame. The original heavier 2.25/1.5-ish rounding broke zxing finder detection on v7+ symbols at small raster sizes; do not increase these without re-running the decode campaign at v7+.

### Why decode round-trips cannot validate contrast

zxing-wasm's binarizer reads clean rasters at ~1.23:1 contrast just fine — decode tests passing tells you nothing about real-world scannability under camera noise, glare, or print wear. The 3:1 (error) / 4:1 (recommended, warning below) contrast guardrail in `scannabilityReport` **must stay analytic** (computed from sRGB relative luminance, not verified by round-trip). Never let a green decode test justify relaxing the contrast thresholds.

## Injection-safety invariants (`src/render.ts`)

All of these exist because SVG output can be `dangerouslySetInnerHTML`'d directly into a page (see `apps/web/components/explore/qr-svg.tsx`, `studio-slice.tsx`) — treat every string that reaches the SVG as attacker-controlled until proven otherwise:

- `assertHex(color)` — every color that reaches an SVG attribute (`fill`, gradient `stop-color`, background) is validated against `/^#[0-9a-fA-F]{6}$/` at render time, even though the zod schema already validates it upstream. Defense in depth: `render.test.ts` proves a style object mutated post-parse (`'red" onload="x'`) still throws.
- `DATA_URI_RE` — logo images must match `^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$` exactly. `svg+xml` is deliberately excluded (nested SVG inside `<image>` is script-inert in browsers, but the app layer rasterizes uploads anyway per D6 — excluding it here is free defense-in-depth for standalone-opened exports). Non-data-URI values (e.g. `https://evil.example/x.png`) throw — the engine never fetches.
- `pixelSize` guard — must be finite, `1..16384` (`MAX_PIXEL_SIZE`); `NaN`/`Infinity`/negative/zero/absurdly-large all throw `invalid pixelSize`.
- Quantized gradient math — `Math.cos`/`Math.sin` of `fill.rotation` are rounded to integer thousandths (`Math.round(... * 500)`) **before** formatting. ECMA-262 doesn't pin transcendental function results bit-for-bit, so a raw double sitting within an ulp of a `toFixed` rounding boundary could produce different bytes on different JS engines — breaking the identical-bytes contract.

**Any new interpolation into the SVG string must follow the same pattern**: validate/whitelist the value with a regex or enum check immediately before it's concatenated, even if it was already validated by the zod schema earlier in the pipeline. Don't trust upstream validation alone inside the render path.

## Test expectations

- `test/render.test.ts` — determinism, golden snapshots per style preset, quiet-zone math, injection rejection (bad data URI, bad pixelSize, bad color), transparent-background omission.
- `test/guardrails.test.ts` — `effectiveEcc` truth table, `contrastRatio` symmetry, `scannabilityReport` scoring/issue codes for each guardrail.
- `test/decode.test.ts` — the "branded codes actually scan" regression net (D6): rasterizes every style preset via `@resvg/resvg-js` and decodes with `zxing-wasm` (`tryHarder: true`), asserting the decoded text matches the original payload exactly. Covers every ECC level, short/long payloads, every eye frame × pupil combination, logo knockout at the clean max and the schema max, the v3→v5 floor escape, both ECC-Q exemption edges, leaf eyes on a dense v7 symbol, and minimum dot size per dot style.
- **Every new failure mode discovered (in dev, in review, or from a bug report) becomes a regression test in `decode.test.ts` or `guardrails.test.ts` before the fix is considered done** — this is how the empirical thresholds above stay trustworthy over time.
- Golden snapshots (`test/__snapshots__/render.test.ts.snap`) update **only** via `vitest -u`, and only with a stated justification in the commit — an unreviewed snapshot update can silently hide a real regression (e.g. a broken path builder that still happens to produce valid-looking SVG).

Run engine tests directly: `cd packages/qr-engine && pnpm vitest run` (or `pnpm test` from the package). Typecheck: `pnpm typecheck` from the package or repo root.

## Adding a new dot or eye style — checklist

1. **Path builder**: add the shape branch in `src/paths.ts` (`dotPath` for module shapes, `eyeFramePath`/`eyePupilPath` for eyes). Keep the 3-decimal `fmt()` formatting convention so output stays byte-deterministic.
2. **Schema enum addition**: add the new literal to the relevant enum in `packages/shared/src/style.ts` (`dots.style`, `eyes.frame`, or `eyes.pupil`). This is additive — old snapshots with the old enum values keep parsing and rendering unchanged.
3. **Decode tests across versions, including v7+ dense symbols**: add the new style to a decode round-trip (`test/decode.test.ts`), and specifically exercise it at a dense/high-version symbol (long payload + high ECC) the way the existing leaf-eyes-at-v7 test does — small-raster finder detection is where new eye geometry breaks first.
4. **Snapshot**: run `pnpm vitest run -u` in `packages/qr-engine` to add the new golden snapshot, and state in the commit why the diff is expected (new shape, not a regression in existing ones).
5. Re-check the guardrail constants still make sense for the new shape — a very thin or very large new dot/eye shape could shift the empirical contrast/knockout assumptions; re-run the adversarial decode set if there's any doubt.
