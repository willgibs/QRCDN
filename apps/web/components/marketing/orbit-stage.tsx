"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/brand/magic";
import { cn } from "@/lib/utils";
import { DESTINATION_HUES, HUE_CLASSES, HUE_GLOW, HUE_TINT, HUE_VAR, type DestinationHue } from "./destination-hues";
import { QrTile } from "./qr-tile";

/**
 * The <md hero artwork (P9.5-T3a): a single module-square packet orbits a
 * ring around the printed QR code, lighting one destination at a time.
 * Ported from the board-approved A1-R2 reference artifact
 * (docs handoff: artifact-a1r-orbit-dial.html) from vanilla DOM
 * manipulation to React refs + rAF — the geometry, easing, and trail math
 * below are the same formulas, not a reinterpretation.
 *
 * Layered HTML+SVG, not foreignObject: the reference used a foreignObject
 * to place its QR tile inside the SVG, which clips the tile's own CSS box-
 * shadow (foreignObject content is clipped to its own box in Chromium).
 * Production instead renders the SVG ring/nodes/chips/packet as one layer
 * and `QrTile` as a separate, absolutely positioned HTML element on top —
 * the same two-layer pattern ScanNetwork's xl/compact stages already use.
 *
 * The packet and its trail are mutated directly via refs inside the rAF
 * loop, bypassing React state entirely for those two elements (a 900ms,
 * 60fps position animation re-rendering through React on every frame would
 * jank) — chips/nodes/counts are ordinary React state instead, since they
 * only change once per dwell (~1-2× a second at most), cheap to re-render
 * declaratively and easiest to keep in sync with Tailwind's hue-class
 * lookup (destination-hues.ts) the same way ScanNetwork does.
 */

const CENTER = { x: 179, y: 200 };
const RADIUS = 150;
const TRAVEL_MS = 900;
const TRAIL_DEG = 26;
// Board: first motion must land before a visitor scrolls past, so the
// FIRST dwell (before the first hop) is much shorter than every dwell
// after it.
const FIRST_DWELL_MS = 1400;
const DWELL_MS = 2200;
const TICK_FLASH_MS = 480;

type OrbitIndex = 0 | 1 | 2;

interface OrbitDestination {
  label: string;
  hue: DestinationHue;
  /** Degrees; 0 = east/+x, increasing clockwise (SVG y-axis points down). */
  theta: number;
  /** Node <rect> top-left (9px square, so center = node + 4.5). */
  node: { x: number; y: number };
  pill: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number };
  count: { x: number; y: number; anchor: "start" | "middle" };
  initialCount: number;
}

// Same three destinations + geometry as the reference's DESTS array —
// N (top, menu/dest-1), SW (bottom-left, tickets/dest-2), SE (bottom-right,
// instagram/dest-3). g.page/dest-4 sits out: the ring only has three nodes.
const ORBIT_DESTINATIONS: readonly OrbitDestination[] = [
  {
    label: "yourcafe.com/menu",
    hue: DESTINATION_HUES["yourcafe.com/menu"],
    theta: -90,
    node: { x: 174.5, y: 45.5 },
    pill: { x: 111, y: 12, width: 136, height: 26 },
    text: { x: 179, y: 29 },
    count: { x: 255, y: 29, anchor: "start" },
    initialCount: 1208,
  },
  {
    label: "tickets.io/tour-2026",
    hue: DESTINATION_HUES["tickets.io/tour-2026"],
    theta: 150,
    node: { x: 44.6, y: 270.5 },
    pill: { x: 4, y: 289, width: 156, height: 26 },
    text: { x: 82, y: 306 },
    count: { x: 82, y: 331, anchor: "middle" },
    initialCount: 214,
  },
  {
    label: "instagram.com/drop",
    hue: DESTINATION_HUES["instagram.com/drop"],
    theta: 30,
    node: { x: 304.4, y: 270.5 },
    pill: { x: 211, y: 289, width: 143, height: 26 },
    text: { x: 282.5, y: 306 },
    count: { x: 282.5, y: 331, anchor: "middle" },
    initialCount: 342,
  },
];

