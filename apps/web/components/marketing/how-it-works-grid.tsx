import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { cn } from "@/lib/utils";
import {
  PrintCodeDefs,
  PrintMat,
  definePrintCode,
} from "@/components/marketing/print-mat";
import { HUE_CLASSES } from "./destination-hues";

/**
 * 01 — How It Works as a numbered 2x2 grid (P9.10-D9, refined D9.1/D9.2).
 *
 * Four cells, one hover microanimation each, every micro demonstrating
 * the concept it sits under, plus two constant motions the board
 * licensed where movement says something a still cannot (the fan's
 * float, the branch's traveling packet). The D9.2 polish notes:
 *
 * - Numerals went MONOCHROME (one foreground tint), the meta-row
 *   ordinals retired (the numeral IS the number now), and the card
 *   hover border-highlight retired with them — the cells are not
 *   clickable, and a hover affordance on a non-control lies.
 * - Cell 01's module/eye selectors became icon glyphs (compact), and
 *   the crossfade became a WIPE: the restyled render sweeps across the
 *   sheet on a clip-path inset transition, left to right, and sweeps
 *   back off on hover-out. A fade reads as a swap; a wipe reads as the
 *   style being APPLIED — and its hard pixel edge suits a QR code. The
 *   restyled layer carries its own opaque paper so the sweep covers
 *   the base cleanly (two transparent renders interleaving was the
 *   D9.1 mush this replaces).
 * - Cell 02 grew to SEVEN codes, and the fade moved from opacity to
 *   BRIGHTNESS: opacity let overlapped mats show through each other,
 *   which the board called out; dimming keeps every sheet opaque while
 *   the run visibly recedes into the dark.
 * - Cell 03's branch shortened (full-width never meant obnoxious) and
 *   the packet became a COMET — three followers on the same motion
 *   path at staggered begins with falling fill-opacity.
 * - Cell 04 cleaned up: bars on a real baseline, rounded tops, a
 *   quieter non-window tone, the legend row unruled (it was stacking a
 *   second hairline against the meta row's).
 *
 * Choreography in globals.css's `.hw-*` block; hover rules behind the
 * hover-capable no-reduced-motion gate, ambient motions behind their
 * own guards (SMIL ignores the media query, so the packets' guard
 * hides the elements). Zero client JS; a server component; an `<ol>`
 * because the numbers are the product pipeline.
 */

const QR_A = "HTTPS://QRCDN.COM/CAFE";
const QR_B = "HTTPS://QRCDN.COM/MENU";
const QR_C = "HTTPS://QRCDN.COM/TOUR";
const QR_D = "HTTPS://QRCDN.COM/HOURS";
const QR_E = "HTTPS://QRCDN.COM/EVENTS";
const QR_F = "HTTPS://QRCDN.COM/SALE";
const QR_G = "HTTPS://QRCDN.COM/BOOK";

const CODES = {
  a: definePrintCode(QR_A, "hw-a"),
  b: definePrintCode(QR_B, "hw-b"),
  c: definePrintCode(QR_C, "hw-c"),
  d: definePrintCode(QR_D, "hw-d"),
  e: definePrintCode(QR_E, "hw-e"),
  // D9.2: the seven-code fan. All fresh artwork; nothing else renders
  // /SALE or /BOOK in any style.
  f: definePrintCode(QR_F, "hw-f"),
  g: definePrintCode(QR_G, "hw-g"),
} as const;

/**
 * Cell 01's hover layer: the SAME payload restyled — rounded 0.88,
 * cobalt #1e3a8a, both certified/shipped ground. OPAQUE white paper
 * since D9.2: the wipe must cover the base render cleanly as it
 * sweeps, and a transparent layer would interleave the two module
 * patterns in the swept region. Two REAL engine renders (QR solidity).
 */
const RESTYLE_INK = "#1e3a8a";
const RESTYLED_SVG = renderQr({
  data: QR_A,
  style: parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: "rounded", pupil: "rounded", color: null },
    fill: { type: "solid", color: RESTYLE_INK },
    background: { transparent: false, color: "#ffffff" },
  }),
}).svg;

const BASE_INK = "#131316";

/** The 30-day series (D9.1) — the caption's "30 days", literal. Last
 *  seven days are the violet window. */
const SCAN_BARS = [
  3, 4, 3, 5, 4, 6, 5, 4, 6, 7, 6, 8, 7, 9, 8, 7, 10, 9, 12, 11, 9, 12, 17, 24, 19, 13, 10,
  8, 6, 5,
];
const WINDOW_START = SCAN_BARS.length - 7;

/** Monochrome since D9.2 (board note). Flat srgb mix, foreground at
 *  8% — structure as atmosphere, no hue. */
const NUMERAL_TINT = "color-mix(in srgb, var(--foreground) 8%, transparent)";

/** Cell 03's branch geometry, shortened at D9.2. Fixed-pixel svg so
 *  the SMIL comets and the strokes share one coordinate space. */
