"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/brand/magic";
import { cn } from "@/lib/utils";
import { DESTINATION_HUES, HUE_CLASSES, HUE_TINT, type DestinationLabel } from "./destination-hues";
import { QrTile } from "./qr-tile";

/**
 * The RetargetTheatre (P9.5-T3b, new client island) — section 04's reply to
 * the board's "very bland, no real magic" note. Same visual grammar as the
 * hero's `ScanNetwork`/`OrbitStage` (a printed `QrTile`, destination chips
 * in their shared per-destination hues, a traveling packet), but where the
 * hero stages auto-advance, this is entirely visitor-driven: tap a
 * destination and watch the retarget happen. "Hero watches, theatre
 * drives" (board round 3) — this is the one place on the page that lets a
 * visitor actually pull the lever.
 *
 * QrTile itself never animates ("sacred-still": the printed object doesn't
 * change shape or move, only what it points to changes) — only the packet
 * traveling to a chip and the destination readout beneath do.
 *
 * Three of the four shared demo destinations (destination-hues.ts) — the
 * same subset OrbitStage uses, for the same reason: a compact stage reads
 * cleaner with three targets than four, and reusing the identical trio
 * keeps a destination's hue/label pairing consistent everywhere on the page.
 */

type StageIndex = 0 | 1 | 2;

interface TheatreDestination {
  label: DestinationLabel;
  /** Vertical lane (SVG viewBox units) this destination's chip/wire sits on. */
  laneY: number;
}

const THEATRE_DESTINATIONS: readonly TheatreDestination[] = [
  { label: "yourcafe.com/menu", laneY: 36 },
  { label: "tickets.io/tour-2026", laneY: 100 },
  { label: "instagram.com/drop", laneY: 164 },
];

const VIEW_W = 360;
const VIEW_H = 200;
// QR tile sits well clear of the chip column on purpose — chip buttons are
// width-capped and allowed to wrap (see the className below) rather than
// relying on a fixed percentage of a viewBox that could overflow a narrow
// mobile container; the geometry here just has to leave the chip column
// enough ROOM that it rarely needs to.
const QR_EDGE = { x: 118, y: 100 };
const CHIP_X = 160;
// Control-point column (matches scan-network.tsx's own S-curve grammar: a
// cubic bezier whose two control points share one x, first riding the
// start row then the end row) — kept as a named constant so the packet's
// keyframes below are visibly derived from the same curve the wire draws,
// not eyeballed separately.
const CONTROL_X = 140;

function wirePath(laneY: number): string {
  if (laneY === QR_EDGE.y) {
    return `M${QR_EDGE.x} ${QR_EDGE.y} L${CHIP_X} ${laneY}`;
  }
  return `M${QR_EDGE.x} ${QR_EDGE.y} C${CONTROL_X} ${QR_EDGE.y} ${CONTROL_X} ${laneY} ${CHIP_X} ${laneY}`;
}

/** Packet keyframes: the exact point at t=0/0.5/1 of the cubic bezier
 *  `wirePath` draws (P0=start, P1=P2=(CONTROL_X, *), P3=end), so the packet
 *  visibly rides the same wire rather than a separately-eyeballed path. */
function packetKeyframes(laneY: number): { cx: number[]; cy: number[] } {
  const midY = (QR_EDGE.y + 3 * QR_EDGE.y + 3 * laneY + laneY) / 8;
  return {
    cx: [QR_EDGE.x, CONTROL_X, CHIP_X],
    cy: [QR_EDGE.y, midY, laneY],
  };
}

const TRAVEL_S = 0.7;

function receiptLine(label: string): string {
  return `302 · no-store · ${label}`;
}

