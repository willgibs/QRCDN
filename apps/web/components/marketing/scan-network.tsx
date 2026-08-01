"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/components/brand/magic";
import { DESTINATION_HUES, HUE_CLASSES, HUE_TINT, type DestinationLabel } from "./destination-hues";
import { OrbitStage } from "./orbit-stage";
import { QrTile } from "./qr-tile";

/**
 * The hero artwork: a scan network. One printed code at the center; animated
 * traces flow to whichever destination it currently points at — the
 * retargeting story told as decorative line art (Pipeline-style circuit
 * traces). Harvested-for-pattern from components/explore/network.tsx
 * (P9-U2) into a fresh marketing-owned file. Stage is a fixed 1000×300
 * coordinate system scaled per breakpoint so SVG paths and HTML chips never
 * drift apart.
 *
 * The QR tile itself is rendered ONCE at module scope (light + dark, toggled
 * via `dark:hidden`/`dark:block`) rather than through a client-side,
 * theme-reactive render — the same zero-client-JS static-render pattern the
 * framed product windows use. Only the chip-cycling interval and entrance
 * motion need to be client-side here.
 *
 * Three stage variants, one per breakpoint tier:
 *  - below md: OrbitStage (./orbit-stage.tsx, P9.5-T3a) — a different
 *    artwork entirely (a packet riding a ring between destinations), not a
 *    layout variant of this file's network-trace stages, so it lives in
 *    its own file and is just mounted here.
 *  - md–lg (768–1279): a compact two-chip SVG stage (below), sized to
 *    render its chip text at 100% (no `scale()` transform) — the four-chip
 *    stage previously covered this whole range via `scale-[0.66]`/
 *    `lg:scale-[0.8]`, which also shrank the 11px chip text to 7.3px/8.8px
 *    (docs/guides/design-system.md's T1 A3 note). `scale()` transforms
 *    every descendant uniformly, including font rendering, so the fix is a
 *    layout that never needs the transform in the first place: chips are
 *    positioned via percentage-of-container (derived from the same 640×200
 *    viewBox the SVG paths use) rather than fixed pixel coordinates inside
 *    a scaled box, so the stage can resize fluidly across 768–1279 while
 *    every chip's own font-size stays exactly as authored.
 *  - xl+ (1280px): the original four-chip stage, unchanged.
 *
 * P9.5-T3a: the tile's payload is the marketing site itself
 * (HTTPS://WWW.QRCDN.COM, uppercase for alphanumeric mode) — scanning the
 * hero lands you on the page you're already looking at, which is the
 * point, and drops the need for a slug caption (removed, all stages). Each
 * destination chip/node/flowing-packet now tints toward its own hue
 * (./destination-hues.ts's shared label->hue map, also consumed by
 * OrbitStage so a destination's color never drifts between the two hero
 * artwork stages) instead of the single site accent. `QrTile` itself moved
 * to ./qr-tile.tsx this unit (shared with OrbitStage, avoiding a circular
 * import between the two).
 */

const DESTINATIONS: { label: DestinationLabel; x: number; y: number; side: "left" | "right" }[] = [
  { label: "yourcafe.com/menu", x: 150, y: 70, side: "left" },
  { label: "instagram.com/drop", x: 150, y: 230, side: "left" },
  { label: "tickets.io/tour-2026", x: 850, y: 70, side: "right" },
  { label: "g.page/cafe-norte/review", x: 850, y: 230, side: "right" },
];

const PATHS = [
  "M412 110 C340 110 340 70 268 70 L158 70",
  "M412 190 C340 190 340 230 268 230 L158 230",
  "M588 110 C660 110 660 70 732 70 L842 70",
  "M588 190 C660 190 660 230 732 230 L842 230",
];

const CYCLE_MS = 2800;

