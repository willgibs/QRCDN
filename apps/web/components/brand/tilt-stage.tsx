"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clamp, normalizeStagePointer, tiltDegrees } from "@/lib/tilt-math";

/**
 * Interactive 3D staging wrapper for the studio QR preview (founder round-3
 * note 2) — replaces `ArtifactStage`'s glow-bloom rig on that one surface.
 * `ArtifactStage` itself is untouched: it stays the staging primitive for
 * the P9 marketing artifact treatment. See docs/guides/design-system.md's
 * "Luminous staging grammar" section for the studio-vs-marketing split and
 * the full recipe writeup this component implements.
 *
 * Mechanics: pointermove on this component's own root (the "stage" — as
 * opposed to attaching the listener to the rotating card itself, which
 * would make hit-testing follow the card's own tilted plane) drives two raw
 * motion values, normalized -1..1 from the root's own center
 * (`lib/tilt-math.ts`'s `normalizeStagePointer`, unit-tested there). Those
 * feed `useSpring`s (stiffness 150 / damping 20 — gentle, slightly
 * underdamped so a fast reversal has a touch of life to it rather than
 * snapping dead-stop) that drive everything else: the card's rotation
 * (clamped to ±`maxTilt` via `tiltDegrees`, also unit-tested), a specular
 * sheen sweeping the same direction as the tilt, and a floor shadow
 * shifting opposite the tilt so the card still reads as grounded. Every
 * moving layer is a single combined `transform` string (project
 * convention — design-system.md's "Motion & the taste toolchain": "always
 * animate full transform strings, never x/y/scale shorthands", since
 * motion/react's shorthand style keys are composed into one `transform`
 * declaration per element regardless, and writing that composition
 * ourselves keeps every layer here to exactly one motion-value-driven
 * style property). Every value update is a `MotionValue` set — motion/react
 * never re-renders this component on pointer move, and every animated
 * property is `transform`/`opacity` (GPU-composited, no layout/paint cost).
 *
 * Reduced motion: no tilt, no sheen — a flat card over a static, non-tinted
 * -shift shadow. Touch/coarse pointers get the same interactive path (no
 * separate gating): pointermove only fires meaningfully during an active
 * touch-drag, this handler never calls `preventDefault`/captures the
 * pointer, so page scroll is never blocked — worst case a light touch-drag
 * nudges the tilt briefly before `pointerup`/`pointercancel` (both wired,
 * alongside `pointerleave`) settle the springs back to rest.
 */

const SPRING = { stiffness: 150, damping: 20 };
/** Camera distance. Founder round 5: 1100px produced almost no
 *  foreshortening at ±12°, and foreshortening (near edge grows, far edge
 *  shrinks) is THE cue that separates "3D object" from "skewed rectangle" —
 *  especially on white paper where surface shading is subtle. 750px makes
 *  the trapezoid read clearly without fisheye distortion. */
const PERSPECTIVE_PX = 750;
/** How far the sheen highlight travels (px) at full tilt. */
const SHEEN_TRAVEL_PX = 70;
/** How far the floor shadow shifts (px) at full tilt — smaller than the
 *  sheen's travel since it's a subtle grounding cue, not the focal effect.
 *  (Raised from 10 in founder round 4: a livelier shadow sells the lift.) */
const SHADOW_TRAVEL_PX = 18;
/** The sheen/floor-shadow overlay radius — hardcoded to match the studio
 *  mat card's own `rounded-2xl` (its only current consumer). A second
 *  consumer with a different card radius would need this promoted to a
 *  prop; not done here to avoid speculative API surface. */
const OVERLAY_ROUNDING = "rounded-2xl";

/** [x, y] from the two source springs, always read together — every layer
 *  below combines both axes into one `transform` string in a single
 *  `useTransform` call rather than setting two separate motion values on
 *  two separate style keys. */
type Axes = number[];

