import type { CSSProperties } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { ModuleMark } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

/**
 * 04 Brand system's body (P9.9-C1, board pick: "B, the sync theatre, with
 * A's physicality"; final C1 shape after the R2 polish rounds). The Ember
 * kit card is the control; THREE print artifacts are the fleet — a table
 * tent, a door sticker, and a notched ticket, deliberately the SIMPLE mat
 * form (two bespoke-anatomy rounds were built and the board called the
 * revert: "these aren't cutting it and I'd rather proceed"). An 18s CSS
 * loop (globals.css `ks-*`, reduced-motion = the day still) cycles THREE
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
 * Every state shift is the C1-R2f SHIMMER TRANSITION (board direction,
 * replacing the mask wave whose fronts misregistered across different box
 * sizes): the mat fades to a dark plate, a wavy rainbow shimmer sweeps
 * it, and the plate drops quickly to reveal the next state — all opacity,
 * box-size-independent, loop-clean (see globals.css `ks-*`). Mats sit
 * straight (rotated dark strokes aliased). Server-only: NINE engine
 * renders at module scope (3 payloads x 3 states; ~35KB raw each, ~5x
 * wire compression; matrices differ per payload so filmstrip's symbol/use
 * sharing cannot apply). The save-note line was removed at the board's
 * call: a looping cycle has no save moment, and the lede carries the
 * sync claim.
 *
 * "Ember" is the recurring demo brand (playground preset, state-cards).
 *
 * P9.10-D12: the STATES and PAYLOADS are exported — the landing's
 * KitNetwork imports them so the expensively-verified cast stays
 * single-sourced (this theatre remains /features/brand-studio's body).
 */

export const STATE_DAY = parseQrStyle({
  v: 1,
  dots: { style: "rounded", sizeRatio: 0.88 },
  eyes: { frame: "leaf", pupil: "rounded", color: null },
  fill: { type: "solid", color: "#131316" },
  background: { transparent: false, color: "#ffffff" },
});
export const STATE_MONO = parseQrStyle({
  v: 1,
  dots: { style: "square", sizeRatio: 1 },
  eyes: { frame: "square", pupil: "square", color: null },
  fill: { type: "solid", color: "#ffffff" },
  background: { transparent: false, color: "#18181b" },
});
export const STATE_GLACIER = parseQrStyle({
  v: 1,
  dots: { style: "circle", sizeRatio: 0.78 },
  eyes: { frame: "circle", pupil: "dot", color: null },
  fill: { type: "solid", color: "#90daff" },
  background: { transparent: false, color: "#04131d" },
});

export const PAYLOADS = [
  "HTTPS://QRCDN.COM/MENU",
  "HTTPS://QRCDN.COM/HOURS",
  "HTTPS://QRCDN.COM/EVENTS",
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
 *  glacier as step-opacity switches — they only ever flip while the
 *  transition cover is opaque (globals.css timing), so the swap is never
 *  visible. */
function QrLayers({ index, className }: { index: number; className?: string }) {
  return (
    // data-qr: the e2e engine-render count hooks here (decorative inline
    // svgs, like the sticker's curved text, must not count).
    <span data-qr className={cn("relative block", className)}>
      <span
        className="block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].day }}
      />
      <span
        className="ks-state-2 absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].mono }}
      />
      <span
        className="ks-state-3 absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].glacier }}
      />
    </span>
  );
}

/** The mat's own paper on the same step switches (mono then glacier; the
 *  day paper is the mat's white base). Renders BEFORE the mat's content. */
function PaperWashes({ rounded = "rounded-xl" }: { rounded?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cn("ks-state-2 pointer-events-none absolute inset-0 bg-[#18181b]", rounded)}
      />
      <span
        aria-hidden
        className={cn("ks-state-3 pointer-events-none absolute inset-0 bg-[#04131d]", rounded)}
      />
    </>
  );
}

/** The transition itself (board direction, round 2 with reference frames):
 *  the mat fades slowly to a dark plate WHILE the aurora breathes in —
 *  two oversized counter-rotating layers of soft radial color fields
 *  (green, magenta, amber, teal) whose rotation runs continuously through
 *  the whole 18s so motion never visibly starts or stops — then plate and
 *  aurora recede together as the next state emerges. One continuum, no
 *  steps. The overflow-hidden wrapper clips the oversized layers to the
 *  mat's own shape. Renders LAST in the mat (topmost). */
function TransitionFx({ rounded = "rounded-xl" }: { rounded?: string }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-20 overflow-hidden", rounded)}
    >
      <span className={cn("ks-cover absolute inset-0", rounded)} />
      <span className="ks-aurora-a" />
      <span className="ks-aurora-b" />
    </span>
  );
}

const MAT_SHADOW =
  "shadow-[0_22px_44px_-20px_rgb(0_0_0/0.8),0_5px_14px_-7px_rgb(0_0_0/0.55)]";

export function KitSyncTheatre() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
      {/* The control: the kit card — a clean change between kit states, no
          simulated app chrome. Purely presentational. P9.10-D3: dressed in
          the lit-stroke hairline (it is literally "the control" — D0 note
          3's gradient stroke marks the touchable/instrument surfaces). */}
      <div className="lit-stroke rounded-2xl bg-card/60 p-5 text-sm">
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
            <dd>3</dd>
          </div>
        </dl>
      </div>

      {/* The fleet: back to the simple three-mat form (board call after
          two bespoke rounds: "these aren't cutting it and I'd rather
          proceed") — three clean paper mats, the ticket keeping its
          punched notches and tear line, every mat cycling the three kit
          states behind the aurora transition. Order maps to PAYLOADS. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
        {/* 1 · table tent */}
        <figure className={cn("relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5", MAT_SHADOW)}>
          <PaperWashes />
          <QrLayers index={0} />
          <figcaption className="ks-caption relative flex items-baseline justify-between font-mono text-[0.6rem]">
            <span>qrcdn.com/menu</span>
            <span>table tent</span>
          </figcaption>
          <TransitionFx />
        </figure>

        {/* 2 · door sticker */}
        <figure className={cn("ks-m2 relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5", MAT_SHADOW)}>
          <PaperWashes />
          <QrLayers index={1} />
          <figcaption className="ks-caption relative flex items-baseline justify-between font-mono text-[0.6rem]">
            <span>qrcdn.com/hours</span>
            <span>door sticker</span>
          </figcaption>
          <TransitionFx />
        </figure>

        {/* 3 · ticket, punched + perforated */}
        <figure className={cn("ks-m3 relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5", MAT_SHADOW)}>
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
          <TransitionFx />
        </figure>
      </div>
    </div>
  );
}