// ---- Compact (md/lg) stage — own 640×200 coordinate system, own two-item
// subset of DESTINATIONS (index 0 = the existing "left" entry, index 2 =
// the existing "right" entry — labels read off the shared array so the two
// stages can never drift out of copy sync; x/side are stage-local). ----
const COMPACT_VIEW_W = 640;
// x=155/485 (not a symmetric round 130/510) leaves enough room for the
// longest label in this pair ("tickets.io/tour-2026", 21 chars) to render
// at 768px — the stage's own width equals the viewport's content width at
// that breakpoint (no margin to spare), and 130/510 measured ~6px short
// (verified via getBoundingClientRect against a live 768px viewport,
// silently clipped by the hero's overflow-hidden rather than scrolling).
const COMPACT_DESTINATIONS: { label: DestinationLabel; x: number; side: "left" | "right" }[] = [
  { label: DESTINATIONS[0].label, x: 155, side: "left" },
  { label: DESTINATIONS[2].label, x: 485, side: "right" },
];

// Same S-curve grammar as PATHS: a cubic Bezier from the QR tile's edge to
// the chip, control points bowed upward (y 100 -> 84 -> 84 -> 100) since
// both stage-local endpoints share one vertical row (unlike the four-path
// stage's top/bottom pairs) — the bow is what keeps the trace reading as a
// curve instead of a straight connector between two same-y points.
const COMPACT_PATHS = [
  "M258 100 C222 84 180 84 155 100",
  "M382 100 C418 84 460 84 485 100",
];

function DestinationChip({
  label,
  active,
  className,
  style,
}: {
  label: DestinationLabel;
  active: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hue = DESTINATION_HUES[label];
  const hueClasses = HUE_CLASSES[hue];
  return (
    <div
      // Board round 5: active border/background tint is inline style
      // (HUE_TINT, srgb color-mix), not Tailwind's border-dest-N/50 /
      // bg-dest-N/10 opacity-modifier classes — those compile through an
      // oklab-space color-mix that iOS Safari mis-renders as invisible
      // (see destination-hues.ts's HUE_TINT doc comment). Merges with any
      // positioning style the caller already passes (chip left/right/top).
      style={{
        ...style,
        ...(active ? { backgroundColor: HUE_TINT[hue].soft, borderColor: HUE_TINT[hue].strong } : {}),
      }}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] whitespace-nowrap transition-colors duration-300",
        active ? "text-foreground shadow-md" : "border-border bg-card/70 text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full transition-colors duration-300",
          active ? hueClasses.dot : "bg-muted-foreground/40",
        )}
      />
      {label}
    </div>
  );
}

