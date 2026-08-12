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
 * 01 — How It Works as a numbered 2x2 grid (P9.10-D9, refined at D9.1).
 *
 * Four cells, one hover microanimation each, every micro demonstrating
 * the concept it sits under. The D9.1 board notes, all in:
 *
 * - The ordinals moved into the cards as large background numerals,
 *   top-left, each in its own aurora hue at 13-14% via a flat srgb
 *   color-mix. TINTS, not kisses: the census counts aurora MOMENTS
 *   (glow, drift, the beam), and a static low-alpha text color is
 *   none of those — the same distinction that keeps the ok-green
 *   checks and chart violet outside the census. Flagged in the round
 *   record either way.
 * - Cell 01 gained the mini studio config UI, and the crossfade gained
 *   the blur mask (the transition looked jerky because two transparent
 *   renders at mid-fade read as a double image; 2-3px of blur during
 *   the swap bridges them into one object — the emil-design-eng trick,
 *   built with our own motion tokens).
 * - Cell 02 is now a FIVE-code fan, fading toward its edges, with the
 *   hero's ambient float running constantly (board: 1-2 cells may hold
 *   constant motion where it adds dimension — the float is the hero's
 *   own physics, printed matter drifting on air).
 * - Cell 03 is a drawn branch diagram: the mat feeds three destinations
 *   through real bezier paths, and a packet travels the ACTIVE branch
 *   continuously (the second constant motion: the redirect carries
 *   traffic even when nobody is looking, which is the product's whole
 *   claim). Hover plays the next repoint: the active branch grays out,
 *   the /order branch draws itself in, the chips swap.
 * - Cell 04 fills its card: the full 30-day series (the caption said
 *   "30 days" over 18 bars before — the chart is now literal), flex-1
 *   bars spanning the stage, a legend naming the violet window.
 *
 * All choreography is CSS in globals.css's `.hw-*` block; the
 * interactive rules sit behind the hover-capable no-reduced-motion
 * gate, the two ambient motions behind their own reduced-motion
 * guards (the packet is SMIL, which ignores the media query, so its
 * guard hides the element instead). Zero client JS; still a server
 * component. An `<ol>` because the numbers are the product pipeline.
 */

const QR_A = "HTTPS://QRCDN.COM/CAFE";
const QR_B = "HTTPS://QRCDN.COM/MENU";
const QR_C = "HTTPS://QRCDN.COM/TOUR";
const QR_D = "HTTPS://QRCDN.COM/HOURS";
const QR_E = "HTTPS://QRCDN.COM/EVENTS";

const CODES = {
  a: definePrintCode(QR_A, "hw-a"),
  b: definePrintCode(QR_B, "hw-b"),
  c: definePrintCode(QR_C, "hw-c"),
  // D9.1: two more for the wider fan. Fresh artwork — kit-sync renders
  // /HOURS and /EVENTS in its own creative styles (day/mono/glacier),
  // never in precision, so no duplicate-artwork pair exists.
  d: definePrintCode(QR_D, "hw-d"),
  e: definePrintCode(QR_E, "hw-e"),
} as const;

/**
 * Cell 01's hover layer: the SAME payload restyled — rounded 0.88,
 * cobalt #1e3a8a. Certified ground on both axes (the C2-scored cobalt
 * pair; hero-mat-2's shipped geometry). Two REAL engine renders, never
 * a repaint (QR solidity). Transparent background because both renders
 * share one white mat: the restyle happens on one sheet of paper.
 */
const RESTYLE_INK = "#1e3a8a";
const RESTYLED_SVG = renderQr({
  data: QR_A,
  style: parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: "rounded", pupil: "rounded", color: null },
    fill: { type: "solid", color: RESTYLE_INK },
    background: { transparent: true },
  }),
}).svg;

const BASE_INK = "#131316";

