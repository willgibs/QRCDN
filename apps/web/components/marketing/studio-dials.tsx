"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { renderPreview } from "@/lib/preview";
import { cn } from "@/lib/utils";

/**
 * The section-03 island (P9.9-C2) — the board's merged pick from the C2
 * exploration artifact: variant A's live engine dials plus variant B's
 * style range, staged with A's floating physicality. At rest the wall
 * shows four DIFFERENT kits (two white-paper, two C1-verified inverted
 * showpieces); the first dial turn converges every mat onto the visitor's
 * config with a staggered crossfade ("on a config click from user, all
 * adopt selected config properties (fluid merge/transition)").
 *
 * This replaces the full Playground on the landing (the round's jitter
 * lever). What was shed relative to that island: react-colorful, the
 * radix slider/popover/toggle-group, the SVG/PNG export path, and the
 * motion/react dependency. What remains: the engine, native radio dials
 * (keyboard and AT semantics for free), and the studio's own shape
 * swatches. The full Playground lives on unchanged at
 * /features/brand-studio.
 *
 * Color truth (this round's certification, scratchpad verify-c2-dials.ts):
 * all 48 reachable combos (3 modules x 4 eyes x 4 inks on white) instrument
 * at 100; the two inverted rest styles reuse C1's byte-identical verified
 * pairs (85 inverted-pattern only, empirical decode 3/3 incl. the 35-char
 * worst case) and are never reachable through the dials.
 *
 * Transition (C2-R1, board redirect): the AURORA SWEEP — section 04's
 * aurora identity (shared paint via the grouped ks/sdx aurora selectors
 * in globals.css), staged directionally per mat. On a dial turn each mat
 * mounts an FxOverlay: the dark plate sweeps in from the top-left corner
 * behind a soft gradient front with the aurora riding inside it, the new
 * render steps in and the paper transitions under full cover, and the
 * whole overlay fades back out as one. The sweep mask is box-relative and
 * per-mat, so C1's cross-box misregistration class cannot occur; overlay,
 * reveal, and the delayed paper transition share one 1200ms duration and
 * the wall's 90ms stagger. The previous render sits under the new one
 * (`sdx-reveal` steps it visible at half-time) and is removed on
 * animation end. Reduced motion: no overlay, no under layer, instant
 * swap. Served HTML carries none of this machinery: at SSR there is
 * exactly one layer per mat at rest values, no opacity:0 (standing
 * invariant).
 */

type DotStyle = (typeof DOT_STYLES)[number];
type EyeFrame = (typeof EYE_FRAMES)[number];

// Curated pairings, same values the studio presets and the C1 theatre
// states ship: module size follows the shape, pupil follows the frame.
const MODULE_SIZE: Record<DotStyle, number> = { square: 1, rounded: 0.88, circle: 0.78 };
const EYE_PUPIL: Record<EyeFrame, "square" | "rounded" | "dot"> = {
  square: "square",
  rounded: "rounded",
  circle: "dot",
  leaf: "rounded",
};

// All four instrument-certified on white (verify-c2-dials.ts). Ember's
// espresso leads: the recurring demo kit's own ink.
const INKS = ["#131316", "#1e3a8a", "#0f766e", "#b91c1c"] as const;

const WHITE = "#ffffff";

// Caption ink per paper — the C1 theatre's own caption palette.
const CAPTION_ON_PAPER: Record<string, string> = {
  [WHITE]: "#6b6b74",
  "#18181b": "#9d9da6",
  "#04131d": "#85a8bd",
};

function kitStyle(dot: DotStyle, eye: EyeFrame, ink: string, paper: string): QrStyle {
  return parseQrStyle({
    v: 1,
    dots: { style: dot, sizeRatio: MODULE_SIZE[dot] },
    eyes: { frame: eye, pupil: EYE_PUPIL[eye], color: null },
    fill: { type: "solid", color: ink },
    background: { transparent: false, color: paper },
  });
}

interface RestKit {
  dot: DotStyle;
  eye: EyeFrame;
  ink: string;
  paper: string;
}