export function ScanNetwork() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  // The compact stage shows 2 of the 4 destinations; remapping the shared
  // 0-3 cycle onto 0-1 (rather than running a second interval) keeps one
  // of the two visible chips always active — same "always something
  // flowing" property the <md fallback's `active % 3` remap already
  // relies on, just mod 2 for a two-item stage.
  const compactActive = active % 2;

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % DESTINATIONS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* Full four-chip network stage — xl and up only (P9.5-T1a moved the
          768–1279 range to the compact two-chip stage below). */}
      <div className="hidden xl:block">
        {/* Stage is 1000×300 + ~30px chip overhang each side; scale steps keep
            the full artwork inside the content column at every breakpoint. */}
        <div className="relative mx-auto h-[200px] w-full max-w-[1000px] lg:h-[240px] xl:h-[300px]">
          <div className="absolute left-1/2 top-0 h-[300px] w-[1000px] origin-top -translate-x-1/2 scale-[0.66] lg:scale-[0.8] xl:scale-100">
            <svg
              viewBox="0 0 1000 300"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              {PATHS.map((d, i) => (
                <path
                  key={`base-${i}`}
                  d={d}
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className={cn(
                    "stroke-border transition-opacity duration-300",
                    i === active ? "opacity-100" : "opacity-60",
                  )}
                />
              ))}
              {/* the live trace: an energy packet flowing along the active path,
                  tinted to the active destination's hue (P9.5-T3a) */}
              {!reduced && (
                <path
                  key={`flow-${active}`}
                  d={PATHS[active]}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={cn(
                    "animate-qr-flow",
                    HUE_CLASSES[DESTINATION_HUES[DESTINATIONS[active].label]].stroke,
                  )}
                />
              )}
            </svg>

            {DESTINATIONS.map((dest, i) => (
              <motion.div
                key={dest.label}
                className="absolute"
                // Positioning never rides the animated transform: left chips
                // anchor via `right`, so motion only ever touches opacity.
                style={
                  dest.side === "left"
                    ? { right: 1000 - dest.x, top: dest.y - 15 }
                    : { left: dest.x, top: dest.y - 15 }
                }
                initial={{
                  opacity: 0,
                  transform: reduced ? "translateY(0px)" : "translateY(8px)",
                }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.07, ease: EASE_OUT }}
              >
                <DestinationChip label={dest.label} active={i === active} />
              </motion.div>
            ))}

            <div className="absolute left-1/2 top-1/2 w-[176px] -translate-x-1/2 -translate-y-1/2">
              <motion.div
                initial={{
                  opacity: 0,
                  transform: reduced ? "scale(1)" : "scale(0.96)",
                }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
              >
                <QrTile />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact two-chip network stage — md/lg only (768–1279). Chips are
          positioned as a percentage of this container (derived from the
          640×200 viewBox below) rather than fixed pixels inside a scaled
          box, so the stage resizes fluidly across the range without ever
          transforming — and therefore without ever shrinking — chip text. */}
      <div className="hidden md:block xl:hidden">
        <div className="relative mx-auto aspect-[640/200] w-full max-w-3xl">
          <svg
            viewBox={`0 0 ${COMPACT_VIEW_W} 200`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {COMPACT_PATHS.map((d, i) => (
              <path
                key={`compact-base-${i}`}
                d={d}
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cn(
                  "stroke-border transition-opacity duration-300",
                  i === compactActive ? "opacity-100" : "opacity-60",
                )}
              />
            ))}
            {/* the live trace: an energy packet flowing along the active path,
                tinted to the active destination's hue (P9.5-T3a) */}
            {!reduced && (
              <path
                key={`compact-flow-${compactActive}`}
                d={COMPACT_PATHS[compactActive]}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cn(
                  "animate-qr-flow-compact",
                  HUE_CLASSES[DESTINATION_HUES[COMPACT_DESTINATIONS[compactActive].label]].stroke,
                )}
              />
            )}
          </svg>

          {COMPACT_DESTINATIONS.map((dest, i) => (
            <div
              key={dest.label}
              className="absolute"
              // Positioning is plain (unanimated) CSS, same split as the
              // full stage: left chips anchor via `right` so they grow
              // away from center as their label length varies, keeping
              // the edge nearest the QR tile (and the incoming path) at a
              // fixed point regardless of text length.
              style={
                dest.side === "left"
                  ? {
                      right: `${((COMPACT_VIEW_W - dest.x) / COMPACT_VIEW_W) * 100}%`,
                      top: "calc(50% - 15px)",
                    }
                  : {
                      left: `${(dest.x / COMPACT_VIEW_W) * 100}%`,
                      top: "calc(50% - 15px)",
                    }
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  transform: reduced ? "translateY(0px)" : "translateY(8px)",
                }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.07, ease: EASE_OUT }}
              >
                <DestinationChip label={dest.label} active={i === compactActive} />
              </motion.div>
            </div>
          ))}

          <div className="absolute left-1/2 top-1/2 w-[176px] -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{
                opacity: 0,
                transform: reduced ? "scale(1)" : "scale(0.96)",
              }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
            >
              <QrTile />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Orbit stage — below md (P9.5-T3a, replaces the old chip-pile
          fallback). Own file: it's a self-contained rAF engine, not a
          layout variant of this component's chip-cycling state. */}
      <div className="md:hidden">
        <OrbitStage />
      </div>
    </div>
  );
}
