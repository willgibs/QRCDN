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
 * 01 — How It Works as a numbered 2x2 grid (P9.10-D9, the second pass).
 *
 * Replaces the filmstrip. Its four concepts and its recently re-cut copy
 * survive intact — Design / Create / Track / Update ARE the product
 * overview — but the shared rail (347 lines of lg-only absolute geometry
 * that collapsed below lg and gave no station room) retires. Each concept
 * now holds a card of its own, and each card earns exactly ONE hover
 * microanimation that demonstrates its concept rather than decorating it:
 *
 *   01 the code RESTYLES        (a second real engine render crossfades)
 *   02 the fan SPREADS          (the hero's spring pair, miniaturized)
 *   03 the NEXT REPOINT plays   (a drawn strike + the next destination)
 *   04 the scans ARRIVE         (a wave travels the bars, looped)
 *
 * All choreography is CSS in globals.css's `.hw-*` block, gated on
 * `(hover: hover) and (pointer: fine)` and reduced-motion — touch and
 * reduced-motion get the polished base states, complete. The cells are
 * non-interactive figures, so no focus parity is owed (the hero fan's
 * precedent). Zero client JS; this stays a server component.
 *
 * An `<ol>` on purpose: the numbers are the product pipeline, a real
 * sequence, not decoration.
 *
 * The café thread survives: /CAFE is the code you style in cell 01, one
 * of the three you mint in cell 02, and the code you repoint in cell 03 —
 * the same code section 05 then repoints through its year. B and C exist
 * so cell 02's "create new codes" is literal: three visibly different
 * module patterns wearing one identical style is how "the kit propagates"
 * is drawn rather than said.
 */

const QR_A = "HTTPS://QRCDN.COM/CAFE";
const QR_B = "HTTPS://QRCDN.COM/MENU";
const QR_C = "HTTPS://QRCDN.COM/TOUR";

const CODES = {
  a: definePrintCode(QR_A, "hw-a"),
  b: definePrintCode(QR_B, "hw-b"),
  c: definePrintCode(QR_C, "hw-c"),
} as const;

/**
 * Cell 01's hover layer: the SAME payload restyled — rounded modules at
 * 0.88, cobalt ink. Both halves of that choice are already certified
 * ground: cobalt #1e3a8a on white is one of the three pairs the C2
 * instrument scored at 100 (the hero's mats print it today), and
 * rounded/0.88 is hero-mat-2's shipped geometry. QR solidity holds: the
 * crossfade is between two REAL engine renders of one payload, never a
 * repaint of one render.
 *
 * Rendered transparent-background because it sits inside the SAME white
 * mat as the base render — the crossfade happens on one sheet of paper,
 * which is the concept (one code, your look applied), not two mats
 * swapping.
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

/** The D13 precision ink — the base chip states what the base render
 *  actually is (square modules, espresso), unlike the filmstrip's chip,
 *  which listed "rounded · circle eye" beside a square-module render. */
const BASE_INK = "#131316";

/** The filmstrip's authored 30-day series, unchanged (and its caption
 *  total with it — no new claims). Indices 9-13 are the violet recent
 *  window: DATA color, first-class per the D3 doctrine. */
const SCAN_BARS = [4, 5, 4, 6, 5, 7, 6, 9, 8, 12, 17, 24, 19, 13, 9, 7, 6, 5];

function InkChip({ ink, label }: { ink: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground">
      <span
        aria-hidden
        className="relative size-[13px] shrink-0 rounded-[3px] border border-border bg-white"
      >
        <span
          aria-hidden
          className="absolute inset-[2.5px] rounded-[1px]"
          style={{ backgroundColor: ink }}
        />
      </span>
      {ink} · {label}
    </span>
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
    <li className="hw-card group flex min-w-0 flex-col rounded-2xl border border-border bg-card/40 p-6 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:border-foreground/25">
      {/* The stage: fixed height so all four cards share one horizon and
          nothing the micros do can ever move layout. */}
      <div aria-hidden className="flex h-44 items-center justify-center">
        {children}
      </div>
      <div className="mt-5 grid grid-cols-[30px_1fr] gap-y-1.5 border-t border-border/60 pt-4">
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

      {/* 01 · the code restyles. The overlay sits inside PrintMat's own
          padding box (same 8.3% margin ratio) so both renders share one
          quiet zone on one sheet; the base <use> fades out underneath as
          the cobalt render fades in, because two transparent renders
          stacked at full opacity would read as mush, not a restyle. */}
      <Cell
        ordinal="01"
        title="Design your style"
        note="Pick your ink, module shape and corner style once. That kit becomes your look."
      >
        <div className="flex flex-col items-center gap-4">
          {/* Explicit square wrapper: an inline-block here blockifies as a
              flex item and its width collapsed under the overlay (caught
              at the D9 visual pass — the cobalt layer rendered at half
              width). The overlay's padding is the SAME 10px PrintMat
              computes for size 116 (round(116 * 0.083)), so both renders
              share one quiet zone to the pixel. */}
          <span className="relative block size-[116px]">
            <PrintMat code={CODES.a} size={116} depth="raised" className="hw-mat-base" />
            <span
              aria-hidden
              className="hw-restyle absolute inset-0 p-[10px]"
              dangerouslySetInnerHTML={{ __html: RESTYLED_SVG }}
            />
          </span>
          <span className="relative grid place-items-center">
            <span className="hw-chip-base col-start-1 row-start-1">
              <InkChip ink={BASE_INK} label="square" />
            </span>
            <span className="hw-chip-alt col-start-1 row-start-1">
              <InkChip ink={RESTYLE_INK} label="rounded" />
            </span>
          </span>
        </div>
      </Cell>

      {/* 02 · the fan spreads. Three genuinely different module patterns,
          one identical style — "the kit propagates," drawn. Hover deals
          them apart on the hero's spring pair and they settle back. */}
      <Cell
        ordinal="02"
        title="Create new codes"
        note="Every code you make inherits the kit. Export SVG or PNG, no watermark, no limits on static codes."
      >
        {/* A symmetric dealt fan: the thread code front and center on the
            deeper shadow, B and C tucked behind its shoulders. items-center
            so the arc pivots from the middle, the way a hand fans cards. */}
        <div className="flex items-center -space-x-7">
          <span className="hw-fan hw-fan-l relative z-0 translate-y-[6px] rotate-[-8deg]">
            <PrintMat code={CODES.c} size={84} />
          </span>
          <span className="hw-fan hw-fan-m relative z-20">
            <PrintMat code={CODES.a} size={100} depth="raised" />
          </span>
          <span className="hw-fan hw-fan-r relative z-10 translate-y-[6px] rotate-[8deg]">
            <PrintMat code={CODES.b} size={84} />
          </span>
        </div>
      </Cell>

      {/* 03 · the next repoint plays. The mat and its address are the
          constant; the destination column carries the story. /menu is
          already struck (the `line-through` class — the page-wide e2e pin
          counts exactly one of these); hover draws a strike across
          /winter (a scaling span, deliberately NOT the class) while
          /order rises in as the new destination, and it all reverses on
          hover-off. `/order` occupies layout at opacity 0, so nothing
          here ever animates layout. */}
      <Cell
        ordinal="03"
        title="Update links anytime"
        note="Repoint a code after it is printed. The code on the wall never changes, only where it sends people."
      >
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2.5">
            <PrintMat code={CODES.a} size={104} depth="raised" />
            <span className="font-mono text-[11px] text-muted-foreground">qrcdn.com/cafe</span>
          </div>
          <div className="flex flex-col items-start gap-2 font-mono text-[12px]">
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

      {/* 04 · the scans arrive. The chart is the subject here — the code
          is out in the world, printed in the other three cells — so no
          mat. Hover runs a wave through the bars: transform-only, each
          bar phase-offset by its index, applied (not just unpaused) on
          hover so the resting chart is exactly the authored series. */}
      <Cell
        ordinal="04"
        title="Track scan analytics"
        note="Every scan by day, country, city, device and referrer. Rolled up daily, honest about bots."
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-[104px] items-end gap-[4px]">
            {SCAN_BARS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "hw-bar w-[5px] rounded-[1px]",
                  i >= 9 && i <= 13 ? "bg-(--chart-1)" : "bg-foreground/25",
                )}
                style={{ height: `${(h / 24) * 100}%`, "--i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <span className="font-mono text-[12px] text-muted-foreground">
            1,284 scans · 30 days
          </span>
        </div>
      </Cell>
    </ol>
  );
}