// The rest-state range (variant B's contribution): ember and cobalt on
// white, then the two inverted showpieces. Payloads are anonymous studio
// play, deliberately NOT the Ember cast section 04 owns.
const MATS: Array<{ payload: string; label: string; rest: RestKit }> = [
  {
    payload: "HTTPS://QRCDN.COM/HELLO",
    label: "qrcdn.com/hello",
    rest: { dot: "rounded", eye: "leaf", ink: "#131316", paper: WHITE },
  },
  {
    payload: "HTTPS://QRCDN.COM/PORTFOLIO",
    label: "qrcdn.com/portfolio",
    rest: { dot: "square", eye: "square", ink: "#1e3a8a", paper: WHITE },
  },
  {
    payload: "HTTPS://QRCDN.COM/GALLERY",
    label: "qrcdn.com/gallery",
    rest: { dot: "square", eye: "square", ink: WHITE, paper: "#18181b" },
  },
  {
    payload: "HTTPS://QRCDN.COM/RSVP",
    label: "qrcdn.com/rsvp",
    rest: { dot: "circle", eye: "circle", ink: "#90daff", paper: "#04131d" },
  },
];

// A's floating look: varied widths, slight rotations, corner-only overlap
// on a fixed canvas at lg (captions must stay clear of every neighbor —
// the first probe had the card mat sitting on the poster's caption); a
// plain two-up grid below lg.
const MAT_PHYSICAL = [
  "lg:absolute lg:left-[4%] lg:top-[2%] lg:w-[13rem] lg:-rotate-3",
  "lg:absolute lg:left-[30%] lg:top-[46%] lg:z-10 lg:w-[11rem] lg:rotate-2",
  "lg:absolute lg:right-[19%] lg:top-0 lg:w-[12rem] lg:rotate-1",
  "lg:absolute lg:right-[1%] lg:top-[50%] lg:w-[10.5rem] lg:-rotate-2",
] as const;

const STAGGER_MS = 90;

/**
 * One aurora-sweep run over a single mat. Mounted per dial turn (keyed by
 * the run counter), removed when its wrapper animation ends. The children
 * carry the same inline delay as the wrapper so aurora ramp and sweep
 * stay in phase through the stagger.
 */
function FxOverlay({ delayMs }: { delayMs: number }) {
  const [done, setDone] = useState(false);
  const delay = { animationDelay: `${delayMs}ms` };
  if (done) return null;
  return (
    <span
      aria-hidden
      className="sdx-fx pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]"
      style={delay}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setDone(true);
      }}
    >
      <span className="sdx-plate absolute inset-0" />
      <span className="sdx-aurora-a" style={delay} />
      <span className="sdx-aurora-b" style={delay} />
    </span>
  );
}