// Traversal order around the ring, clockwise by angle (N@-90 -> SE@30 ->
// SW@150 -> back to N): NOT [0,1,2] — walking the array's own order would
// jump N->SW the "wrong way" round (240 degrees instead of 120). Ported
// verbatim from the reference's SEQ constant.
const SEQUENCE: readonly OrbitIndex[] = [0, 2, 1];

function point(deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  return { x: CENTER.x + RADIUS * Math.cos(r), y: CENTER.y + RADIUS * Math.sin(r) };
}

function arcPath(a1: number, a2: number): string {
  const p1 = point(a1);
  const p2 = point(a2);
  return `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A${RADIUS} ${RADIUS} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

/** Standard easeInOutCubic. */
function easeInOutCubic(e: number): number {
  return e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
}

export function OrbitStage() {
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<OrbitIndex | null>(0);
  const [counts, setCounts] = useState<[number, number, number]>(() => [
    ORBIT_DESTINATIONS[0].initialCount,
    ORBIT_DESTINATIONS[1].initialCount,
    ORBIT_DESTINATIONS[2].initialCount,
  ]);
  const [tickFlash, setTickFlash] = useState<OrbitIndex | null>(null);

  const packetRef = useRef<SVGRectElement>(null);
  const trailRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Reduced motion: parked on menu (the initial state above), lit,
    // counts static — no timers ever start.
    if (reduced) return;

    let seqIndex = 0;
    let thetaBase = ORBIT_DESTINATIONS[SEQUENCE[0]].theta;
    let hopTimer: ReturnType<typeof setTimeout> | undefined;
    let tickTimer: ReturnType<typeof setTimeout> | undefined;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    let rafId: number | undefined;
    let cancelled = false;

    function scheduleTick(dwellMs: number, forIndex: OrbitIndex) {
      // Same ~50% ratio as the reference (tick at 1600 of a flat 3200
      // dwell) applied to each of the two dwell lengths here.
      tickTimer = setTimeout(() => {
        if (cancelled) return;
        setCounts((c) => {
          const next: [number, number, number] = [...c];
          next[forIndex] += 1;
          return next;
        });
        setTickFlash(forIndex);
        flashTimer = setTimeout(() => {
          if (!cancelled) setTickFlash(null);
        }, TICK_FLASH_MS);
      }, dwellMs / 2);
    }

    function hop() {
      setActiveIndex(null); // no chip lit while traveling
      seqIndex = (seqIndex + 1) % SEQUENCE.length;
      const nextIndex = SEQUENCE[seqIndex];
      const dest = ORBIT_DESTINATIONS[nextIndex];
      const from = thetaBase;
      const to = thetaBase + 120;
      const hue = HUE_VAR[dest.hue];

      const packet = packetRef.current;
      const trail = trailRef.current;
      if (packet) {
        packet.setAttribute("fill", hue);
        packet.style.opacity = "1";
      }
      if (trail) {
        // Inline style, not the SVG attribute: trail starts from a
        // `opacity-0` Tailwind class (a CSS declaration), which would
        // permanently win over `.setAttribute('opacity', ...)` in the
        // cascade. Setting `.style.opacity` here is the fix, not a style
        // choice — see the file header and design-system.md's amendment.
        trail.style.stroke = hue;
        trail.style.opacity = "0.5";
      }

      const t0 = performance.now();
      function step(now: number) {
        const e = Math.min(1, (now - t0) / TRAVEL_MS);
        const k = easeInOutCubic(e);
        const theta = from + 120 * k;
        const p = point(theta);
        if (packet) {
          packet.setAttribute("x", (p.x - 3.5).toFixed(1));
          packet.setAttribute("y", (p.y - 3.5).toFixed(1));
        }
        // Trailing arc: grows to TRAIL_DEG over the first 12% of travel,
        // holds, then shrinks back to 0 over the last 20% — the "fades on
        // arrival" read, via arc length rather than opacity.
        const span = TRAIL_DEG * Math.min(k / 0.12, 1) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        if (trail) trail.setAttribute("d", span > 0.5 ? arcPath(theta - span, theta) : "");

        if (e < 1) {
          rafId = requestAnimationFrame(step);
          return;
        }

        thetaBase = to;
        if (packet) packet.style.opacity = "0";
        if (trail) {
          trail.style.opacity = "0";
          trail.setAttribute("d", "");
        }
        setActiveIndex(nextIndex);
        scheduleTick(DWELL_MS, nextIndex);
        hopTimer = setTimeout(hop, DWELL_MS);
      }
      rafId = requestAnimationFrame(step);
    }

    scheduleTick(FIRST_DWELL_MS, 0);
    hopTimer = setTimeout(hop, FIRST_DWELL_MS);

    return () => {
      cancelled = true;
      clearTimeout(hopTimer);
      clearTimeout(tickTimer);
      clearTimeout(flashTimer);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[358px]"
      initial={{ opacity: 0, transform: reduced ? "scale(1)" : "scale(0.96)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
    >
      <div className="relative aspect-[358/392] w-full">
        <svg
          viewBox="0 0 358 392"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="A printed QR code at the center of an orbit; one destination is lit at a time, and a module packet rides the ring when the code is retargeted"
        >
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} fill="none" className="stroke-border" strokeWidth={1} opacity={0.85} />

          <path ref={trailRef} d="" fill="none" strokeWidth={2} strokeLinecap="round" className="opacity-0" />
          <rect
            ref={packetRef}
            width={7}
            height={7}
            rx={1.5}
            x={175.5}
            y={46.5}
            fill={HUE_VAR[ORBIT_DESTINATIONS[0].hue]}
            className="opacity-0"
          />

          {ORBIT_DESTINATIONS.map((dest, i) => {
            const active = activeIndex === i;
            const hueClasses = HUE_CLASSES[dest.hue];
            return (
              <rect
                key={dest.label}
                x={dest.node.x}
                y={dest.node.y}
                width={9}
                height={9}
                rx={2}
                strokeWidth={1.25}
                className={cn(
                  "transition-colors duration-(--duration-normal) ease-(--motion-ease-out)",
                  active ? cn(hueClasses.fill, hueClasses.stroke) : "fill-background stroke-border",
                )}
              />
            );
          })}

          {ORBIT_DESTINATIONS.map((dest, i) => {
            const active = activeIndex === i;
            const hueClasses = HUE_CLASSES[dest.hue];
            const flashing = tickFlash === i;
            return (
              <g
                key={dest.label}
                style={active ? { filter: HUE_GLOW[dest.hue] } : undefined}
              >
                <rect
                  x={dest.pill.x}
                  y={dest.pill.y}
                  width={dest.pill.width}
                  height={dest.pill.height}
                  rx={13}
                  strokeWidth={1}
                  // Board round 5: active fill/stroke are inline style, not
                  // Tailwind bg-*/border-* classes — those set background-
                  // color/border-color, which have NO effect on an SVG
                  // rect's paint (fill/stroke are the only properties that
                  // do), and separately compiled through a color-mix space
                  // iOS Safari mis-renders. HUE_TINT is srgb-space and
                  // targets the correct SVG properties directly. See
                  // destination-hues.ts's HUE_TINT doc comment for both.
                  className="fill-card stroke-border transition-colors duration-(--duration-normal) ease-(--motion-ease-out)"
                  style={
                    active
                      ? { fill: HUE_TINT[dest.hue].soft, stroke: HUE_TINT[dest.hue].strong }
                      : undefined
                  }
                />
                <text
                  x={dest.text.x}
                  y={dest.text.y}
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[11px] transition-colors duration-(--duration-normal) ease-(--motion-ease-out)",
                    active ? "fill-foreground" : "fill-muted-foreground",
                  )}
                >
                  {dest.label}
                </text>
                <text
                  x={dest.count.x}
                  y={dest.count.y}
                  textAnchor={dest.count.anchor}
                  className={cn(
                    "font-mono text-[8.5px] tracking-wide transition-[opacity,fill] duration-(--duration-normal) ease-(--motion-ease-out)",
                    active ? "opacity-[0.85]" : "opacity-0",
                    flashing ? hueClasses.fill : "fill-muted-foreground",
                  )}
                >
                  {counts[i].toLocaleString("en-US")} scans
                </text>
              </g>
            );
          })}
        </svg>

        <div
          className="absolute"
          style={{ left: "30.447%", top: "30.612%", width: "39.106%" }}
        >
          <QrTile />
        </div>
      </div>
    </motion.div>
  );
}