const BR = {
  w: 116,
  h: 128,
  paths: {
    menu: "M0 64 C 30 64, 46 24, 108 24",
    winter: "M0 64 C 38 64, 70 64, 108 64",
    order: "M0 64 C 30 64, 46 104, 108 104",
  },
} as const;

/** The comet: a leader and two followers on the same motion path,
 *  staggered begins, falling fill-opacity (attribute, not CSS opacity —
 *  the hover swap owns CSS opacity on the whole trio). */
function Comet({ path, tone }: { path: string; tone: "winter" | "order" }) {
  const cls = cn(
    "hw-packet",
    tone === "winter" ? "hw-packet-winter fill-dest-2" : "hw-packet-order fill-dest-3",
  );
  return (
    <>
      {[
        { r: 3, begin: "0s", fo: 1 },
        { r: 2.2, begin: "0.11s", fo: 0.45 },
        { r: 1.5, begin: "0.22s", fo: 0.22 },
      ].map((c, i) => (
        <circle key={i} r={c.r} className={cls} fillOpacity={c.fo}>
          <animateMotion dur="3.2s" begin={c.begin} repeatCount="indefinite" path={path} />
        </circle>
      ))}
    </>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Module-shape glyph: a 2x2 of dots, square or rounded — the same
 *  vocabulary the studio's own dial uses, at icon scale. */
function ModuleGlyph({ rounded }: { rounded?: boolean }) {
  const rx = rounded ? 2.6 : 0.6;
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
      {[
        [1.5, 1.5],
        [7.5, 1.5],
        [1.5, 7.5],
        [7.5, 7.5],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="5" height="5" rx={rx} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Eye glyph: finder frame plus pupil. */
function EyeGlyph({ rounded }: { rounded?: boolean }) {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
      <rect
        x="1.75"
        y="1.75"
        width="10.5"
        height="10.5"
        rx={rounded ? 3.4 : 0.8}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="5" y="5" width="4" height="4" rx={rounded ? 1.6 : 0.4} fill="currentColor" />
    </svg>
  );
}

function Cell({
  ordinal,
  title,
  note,
  children,
}: {
  ordinal: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    // No hover affordance on the card itself (D9.2): the cells are not
    // clickable, and a border highlight promises a click that goes
    // nowhere. The micros are the hover reward.
    <li className="hw-card group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-3 left-4 font-display text-[88px] leading-none font-bold tracking-tight select-none"
        style={{ color: NUMERAL_TINT }}
      >
        {ordinal}
      </span>

      <div aria-hidden className="relative z-[1] flex h-44 items-center justify-center">
        {children}
      </div>
      <div className="relative z-[1] mt-5 flex flex-col gap-1.5 border-t border-border/60 pt-4">
        <span className="font-display text-base font-semibold">{title}</span>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
    </li>
  );
}

export function HowItWorksGrid() {
  return (
    <ol className="mt-block grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
      <PrintCodeDefs codes={Object.values(CODES)} />

      {/* ── 01 · the code restyles ─────────────────────────────────────
          The mini studio beside the mat, selectors as icon glyphs.
          Hover WIPES the second style across the sheet (clip-path
          inset, left to right) while the panel's selection moves with
          it; hover-out sweeps it back off. */}
      <Cell
        ordinal="01"
        title="Design your style"
        note="Pick your ink, module shape and corner style once. That kit becomes your look."
      >
        <div className="flex items-center justify-center gap-6">
          <div className="flex w-[150px] shrink-0 flex-col gap-2.5 rounded-xl border border-border/60 bg-background/50 p-3.5">
            <ConfigRow label="Ink">
              <span className="hw-opt-base hw-swatch" style={{ backgroundColor: BASE_INK }} />
              <span className="hw-opt-alt hw-swatch" style={{ backgroundColor: RESTYLE_INK }} />
              <span className="hw-swatch" style={{ backgroundColor: "#0f766e" }} />
            </ConfigRow>
            <ConfigRow label="Modules">
              <span className="hw-opt-base hw-icon-opt">
                <ModuleGlyph />
              </span>
              <span className="hw-opt-alt hw-icon-opt">
                <ModuleGlyph rounded />
              </span>
            </ConfigRow>
            <ConfigRow label="Eyes">
              <span className="hw-opt-base hw-icon-opt">
                <EyeGlyph />
              </span>
              <span className="hw-opt-alt hw-icon-opt">
                <EyeGlyph rounded />
              </span>
            </ConfigRow>
          </div>
          <span className="relative block size-[116px] shrink-0">
            <PrintMat code={CODES.a} size={116} depth="raised" className="hw-mat-base" />
            <span
              aria-hidden
              className="hw-restyle absolute inset-0 p-[10px]"
              dangerouslySetInnerHTML={{ __html: RESTYLED_SVG }}
            />
          </span>
        </div>
      </Cell>

      {/* ── 02 · the run deals out ─────────────────────────────────────
          Seven distinct codes, one identical style. The recession is
          BRIGHTNESS, not opacity — every sheet stays opaque (opacity
          let overlapped mats show through each other, the D9.1 note),
          dimming into the dark instead. Constant float on the hero's
          physics; hover deals the run wider and lifts the edges. */}
      <Cell
        ordinal="02"
        title="Create new codes"
        note="Every code you make inherits the kit. Export SVG or PNG, no watermark, no limits on static codes."
      >
        <div className="flex items-center -space-x-7">
          <span className="hw-fan hw-fan-1 relative z-0 translate-y-[20px] rotate-[-24deg]">
            <PrintMat code={CODES.f} size={60} />
          </span>
          <span className="hw-fan hw-fan-2 relative z-10 translate-y-[12px] rotate-[-15deg]">
            <PrintMat code={CODES.d} size={76} />
          </span>
          <span className="hw-fan hw-fan-3 relative z-20 translate-y-[5px] rotate-[-7deg]">
            <PrintMat code={CODES.c} size={90} />
          </span>
          <span className="hw-fan hw-fan-4 relative z-40">
            <PrintMat code={CODES.a} size={104} depth="raised" />
          </span>
          <span className="hw-fan hw-fan-5 relative z-30 translate-y-[5px] rotate-[7deg]">
            <PrintMat code={CODES.b} size={90} />
          </span>
          <span className="hw-fan hw-fan-6 relative z-10 translate-y-[12px] rotate-[15deg]">
            <PrintMat code={CODES.e} size={76} />
          </span>
          <span className="hw-fan hw-fan-7 relative z-0 translate-y-[20px] rotate-[24deg]">
            <PrintMat code={CODES.g} size={60} />
          </span>
        </div>
      </Cell>

      {/* ── 03 · the repoint, drawn ────────────────────────────────────
          Shorter branch (D9.2), comet packets. At rest /winter carries
          the traffic; hover plays the next repoint — winter grays and
          takes the drawn strike, /order's branch draws itself in, the
          comet changes lanes. /menu stays struck: the page-wide
          `line-through` pin, exactly one. */}
      <Cell
        ordinal="03"
        title="Update links anytime"
        note="Repoint a code after it is printed. The code on the wall never changes, only where it sends people."
      >
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <PrintMat code={CODES.a} size={92} depth="raised" />
            <span className="font-mono text-[10px] text-muted-foreground">qrcdn.com/cafe</span>
          </div>
          <svg
            viewBox={`0 0 ${BR.w} ${BR.h}`}
            width={BR.w}
            height={BR.h}
            className="shrink-0"
            aria-hidden
          >
            <path d={BR.paths.menu} className="hw-br" fill="none" strokeWidth="1.5" />
            <path
              d={BR.paths.winter}
              className="hw-br hw-br-winter stroke-dest-2"
              fill="none"
              strokeWidth="2"
            />
            <path
              d={BR.paths.order}
              className="hw-br hw-br-order stroke-dest-3"
              fill="none"
              strokeWidth="2"
              pathLength={100}
            />
            <Comet path={BR.paths.winter} tone="winter" />
            <Comet path={BR.paths.order} tone="order" />
          </svg>
          <div className="flex flex-col gap-[18px] font-mono text-[12px]">
            <span className="text-muted-foreground opacity-65 line-through decoration-1">
              yourcafe.com/menu
            </span>
            <span className="hw-winter flex items-center gap-2 text-foreground">
              <span
                aria-hidden
                className={cn("size-[6px] shrink-0 rounded-full", HUE_CLASSES["dest-2"].dot)}
              />
              <span className="relative">
                yourcafe.com/winter
                <span aria-hidden className="hw-strike" />
              </span>
            </span>
            <span className="hw-next flex items-center gap-2 text-foreground">
              <span
                aria-hidden
                className={cn("size-[6px] shrink-0 rounded-full", HUE_CLASSES["dest-3"].dot)}
              />
              yourcafe.com/order
            </span>
          </div>
        </div>
      </Cell>

      {/* ── 04 · the scans arrive ──────────────────────────────────────
          Cleaner (D9.2): a real baseline under the bars, rounded tops,
          the quiet tone pulled back, the legend row unruled — the old
          ruled caption stacked a second hairline against the meta
          row's. Hover runs the wave. */}
      <Cell
        ordinal="04"
        title="Track scan analytics"
        note="Every scan by day, country, city, device and referrer. Rolled up daily, honest about bots."
      >
        <div className="flex w-full flex-col gap-3 self-center px-2">
          <div className="flex h-[96px] w-full items-end gap-[4px] border-b border-border/60">
            {SCAN_BARS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "hw-bar min-w-0 flex-1 rounded-t-[2px]",
                  i >= WINDOW_START ? "bg-(--chart-1)" : "bg-foreground/20",
                )}
                style={{ height: `${(h / 24) * 100}%`, "--i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>1,284 scans · 30 days</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-[6px] rounded-[1px] bg-(--chart-1)" />
              last 7 days
            </span>
          </div>
        </div>
      </Cell>
    </ol>
  );
}