/**
 * The 30-day series (D9.1). D9 shipped the filmstrip's 18 bars under a
 * caption reading "30 days"; the chart is now literal. Same authored
 * register (relative units, weekly rhythm, one launch spike), same
 * caption as always — no new numbers. The last seven days are the
 * violet window, named by the legend beside the total.
 */
const SCAN_BARS = [
  3, 4, 3, 5, 4, 6, 5, 4, 6, 7, 6, 8, 7, 9, 8, 7, 10, 9, 12, 11, 9, 12, 17, 24, 19, 13, 10,
  8, 6, 5,
];
const WINDOW_START = SCAN_BARS.length - 7;

/** Per-card numeral tints — flat srgb mixes (the iOS-Safari-safe
 *  interpolation space, per destination-hues.ts's board-round-5
 *  lesson: oklab/oklch mixes can paint transparent there). */
const NUMERAL_TINT = {
  "01": "color-mix(in srgb, var(--au-3) 14%, transparent)",
  "02": "color-mix(in srgb, var(--au-1) 14%, transparent)",
  "03": "color-mix(in srgb, var(--au-2) 13%, transparent)",
  "04": "color-mix(in srgb, var(--au-4) 13%, transparent)",
} as const;

/** Cell 03's branch geometry. Fixed-pixel svg (width/height attrs, no
 *  scaling) so the SMIL packets' motion paths and the drawn strokes
 *  share one coordinate space at all viewports; at the grid's narrowest
 *  the stage clips at the card edge instead of distorting (the board
 *  OK'd clipping over squeezing). */
const BR = {
  w: 168,
  h: 128,
  paths: {
    menu: "M0 64 C 44 64, 66 22, 160 22",
    winter: "M0 64 C 52 64, 92 64, 160 64",
    order: "M0 64 C 44 64, 66 106, 160 106",
  },
} as const;

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="flex items-center gap-1.5">{children}</span>
    </div>
  );
}

function Cell({
  ordinal,
  title,
  note,
  children,
}: {
  ordinal: keyof typeof NUMERAL_TINT;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <li className="hw-card group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 p-6 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:border-foreground/25">
      {/* The background numeral (D9.1): structure as atmosphere. Behind
          the stage, clipped by the card, one aurora hue each as a flat
          static tint. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-3 left-4 font-display text-[88px] leading-none font-bold tracking-tight select-none"
        style={{ color: NUMERAL_TINT[ordinal] }}
      >
        {ordinal}
      </span>

      {/* The stage: fixed height so all four cards share one horizon and
          nothing the micros do can ever move layout. Lifted over the
          numeral. */}
      <div aria-hidden className="relative z-[1] flex h-44 items-center justify-center">
        {children}
      </div>
      <div className="relative z-[1] mt-5 grid grid-cols-[30px_1fr] gap-y-1.5 border-t border-border/60 pt-4">
        <span className="font-mono text-[11px] leading-6 text-muted-foreground tabular-nums">
          {ordinal}
        </span>
        <span className="font-display text-base font-semibold">{title}</span>
        <p className="col-start-2 text-sm text-muted-foreground">{note}</p>
      </div>
    </li>
  );
}

