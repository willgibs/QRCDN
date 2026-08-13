import type { CSSProperties } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { ModuleMark } from "@/components/brand/marks";
import {
  PAYLOADS,
  STATE_DAY,
  STATE_GLACIER,
  STATE_MONO,
} from "@/components/marketing/kit-sync-theatre";
import { cn } from "@/lib/utils";

/**
 * 04 Brand kits' landing body (P9.10-D12): THE KIT NETWORK — the board's
 * brief verbatim: "show the brand card as the central engine all the
 * codes are connected to (subtle dotted line) and when the brand card
 * updates, the pulse goes out and updates all of the connected codes."
 *
 * This is the D5 hard-sync rule drawn literally: kit edits propagate
 * outward to attached codes (`sync_kit_codes()`), and a code with
 * `brand_kit_id` null is a frozen snapshot — depicted honestly as the
 * fourth mat: no dotted line, one render, never restyles.
 *
 * Zero client JS. One 24s CSS master timeline (globals.css `kn-*`, the
 * proven ks choreography re-staged onto network geometry): the card
 * edits at 25%/58.33%/91.67%, an aurora-hued dash packet departs 0.3s
 * later and travels each spoke in 0.84s (pathLength=100 normalizes the
 * keyframes across spoke lengths — the C1 misregistration answer), and
 * every connected code restyles 120ms after ITS pulse arrives, spokes
 * cascading at +0.12s/+0.24s. Reduced motion: the day still with static
 * dotted lines — every rest state hides via stylesheet base classes, so
 * served HTML carries no opacity:0 (standing invariant).
 *
 * The Ember cast (states + payloads) is IMPORTED from kit-sync-theatre —
 * the verification was expensive (day 100; mono/glacier inverted-85 with
 * 3/3 empirical decode) and stays single-sourced. The theatre itself
 * lives on as /features/brand-studio's body; only the landing swapped.
 *
 * Geometry: one DOM tree. Below lg it lays out as a centered grid (card,
 * then the fleet); at lg it becomes a fixed-pixel 880x524 stage — mats
 * absolutely positioned at inline px coordinates that share the line
 * svg's viewBox space 1:1 (the D9 fixed-pixel lesson; inline left/top
 * are inert while position is static below lg).
 */

const RENDERS = PAYLOADS.map((payload) => ({
  day: renderQr({ data: payload, style: STATE_DAY }).svg,
  mono: renderQr({ data: payload, style: STATE_MONO }).svg,
  glacier: renderQr({ data: payload, style: STATE_GLACIER }).svg,
}));

// The frozen snapshot: rendered once, in the day style it was created
// with, and never again — that is the whole point of it.
const FROZEN_RENDER = renderQr({ data: "HTTPS://QRCDN.COM/LAUNCH", style: STATE_DAY });

// Code size derived from module count, never picked (the manifesto
// derivation): 3.8px/module floor over the full side incl. quiet zone,
// rounded up to a multiple of 4. These payloads encode at v2 -> 33 side
// -> 128px. If a payload changes, this re-derives itself.
const KN_QR = Math.ceil((FROZEN_RENDER.sideLength * 3.8) / 4) * 4;
/** Mat box = code + p-3.5 (14px) each side. */
const KN_MAT_W = KN_QR + 28;

/**
 * The lg stage coordinate table. Stage 880x524; the svg viewBox matches,
 * so these numbers are simultaneously CSS px and path coordinates. The
 * hub port sits at the card's right-edge center; each spoke anchors at
 * its mat's left-edge middle. Spokes are authored HUB -> MAT (direction
 * is load-bearing: the packet dash math assumes distance 0 at the hub).
 */
// Port y = card top (108) + measured card height 236 / 2 (trued against
// the rendered box, the capture-pass step).
const PORT = { x: 256, y: 226 };
const MATS = [
  { left: 520, top: 12, label: "qrcdn.com/menu", kind: "table tent", stagger: "" },
  { left: 704, top: 100, label: "qrcdn.com/hours", kind: "door sticker", stagger: "kn-m2" },
  { left: 520, top: 264, label: "qrcdn.com/events", kind: "ticket", stagger: "kn-m3" },
] as const;
const FROZEN_POS = { left: 704, top: 312 };
const SPOKES = [
  { d: `M ${PORT.x} ${PORT.y} C 352 226, 420 110, 520 110`, packet: "" },
  { d: `M ${PORT.x} ${PORT.y} C 360 226, 420 198, 704 198`, packet: "kn-p2" },
  { d: `M ${PORT.x} ${PORT.y} C 352 226, 420 362, 520 362`, packet: "kn-p3" },
] as const;

function PaperSwatch({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cn("size-4 rounded-[5px] border border-white/25", className)}
      style={style}
      aria-hidden
    />
  );
}

const POP_PHASE_CLASS = {
  v1: "kn-ch-v1",
  v2: "kn-ch-v2",
  v3: "kn-ch-v3",
} as const;

/** The per-character value pop (the theatre's PopChars on the kn
 *  timeline — the card is duplicated, not shared: both copies are welded
 *  to their own timeline's class names, and threading an animation
 *  prefix through five slots costs more than these lines). */