function MatQr({ payload, style, delayMs }: { payload: string; style: QrStyle; delayMs: number }) {
  const { svg } = useMemo(() => renderPreview(payload, style), [payload, style]);
  const [prev, setPrev] = useState<{ svg: string; key: number } | null>(null);
  const prevSvg = useRef(svg);
  const keyRef = useRef(0);

  useEffect(() => {
    if (prevSvg.current === svg) return;
    const old = prevSvg.current;
    prevSvg.current = svg;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    keyRef.current += 1;
    setPrev({ svg: old, key: keyRef.current });
  }, [svg]);

  return (
    <div data-qr className="relative [&_svg]:block [&_svg]:h-auto [&_svg]:w-full">
      {prev && (
        <div aria-hidden className="absolute inset-0" dangerouslySetInnerHTML={{ __html: prev.svg }} />
      )}
      <div
        key={prev?.key ?? 0}
        className={cn("relative", prev && "sdx-reveal")}
        style={prev ? { animationDelay: `${delayMs}ms` } : undefined}
        onAnimationEnd={() => setPrev(null)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

/* P9.10-D3: the flat border became the lit-stroke hairline (D0 note 3 —
   the gradient stroke "applies to toggles, buttons, chips, cards"; these
   dials are the studio's toggles). The checked cue moved from
   border-color to an INSET ring so it can't collide with the
   focus-visible ring utilities, which share the outer ring slot. */
const CHIP =
  "lit-stroke flex size-11 cursor-pointer items-center justify-center rounded-lg bg-card/50 text-foreground/75 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:bg-card hover:text-foreground peer-checked:bg-muted peer-checked:text-foreground peer-checked:inset-ring peer-checked:inset-ring-foreground/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background";

function DialLegend({ children }: { children: string }) {
  return (
    <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </legend>
  );
}

export function StudioDials() {
  const uid = useId();
  const [config, setConfig] = useState<{ dot: DotStyle; eye: EyeFrame; ink: string } | null>(null);
  // Counts dial turns; each increment mounts a fresh keyed FxOverlay per
  // mat (the aurora sweep). Never incremented under reduced motion, so
  // the overlay is simply never created there.
  const [fxRun, setFxRun] = useState(0);

  // Displayed dial values: the Ember starting kit until the first turn.
  const dot = config?.dot ?? "rounded";
  const eye = config?.eye ?? "leaf";
  const ink = config?.ink ?? INKS[0];

  function apply(partial: Partial<{ dot: DotStyle; eye: EyeFrame; ink: string }>) {
    setConfig({ dot, eye, ink, ...partial });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFxRun((n) => n + 1);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,19rem)_1fr] lg:gap-12">
      <div className="flex flex-col gap-6">
        <fieldset>
          <DialLegend>Module</DialLegend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DOT_STYLES.map((s) => (
              <label key={s}>
                <input
                  type="radio"
                  name={`${uid}-module`}
                  value={s}
                  checked={dot === s}
                  onChange={() => apply({ dot: s })}
                  className="peer sr-only"
                />
                <span aria-hidden className={CHIP}>
                  <DotSwatch style={s} />
                </span>
                <span className="sr-only">{s} modules</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <DialLegend>Eye</DialLegend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {EYE_FRAMES.map((f) => (
              <label key={f}>
                <input
                  type="radio"
                  name={`${uid}-eye`}
                  value={f}
                  checked={eye === f}
                  onChange={() => apply({ eye: f })}
                  className="peer sr-only"
                />
                <span aria-hidden className={CHIP}>
                  <EyeSwatch frame={f} />
                </span>
                <span className="sr-only">{f} eyes</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <DialLegend>Ink</DialLegend>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {INKS.map((hex) => (
              <label key={hex}>
                <input
                  type="radio"
                  name={`${uid}-ink`}
                  value={hex}
                  checked={ink === hex}
                  onChange={() => apply({ ink: hex })}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="block size-8 cursor-pointer rounded-full border border-white/20 transition-shadow duration-(--duration-normal) ease-(--motion-ease-out) peer-checked:ring-2 peer-checked:ring-foreground/70 peer-checked:ring-offset-2 peer-checked:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                  style={{ backgroundColor: hex }}
                />
                <span className="sr-only">{hex} ink</span>
              </label>
            ))}
            <Link
              href="/studio"
              aria-label="More inks in the studio"
              className="flex size-8 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:border-foreground/50 hover:text-foreground"
            >
              +
            </Link>
          </div>
        </fieldset>

        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          {config
            ? "every mat follows your pick"
            : "turn any dial: the whole wall follows"}
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-4 lg:block lg:h-[26rem]">
        {MATS.map((mat, i) => {
          const style = config
            ? kitStyle(config.dot, config.eye, config.ink, WHITE)
            : kitStyle(mat.rest.dot, mat.rest.eye, mat.rest.ink, mat.rest.paper);
          const paper = config ? WHITE : mat.rest.paper;
          return (
            <figure
              key={mat.payload}
              className={cn(
                // Paper/caption colors flip UNDER the sweep: 450ms in plus
                // the mat's own stagger lands inside the covered window
                // (45-62% of the 1200ms overlay timeline).
                "relative flex flex-col gap-2 rounded-xl p-3 shadow-xl shadow-black/50 ring-1 ring-white/10 motion-safe:transition-colors motion-safe:duration-300",
                MAT_PHYSICAL[i],
              )}
              style={{ backgroundColor: paper, transitionDelay: `${450 + i * STAGGER_MS}ms` }}
            >
              <MatQr payload={mat.payload} style={style} delayMs={i * STAGGER_MS} />
              <figcaption
                className="whitespace-nowrap font-mono text-[10px] tracking-[0.06em] motion-safe:transition-colors motion-safe:duration-300"
                style={{
                  color: CAPTION_ON_PAPER[paper],
                  transitionDelay: `${450 + i * STAGGER_MS}ms`,
                }}
              >
                {mat.label}
              </figcaption>
              {fxRun > 0 && <FxOverlay key={fxRun} delayMs={i * STAGGER_MS} />}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