export function HowItWorksGrid() {
  return (
    <ol className="mt-block grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
      <PrintCodeDefs codes={Object.values(CODES)} />

      {/* ── 01 · the code restyles ─────────────────────────────────────
          The mini studio beside the mat: ink, modules, eyes — the three
          dials the note names. Hover applies the second style to BOTH
          the render and the panel (the selection moves with the code),
          so the cell is a one-frame demo of the studio itself. */}
      <Cell
        ordinal="01"
        title="Design your style"
        note="Pick your ink, module shape and corner style once. That kit becomes your look."
      >
        <div className="flex items-center justify-center gap-6">
          <div className="flex w-[168px] shrink-0 flex-col gap-2.5 rounded-xl border border-border/60 bg-background/50 p-3.5">
            <ConfigRow label="Ink">
              <span className="hw-opt-base hw-swatch" style={{ backgroundColor: BASE_INK }} />
              <span className="hw-opt-alt hw-swatch" style={{ backgroundColor: RESTYLE_INK }} />
              <span className="hw-swatch" style={{ backgroundColor: "#0f766e" }} />
            </ConfigRow>
            <ConfigRow label="Modules">
              <span className="hw-opt-base hw-chip-opt">square</span>
              <span className="hw-opt-alt hw-chip-opt">rounded</span>
            </ConfigRow>
            <ConfigRow label="Eyes">
              <span className="hw-opt-base hw-chip-opt">square</span>
              <span className="hw-opt-alt hw-chip-opt">rounded</span>
            </ConfigRow>
          </div>
          {/* Explicit square wrapper — an inline-block here blockifies as
              a flex item and collapses (the D9 bug). Overlay padding is
              the same 10px PrintMat computes for size 116. */}
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

      {/* ── 02 · the fan spreads ───────────────────────────────────────
          Five distinct codes, one identical style, fading toward the
          edges — the run trails off toward "as many as you need". The
          whole fan floats on the hero's own physics (constant, coprime
          periods); hover deals it wider and the edges lean in. */}
      <Cell
        ordinal="02"
        title="Create new codes"
        note="Every code you make inherits the kit. Export SVG or PNG, no watermark, no limits on static codes."
      >
        <div className="flex items-center -space-x-7">
          <span className="hw-fan hw-fan-1 relative z-0 translate-y-[14px] rotate-[-16deg] opacity-40">
            <PrintMat code={CODES.d} size={72} />
          </span>
          <span className="hw-fan hw-fan-2 relative z-10 translate-y-[6px] rotate-[-8deg] opacity-80">
            <PrintMat code={CODES.c} size={88} />
          </span>
          <span className="hw-fan hw-fan-3 relative z-30">
            <PrintMat code={CODES.a} size={104} depth="raised" />
          </span>
          <span className="hw-fan hw-fan-4 relative z-20 translate-y-[6px] rotate-[8deg] opacity-80">
            <PrintMat code={CODES.b} size={88} />
          </span>
          <span className="hw-fan hw-fan-5 relative z-0 translate-y-[14px] rotate-[16deg] opacity-40">
            <PrintMat code={CODES.e} size={72} />
          </span>
        </div>
      </Cell>

      {/* ── 03 · the repoint, drawn ────────────────────────────────────
          The mat feeds three destinations through real paths. At rest
          /winter carries the traffic — its branch holds the destination
          hue and a packet travels it continuously (the redirect is live
          even when nobody is hovering, which is the claim). On hover
          the next repoint plays: /winter's branch grays and its text
          takes the drawn strike, /order's branch draws itself in and
          its packet takes over. /menu stays struck — the page-wide
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
            <circle r="3" className="hw-packet hw-packet-winter fill-dest-2">
              <animateMotion dur="3.6s" repeatCount="indefinite" path={BR.paths.winter} />
            </circle>
            <circle r="3" className="hw-packet hw-packet-order fill-dest-3">
              <animateMotion dur="3.6s" repeatCount="indefinite" path={BR.paths.order} />
            </circle>
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
          The full month, edge to edge: flex-1 bars fill whatever width
          the card has, the violet window named by its legend. Hover
          runs the wave (applied, not unpaused — a paused negative-delay
          animation freezes mid-cycle at first paint). */}
      <Cell
        ordinal="04"
        title="Track scan analytics"
        note="Every scan by day, country, city, device and referrer. Rolled up daily, honest about bots."
      >
        <div className="flex w-full flex-col gap-3 self-center px-1">
          <div className="flex h-[104px] w-full items-end gap-[3px]">
            {SCAN_BARS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "hw-bar min-w-0 flex-1 rounded-[1px]",
                  i >= WINDOW_START ? "bg-(--chart-1)" : "bg-foreground/25",
                )}
                style={{ height: `${(h / 24) * 100}%`, "--i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2.5 font-mono text-[11px] text-muted-foreground">
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