function useTiltMotionValues(maxTilt: number) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, SPRING);
  const springY = useSpring(pointerY, SPRING);
  const springs = [springX, springY];

  // Sign conventions verified empirically against the raw CSS rotation
  // matrices (not just reasoned about) — see the tilt-stage design-guide
  // note for the readback method. rotateY(+) recedes the RIGHT edge (moves
  // it away from the viewer) and advances the left; rotateX(+) advances the
  // BOTTOM edge and recedes the top. For the card to "face" the cursor —
  // the near-cursor edge lifting toward the viewer, like a portrait's gaze
  // tracking it — rotateY inverts the pointer's x (cursor right must
  // *advance* the right edge, i.e. negative rotateY) while rotateX tracks
  // the pointer's y directly (cursor below must advance the bottom edge,
  // i.e. positive rotateX). Same convention vanilla-tilt.js and most
  // pointer-tilt implementations use.
  const cardTransform = useTransform(springs, (values: Axes) => {
    const [x, y] = values;
    const rotateX = tiltDegrees(y ?? 0, maxTilt);
    const rotateY = -tiltDegrees(x ?? 0, maxTilt);
    return `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  // Sheen sweeps WITH the pointer (the "light" reads fixed while the
  // surface turns under it); the shade layer sweeps OPPOSITE it (the side
  // rotating away from the light darkens); the floor shadow also shifts
  // opposite (grounding cue — the object leans one way, its shadow the
  // other). Sheen + shade together form a complete two-sided lighting
  // model that self-adapts to any paper color with zero luminance
  // detection (founder round 4): a white highlight is invisible on white
  // paper but reads on dark mats, a black shade is invisible on dark
  // paper but reads on light mats — each surface picks up whichever cue
  // physically works on it.
  const sheenTransform = useTransform(springs, (values: Axes) => {
    const x = clamp(values[0] ?? 0, -1, 1);
    const y = clamp(values[1] ?? 0, -1, 1);
    return `translate(${x * SHEEN_TRAVEL_PX}px, ${y * SHEEN_TRAVEL_PX}px)`;
  });
  // Planar shading (founder round 5, replacing round 4's moving radial
  // shade which read as "unnoticeable" on white): a tilted PLANE shades as
  // a linear ramp — the receding edge darkens progressively across the
  // surface — not as a drifting blob. Four static linear-gradient overlays
  // (one per edge) whose OPACITY tracks how far that edge is receding.
  // Sign map (from the rotation conventions above): cursor right → left
  // edge recedes; cursor down → top edge recedes. Corners compose
  // naturally: a diagonal tilt lights two ramps at once, darkest in the
  // receding corner — exactly what a real plane does.
  const shadeLeftOpacity = useTransform(springs, (values: Axes) =>
    clamp(Math.max(0, values[0] ?? 0), 0, 1),
  );
  const shadeRightOpacity = useTransform(springs, (values: Axes) =>
    clamp(Math.max(0, -(values[0] ?? 0)), 0, 1),
  );
  const shadeTopOpacity = useTransform(springs, (values: Axes) =>
    clamp(Math.max(0, values[1] ?? 0), 0, 1),
  );
  const shadeBottomOpacity = useTransform(springs, (values: Axes) =>
    clamp(Math.max(0, -(values[1] ?? 0)), 0, 1),
  );
  const shadowTransform = useTransform(springs, (values: Axes) => {
    const x = clamp(values[0] ?? 0, -1, 1);
    const y = clamp(values[1] ?? 0, -1, 1);
    return `translate(${x * -SHADOW_TRAVEL_PX}px, ${y * -SHADOW_TRAVEL_PX * 0.6}px)`;
  });
  // Sheen opacity rides the tilt magnitude (0 at rest, up to 1 at full
  // tilt) — the highlight fades in as the "light" catches the turning
  // surface and fades back out as the springs settle on pointer leave. The
  // actual max opacity is a static Tailwind ceiling on the wrapping div
  // (opacity-[0.08] dark:opacity-[0.13], matching ArtifactStage's own base
  // -bloom numbers) so this motion value only ever needs to express 0..1.
  const sheenOpacity = useTransform(springs, (values: Axes) =>
    clamp(Math.hypot(values[0] ?? 0, values[1] ?? 0), 0, 1),
  );

  return {
    pointerX,
    pointerY,
    cardTransform,
    sheenTransform,
    sheenOpacity,
    shadowTransform,
    shadeLeftOpacity,
    shadeRightOpacity,
    shadeTopOpacity,
    shadeBottomOpacity,
  };
}

/** Per-edge planar shade ramp recipes — static gradients whose opacity is
 *  motion-driven. Alpha ceiling lives in the gradient color itself (0.16)
 *  so the motion value stays a clean 0..1 "how much is this edge receding".
 *  Ramps span 55% of the card so the advancing half stays clean. */
const SHADE_RAMPS = {
  left: "linear-gradient(to right, rgba(0,0,0,0.16), transparent 55%)",
  right: "linear-gradient(to left, rgba(0,0,0,0.16), transparent 55%)",
  top: "linear-gradient(to bottom, rgba(0,0,0,0.16), transparent 55%)",
  bottom: "linear-gradient(to top, rgba(0,0,0,0.16), transparent 55%)",
} as const;

export function TiltStage({
  children,
  className,
  cardClassName,
  maxTilt = 12,
  glowColor,
}: {
  children: ReactNode;
  /** Sizing/placement for the ROOT — which is also the pointer-tracking
   *  surface. Give it the full stage area (founder round-3: the card faces
   *  the cursor "when the cursor is in the stage", not merely over the
   *  card), and center the card within via flex. */
  className?: string;
  /** Sizing for the inner card anchor (shadow + rotating card live here) —
   *  e.g. `w-full max-w-[320px]`. Decoupled from the root so the tracking
   *  region can be much larger than the card itself. */
  cardClassName?: string;
  /** Maximum rotation on each axis, in degrees. */
  maxTilt?: number;
  /** sRGB hex (or any CSS color) to tint the floor shadow. Falls back to
   *  the brand violet primary so the stage still reads as grounded before a
   *  kit's ink color is known — same fallback contract as ArtifactStage's
   *  `glowColor`. */
  glowColor?: string;
}) {
  const reducedMotion = useReducedMotion();
  const tint = glowColor ?? "var(--primary)";
  const {
    pointerX,
    pointerY,
    cardTransform,
    sheenTransform,
    sheenOpacity,
    shadowTransform,
    shadeLeftOpacity,
    shadeRightOpacity,
    shadeTopOpacity,
    shadeBottomOpacity,
  } = useTiltMotionValues(maxTilt);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = normalizeStagePointer(event.clientX, event.clientY, rect);
      pointerX.set(x);
      pointerY.set(y);
    },
    [pointerX, pointerY],
  );

  const handlePointerRest = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  const floorShadowStyle = {
    backgroundColor: `color-mix(in srgb, ${tint} 30%, black)`,
  };

  if (reducedMotion) {
    return (
      <div className={cn("relative isolate", className)}>
        <div className={cn("relative", cardClassName)}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 -bottom-5 -z-10 h-8 rounded-[50%] opacity-35 blur-2xl"
            style={floorShadowStyle}
          />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative isolate", className)}
      style={{ perspective: PERSPECTIVE_PX }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerRest}
      onPointerUp={handlePointerRest}
      onPointerCancel={handlePointerRest}
    >
      <div className={cn("relative", cardClassName)}>
        {/* Floor shadow — anchors the card to the stage floor, tinted from
         *  the kit's own ink color like ArtifactStage's glow layers, and
         *  shifted opposite the tilt so the card reads as a real object
         *  catching light rather than a flat decal. Anchored to the card
         *  wrapper, not the (much larger) tracking root. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -bottom-5 -z-10 h-8 rounded-[50%] opacity-35 blur-2xl"
          style={{ ...floorShadowStyle, transform: shadowTransform }}
        />
        <motion.div
          style={{ transformStyle: "preserve-3d", transform: cardTransform }}
          className="relative"
        >
          {children}
          {/* Specular sheen — a moving highlight inside the card bounds, not
           *  a light source that moves independently: it sweeps WITH the
           *  tilt direction so the "light" reads fixed while the card turns
           *  under it, the way a glossy surface catches a room light as it
           *  rotates. Reads on dark papers; invisible on white ones. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden opacity-[0.11] dark:opacity-[0.16]",
              OVERLAY_ROUNDING,
            )}
          >
            <motion.div
              className="absolute -inset-1/4 rounded-full"
              style={{
                background: "radial-gradient(closest-side, white, transparent)",
                transform: sheenTransform,
                opacity: sheenOpacity,
              }}
            />
          </div>
          {/* Planar shading — four per-edge linear ramps, each fading in as
           *  its edge recedes. This (with real foreshortening from the
           *  closer camera) is what makes white paper read as a turning 3D
           *  surface instead of a skewed rectangle (founder round 5); on
           *  dark papers the ramps are invisible and the sheen carries the
           *  effect. Opacity-only animation on static gradients. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden",
              OVERLAY_ROUNDING,
            )}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: SHADE_RAMPS.left, opacity: shadeLeftOpacity }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ background: SHADE_RAMPS.right, opacity: shadeRightOpacity }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ background: SHADE_RAMPS.top, opacity: shadeTopOpacity }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ background: SHADE_RAMPS.bottom, opacity: shadeBottomOpacity }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