export function RetargetTheatre() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<StageIndex | null>(null);
  const [traveling, setTraveling] = useState<StageIndex | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  function handleTap(index: StageIndex) {
    // Ignore re-taps of the already-docked destination and taps that land
    // mid-flight — the packet finishes its current trip before a new one
    // can start, so there's never a mid-air redirect to reason about.
    if (index === active || traveling !== null) return;
    setHasInteracted(true);
    if (reduced) {
      setActive(index);
      return;
    }
    setTraveling(index);
  }

  const travelingDest = traveling !== null ? THEATRE_DESTINATIONS[traveling] : null;
  const activeDest = active !== null ? THEATRE_DESTINATIONS[active] : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative mx-auto w-full max-w-md">
        <div className="relative aspect-[360/200] w-full">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label="A printed QR code with three destinations; tap one to retarget it"
          >
            {THEATRE_DESTINATIONS.map((dest, i) => {
              const isActive = active === i;
              const hueClasses = HUE_CLASSES[DESTINATION_HUES[dest.label]];
              return (
                <path
                  key={dest.label}
                  d={wirePath(dest.laneY)}
                  fill="none"
                  strokeWidth={isActive ? 2 : 1.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    "transition-[stroke,opacity] duration-(--duration-normal) ease-(--motion-ease-out)",
                    isActive ? cn(hueClasses.stroke, "opacity-100") : "stroke-border opacity-60",
                  )}
                />
              );
            })}

            {!reduced && travelingDest && (
              <motion.circle
                key={traveling}
                r={4}
                className={HUE_CLASSES[DESTINATION_HUES[travelingDest.label]].fill}
                initial={{ cx: QR_EDGE.x, cy: QR_EDGE.y, opacity: 1 }}
                animate={packetKeyframes(travelingDest.laneY)}
                transition={{ duration: TRAVEL_S, ease: EASE_OUT }}
                onAnimationComplete={() => {
                  setActive(traveling);
                  setTraveling(null);
                }}
              />
            )}
          </svg>

          <div
            className="absolute"
            style={{
              left: `${((QR_EDGE.x - 103) / VIEW_W) * 100}%`,
              top: `${((QR_EDGE.y - 50) / VIEW_H) * 100}%`,
              width: `${(100 / VIEW_W) * 100}%`,
            }}
          >
            <QrTile />
          </div>

          {THEATRE_DESTINATIONS.map((dest, i) => {
            const index = i as StageIndex;
            const isActive = active === index;
            const hueClasses = HUE_CLASSES[DESTINATION_HUES[dest.label]];
            return (
              <button
                key={dest.label}
                type="button"
                onClick={() => handleTap(index)}
                aria-pressed={isActive}
                aria-label={`Retarget the code to ${dest.label}`}
                className={cn(
                  // Width-capped + wrap-allowed rather than whitespace-nowrap:
                  // the longest label ("tickets.io/tour-2026") comfortably
                  // fits unwrapped at every real breakpoint given the
                  // geometry above, but capping + wrapping is the safety net
                  // that guarantees no horizontal overflow even if a future
                  // edit narrows the stage further (verified live at 375px).
                  "absolute flex max-w-[10rem] -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-left font-mono text-[11px] leading-snug break-words transition-colors duration-(--duration-normal) ease-(--motion-ease-out) focus-visible:outline-2 focus-visible:outline-offset-2",
                  isActive
                    ? "text-foreground shadow-md"
                    : "border-border bg-card/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
                style={{
                  left: `${((CHIP_X + 6) / VIEW_W) * 100}%`,
                  top: `${(dest.laneY / VIEW_H) * 100}%`,
                  // Board round 5 hardening: inline srgb color-mix
                  // (HUE_TINT), not Tailwind's border-dest-N/50 / bg-dest-N/10
                  // opacity classes — see destination-hues.ts's HUE_TINT doc
                  // comment (iOS Safari mis-renders their oklab-space mix).
                  ...(isActive
                    ? {
                        backgroundColor: HUE_TINT[DESTINATION_HUES[dest.label]].soft,
                        borderColor: HUE_TINT[DESTINATION_HUES[dest.label]].strong,
                      }
                    : {}),
                }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-1.5 shrink-0 rounded-full",
                    isActive ? hueClasses.dot : "bg-muted-foreground/40",
                  )}
                />
                {dest.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        {!hasInteracted ? (
          <div className="flex h-9 w-full max-w-[16rem] items-center justify-center rounded-full border border-dashed border-border/60 font-mono text-[11px] text-muted-foreground">
            tap a destination
          </div>
        ) : activeDest ? (
          <>
            <div
              className="flex h-9 w-full max-w-[16rem] items-center justify-center gap-2 rounded-full border px-4 font-mono text-[11px] text-foreground"
              style={{
                backgroundColor: HUE_TINT[DESTINATION_HUES[activeDest.label]].soft,
                borderColor: HUE_TINT[DESTINATION_HUES[activeDest.label]].strong,
              }}
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", HUE_CLASSES[DESTINATION_HUES[activeDest.label]].dot)}
              />
              {activeDest.label}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{receiptLine(activeDest.label)}</p>
          </>
        ) : null}
      </div>

      <p className="font-mono text-xs text-muted-foreground">the printed code never changes</p>
    </div>
  );
}
