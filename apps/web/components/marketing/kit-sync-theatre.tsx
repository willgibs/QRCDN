import type { CSSProperties } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { ModuleMark } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

/**
 * 04 Brand system's body (P9.9-C1, board pick: "B, the sync theatre, with
 * A's physicality"; this is the C1-R2e shape). The Ember kit card is the
 * control; FIVE print artifacts across varied marketing surfaces are the
 * fleet (board: the kit should read as carrying across the surfaces codes
 * live on, not a grid of codes): a table tent, a round door sticker, a
 * notched ticket, a poster, and a loyalty card. A 15s CSS loop
 * (globals.css `ks-*`, reduced-motion = the day still) cycles THREE
 * distinct creative kit states and returns seamlessly:
 *
 *   day:     #131316 on #ffffff, rounded 0.88, leaf eyes
 *   mono:    #ffffff on #18181b, square 1.00, square eyes
 *   glacier: #90daff on #04131d, circle 0.78, circle/dot eyes
 *
 * Verification (the C1 color protocol): day scores 100; mono and glacier
 * are INVERTED codes — instrument 85 with the inverted-polarity warning
 * ("some older scanners") — and both decode 3/3 empirically through the
 * zxing campaign harness incl. the 35-char worst case (17.7:1 / 12.2:1
 * contrast). Board-directed with that verdict on record.
 *
 * Every state shift travels as a PASS-THROUGH WAVE (soft diagonal mask,
 * one continuous direction; see globals.css) so the transition reads
 * identically for every color pair and the loop wrap renders identical
 * pixels. Mats sit straight (rotated dark strokes aliased). Server-only:
 * FIFTEEN engine renders at module scope (5 payloads x 3 states; ~35KB
 * raw each, ~5x wire compression; matrices differ per payload so
 * filmstrip's symbol/use sharing cannot apply). The save-note line was
 * removed at the board's call: a looping cycle has no save moment, and
 * the lede carries the sync claim.
 *
 * "Ember" is the recurring demo brand (playground preset, state-cards).
 */

const STATE_DAY = parseQrStyle({
  v: 1,
  dots: { style: "rounded", sizeRatio: 0.88 },
  eyes: { frame: "leaf", pupil: "rounded", color: null },
  fill: { type: "solid", color: "#131316" },
  background: { transparent: false, color: "#ffffff" },
});
const STATE_MONO = parseQrStyle({
  v: 1,
  dots: { style: "square", sizeRatio: 1 },
  eyes: { frame: "square", pupil: "square", color: null },
  fill: { type: "solid", color: "#ffffff" },
  background: { transparent: false, color: "#18181b" },
});
const STATE_GLACIER = parseQrStyle({
  v: 1,
  dots: { style: "circle", sizeRatio: 0.78 },
  eyes: { frame: "circle", pupil: "dot", color: null },
  fill: { type: "solid", color: "#90daff" },
  background: { transparent: false, color: "#04131d" },
});

const PAYLOADS = [
  "HTTPS://QRCDN.COM/MENU",
  "HTTPS://QRCDN.COM/HOURS",
  "HTTPS://QRCDN.COM/EVENTS",
  "HTTPS://QRCDN.COM/POSTER",
  "HTTPS://QRCDN.COM/CLUB",
] as const;

const RENDERS = PAYLOADS.map((payload) => ({
  day: renderQr({ data: payload, style: STATE_DAY }).svg,
  mono: renderQr({ data: payload, style: STATE_MONO }).svg,
  glacier: renderQr({ data: payload, style: STATE_GLACIER }).svg,
}));

function PaperSwatch({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("size-4 rounded-[5px] border border-white/25", className)}
      style={style}
      aria-hidden
    />
  );
}

const POP_PHASE_CLASS = {
  /** state 1's value: out at beat 1, back in at beat 3 (the wrap) */
  v1: "ks-ch-v1",
  /** state 2's value: in at beat 1, out at beat 2 */
  v2: "ks-ch-v2",
  /** state 3's value: in at beat 2, out at beat 3 */
  v3: "ks-ch-v3",
} as const;