function PopChars({ value, phase }: { value: string; phase: keyof typeof POP_PHASE_CLASS }) {
  return (
    <>
      {value.split("").map((ch, i) => (
        <span
          key={i}
          className={POP_PHASE_CLASS[phase]}
          style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

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

function SwatchStack({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="relative inline-flex size-3.5">
      <PaperSwatch className="absolute inset-0 size-3.5" style={{ backgroundColor: colors[0] }} />
      <PaperSwatch
        className="kn-blk-2 absolute inset-0 size-3.5"
        style={{ backgroundColor: colors[1] }}
      />
      <PaperSwatch
        className="kn-blk-3 absolute inset-0 size-3.5"
        style={{ backgroundColor: colors[2] }}
      />
    </span>
  );
}

/** The three state layers of one connected code: day base, mono and
 *  glacier as step switches timed to the PULSE ARRIVAL — the pulse is
 *  the cover story here, so there is no plate. data-qr scopes the e2e
 *  engine-render count. */
function QrLayers({ index }: { index: number }) {
  return (
    <span data-qr className="relative block">
      <span
        className="block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].day }}
      />
      <span
        className="kn-state-2 absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].mono }}
      />
      <span
        className="kn-state-3 absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: RENDERS[index].glacier }}
      />
    </span>
  );
}

const MAT_SHADOW =
  "shadow-[0_22px_44px_-20px_rgb(0_0_0/0.8),0_5px_14px_-7px_rgb(0_0_0/0.55)]";

function ConnectedMat({
  index,
  left,
  top,
  label,
  kind,
  stagger,
}: {
  index: number;
  left: number;
  top: number;
  label: string;
  kind: string;
  stagger: string;
}) {
  return (
    // Positioning wrapper: the figure itself must stay position:relative
    // for its wash/ring layers, and a RELATIVE element honors left/top —
    // putting the stage coordinates on it shoved every mat sideways on
    // mobile (680px of page overflow). The wrapper is static below lg,
    // so the inline coordinates are truly inert there.
    <div className="lg:absolute" style={{ left, top }}>
    <figure
      className={cn(
        "relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5",
        MAT_SHADOW,
        stagger,
      )}
      style={{ width: KN_MAT_W }}
    >
      {/* mat paper on the same arrival steps as the code */}
      <span aria-hidden className="kn-state-2 pointer-events-none absolute inset-0 rounded-xl bg-[#18181b]" />
      <span aria-hidden className="kn-state-3 pointer-events-none absolute inset-0 rounded-xl bg-[#04131d]" />
      <QrLayers index={index} />
      <figcaption className="kn-caption relative flex flex-col gap-0.5 font-mono text-[0.6rem]">
        <span>{label}</span>
        <span className="opacity-70">{kind}</span>
      </figcaption>
      {/* the arrival afterglow: currentColor ring + bloom, hue stepped
          with the packet (globals.css kn-ring / kn-ring-hue) */}
      <span aria-hidden className="kn-ring pointer-events-none absolute inset-0 rounded-xl" />
    </figure>
    </div>
  );
}

export function KitNetwork() {
  return (
    <div
      data-slot="kit-network"
      className="relative grid grid-cols-2 justify-items-center gap-6 lg:mx-auto lg:block lg:h-[524px] lg:w-[880px]"
    >
      {/* The wiring: dotted spokes (connection, quiet) + the pulse
          packets (one keyframe set for all lengths via pathLength=100 on
          the packet paths ONLY — the dotted bases keep user-px dots and
          non-scaling strokes). Decorative: the sync story is told in
          text by the card and captions. */}
      <svg
        data-slot="kit-network-lines"
        aria-hidden
        viewBox="0 0 880 524"
        className="pointer-events-none absolute inset-0 hidden size-full lg:block"
      >
        {SPOKES.map((spoke, i) => (
          <g key={i}>
            <path d={spoke.d} className="kn-line" fill="none" />
            <path d={spoke.d} pathLength={100} className={cn("kn-packet", spoke.packet)} fill="none" />
          </g>
        ))}
        <circle cx={PORT.x} cy={PORT.y} r={3} className="kn-port" />
      </svg>

      {/* The hub: the kit card IS the engine. lit-stroke marks it as the
          instrument (D0 note 3); the network's port sits at its
          right-edge center. */}
      {/* Positioning lives on this wrapper, NOT on the card: lit-stroke
          pins its own position:relative for the hairline pseudo and would
          beat lg:absolute at equal specificity. */}
      <div className="col-span-2 lg:absolute" style={{ left: 16, top: 108 }}>
      <div className="lit-stroke w-[240px] rounded-2xl bg-card/60 p-5 text-sm">
        <p className="mb-3 flex items-center gap-2.5 font-medium text-foreground">
          <span className="relative inline-flex size-5" aria-hidden>
            <span className="absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-white">
              <ModuleMark className="size-3 text-[#131316]" />
            </span>
            <span className="kn-blk-2 absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#18181b]">
              <ModuleMark className="size-3 text-white" />
            </span>
            <span className="kn-blk-3 absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#04131d]">
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
      </div>

      {MATS.map((mat, i) => (
        <ConnectedMat key={mat.label} index={i} {...mat} />
      ))}

      {/* The frozen snapshot (D5's null-kit case): no line, one render,
          never restyles. Dimmed via brightness, never opacity (the fan
          rule: opacity lets the ground show through paper). */}
      <div className="lg:absolute" style={{ left: FROZEN_POS.left, top: FROZEN_POS.top }}>
      <figure
        className={cn(
          "relative m-0 flex flex-col gap-2 rounded-xl bg-white p-3.5 brightness-[0.85]",
          MAT_SHADOW,
        )}
        style={{ width: KN_MAT_W }}
      >
        <span data-qr className="relative block">
          <span
            className="block [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: FROZEN_RENDER.svg }}
          />
        </span>
        <figcaption className="flex flex-col gap-0.5 font-mono text-[0.6rem] text-[#6b6b74]">
          <span>qrcdn.com/launch</span>
          <span className="opacity-70">poster</span>
          <span className="text-[0.55rem] tracking-[0.08em] uppercase opacity-80">
            no kit · frozen
          </span>
        </figcaption>
      </figure>
      </div>
    </div>
  );
}