/** The slowed number-pop-in (transitions.dev 02) for a kit property value:
 *  each character rides its own phase-shifted 15s cycle (90ms stagger,
 *  the reference's bounce curve). Monospace keeps the stacked values
 *  character-aligned. */
function PopChars({ value, phase }: { value: string; phase: keyof typeof POP_PHASE_CLASS }) {
  return (
    <>
      {value.split("").map((ch, i) => (
        <span
          // a value's chars are positionally stable across the loop
          key={i}
          className={POP_PHASE_CLASS[phase]}
          style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

/** A stacked three-state property value in one fixed-width slot. */
function ValueSlot({
  values,
  width = "w-[7ch]",
}: {
  values: [string, string, string];
  width?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-[1.2em] items-center", width)}>
      {(["v1", "v2", "v3"] as const).map((phase, i) => (
        <span key={phase} className="absolute inset-0 flex items-center justify-end">
          <PopChars value={values[i]} phase={phase} />
        </span>
      ))}
    </span>
  );
}

/** A stacked three-state swatch. */
function SwatchStack({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="relative inline-flex size-3.5">
      <PaperSwatch className="absolute inset-0 size-3.5" style={{ backgroundColor: colors[0] }} />
      <PaperSwatch className="ks-blk-2 absolute inset-0 size-3.5" style={{ backgroundColor: colors[1] }} />
      <PaperSwatch className="ks-blk-3 absolute inset-0 size-3.5" style={{ backgroundColor: colors[2] }} />
    </span>
  );
}

/** The three state layers of one artifact's code: day base, mono and
 *  glacier riding the pass-through wave. */
function QrLayers({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn("relative block", className)}>
      <span
        className="block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].day }}
      />
      <span
        className="ks-sweep ks-sweep-b absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].mono }}
      />
      <span
        className="ks-sweep ks-sweep-c absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].glacier }}
      />
    </span>
  );
}

/** The mat's own paper riding the same wave (mono then glacier; the day
 *  paper is the mat's white base). */
function PaperWashes({ rounded = "rounded-xl" }: { rounded?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cn("ks-sweep ks-sweep-b pointer-events-none absolute inset-0 bg-[#18181b]", rounded)}
      />
      <span
        aria-hidden
        className={cn("ks-sweep ks-sweep-c pointer-events-none absolute inset-0 bg-[#04131d]", rounded)}
      />
    </>
  );
}

const MAT_SHADOW =
  "shadow-[0_22px_44px_-20px_rgb(0_0_0/0.8),0_5px_14px_-7px_rgb(0_0_0/0.55)]";

export function KitSyncTheatre() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
      {/* The control: the kit card — a clean change between kit states, no
          simulated app chrome. Purely presentational. */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm">
        <p className="mb-3 flex items-center gap-2.5 font-medium text-foreground">
          {/* The kit identity in miniature: the ink-tinted ModuleMark on
              its own paper chip, walking the three states. */}
          <span className="relative inline-flex size-5" aria-hidden>
            <span className="absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-white">
              <ModuleMark className="size-3 text-[#131316]" />
            </span>
            <span className="ks-blk-2 absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#18181b]">
              <ModuleMark className="size-3 text-white" />
            </span>
            <span className="ks-blk-3 absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#04131d]">
              <ModuleMark className="size-3 text-[#90daff]" />
            </span>
          </span>
          <span>Ember</span>
          <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            kit
          </span>
        </p>
        <dl className="font-mono text-[0.66rem] text-muted-foreground">
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>ink</dt>
            <dd className="flex items-center gap-1.5 text-foreground/80">
              <ValueSlot values={["#131316", "#ffffff", "#90daff"]} />
              <SwatchStack colors={["#131316", "#ffffff", "#90daff"]} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>paper</dt>
            <dd className="flex items-center gap-1.5 text-foreground/80">
              <ValueSlot values={["#ffffff", "#18181b", "#04131d"]} />
              <SwatchStack colors={["#ffffff", "#18181b", "#04131d"]} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>modules</dt>
            <dd className="text-foreground/80">
              <ValueSlot width="w-[14ch]" values={["rounded · 0.88", "square · 1.00", "circle · 0.78"]} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>eyes</dt>
            <dd className="text-foreground/80">
              <ValueSlot values={["leaf", "square", "circle"]} />
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>attached codes</dt>
            <dd>5</dd>
          </div>
        </dl>
      </div>

      {/* The fleet: five marketing surfaces the same kit carries across —
          different shapes, sizes, and compositions on purpose (board: not
          a grid of codes). Straight-set; physicality rides paper shadows,
          the sticker's circle, the ticket's notches, the card's landscape
          cut. Order maps to PAYLOADS. */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-6">
        {/* 1 · table tent */}
        <figure className={cn("relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5 sm:col-span-2", MAT_SHADOW)}>
          <PaperWashes />
          <QrLayers index={0} />
          <figcaption className="ks-caption relative flex items-baseline justify-between font-mono text-[0.6rem]">
            <span>qrcdn.com/menu</span>
            <span>table tent</span>
          </figcaption>
        </figure>

        {/* 2 · round door sticker */}
        <figure
          className={cn(
            "ks-m2 relative m-0 flex aspect-square flex-col items-center justify-center gap-1.5 self-center rounded-full bg-white p-[12%] sm:col-span-2",
            MAT_SHADOW,
          )}
        >
          <PaperWashes rounded="rounded-full" />
          <QrLayers index={1} className="w-[64%]" />
          <figcaption className="ks-caption relative font-mono text-[0.55rem]">
            qrcdn.com/hours
          </figcaption>
        </figure>

        {/* 3 · ticket, punched + perforated */}
        <figure className={cn("ks-m3 relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5 sm:col-span-2", MAT_SHADOW)}>
          <PaperWashes />
          {/* punched notches: the page background showing through */}
          <span aria-hidden className="absolute -top-1.5 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-background" />
          <span aria-hidden className="absolute -bottom-1.5 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-background" />
          <QrLayers index={2} />
          {/* tear line */}
          <span aria-hidden className="ks-caption relative border-t border-dashed border-current opacity-60" />
          <figcaption className="ks-caption relative flex items-baseline justify-between font-mono text-[0.6rem]">
            <span>qrcdn.com/events</span>
            <span>ticket</span>
          </figcaption>
        </figure>

        {/* 4 · poster */}
        <figure className={cn("ks-m4 relative m-0 flex flex-col gap-3 rounded-xl bg-white p-5 sm:col-span-3", MAT_SHADOW, "col-span-2")}>
          <PaperWashes />
          <span className="ks-inkline relative font-display text-sm font-bold tracking-[0.3em]">
            EMBER
          </span>
          <span aria-hidden className="ks-inkline relative border-t border-current opacity-70" />
          <QrLayers index={3} className="mx-auto w-[62%]" />
          <figcaption className="ks-caption relative text-center font-mono text-[0.6rem]">
            qrcdn.com/poster · A2 print
          </figcaption>
        </figure>

        {/* 5 · loyalty card */}
        <figure className={cn("ks-m5 relative m-0 flex items-center gap-4 self-center rounded-xl bg-white p-4 sm:col-span-3", MAT_SHADOW, "col-span-2")}>
          <PaperWashes />
          <span className="relative flex min-w-0 flex-1 flex-col gap-1">
            <span className="ks-inkline font-display text-xs font-bold tracking-[0.2em]">EMBER</span>
            <span className="ks-caption font-mono text-[0.55rem]">loyalty club · member 0117</span>
            <figcaption className="ks-caption mt-2 font-mono text-[0.55rem]">
              qrcdn.com/club
            </figcaption>
          </span>
          <QrLayers index={4} className="w-[34%] shrink-0" />
        </figure>
      </div>
    </div>
  );
}
