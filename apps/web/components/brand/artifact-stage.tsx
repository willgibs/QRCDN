import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentational, server-safe staging wrapper for a luminous "artifact" —
 * the Resend-grammar restage of QRCDN's floating product visuals (first
 * consumer: the studio QR preview). Renders a stack of decorative glow
 * layers behind `children`; no client state, no entrance animation (U2
 * frequency rule — this renders on every studio paint, not a rare reveal).
 *
 * Accent policy (founder Q&A, checkpoint A v4): brand chrome stays
 * violet-only (D13 precision lock), but ambient glows may take their hue
 * from the user's own content where it exists — here, the kit's ink color.
 *
 * P4 design-iteration note 5 ("almost feels like my eyes are creating the
 * blur") restructured a single centered bloom into an AUTHORED rig: a tight
 * ink-colored halo reading as light emitting from the object's edge, a wide
 * ink-colored field offset downward so it pools below like cast light
 * instead of sitting as a symmetric vignette, and a thin specular
 * reflection line beneath the card — the strongest "authored" cue. Every
 * layer still only transitions `background-color`/`color` at existing
 * motion tokens; no keyframes, no new easing. See design-system.md's
 * "Luminous staging grammar" for the full recipe and rationale.
 */
export function ArtifactStage({
  /** sRGB hex (or any CSS color) to tint the ink layers. Falls back to the
   *  brand violet primary so the stage still reads as luminous before a
   *  kit's ink color is known. */
  glowColor,
  children,
  className,
}: {
  glowColor?: string;
  children: ReactNode;
  className?: string;
}) {
  const ink = glowColor ?? "var(--primary)";

  return (
    <div className={cn("relative isolate", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* 1. Base violet bloom — always on, brand-locked (never re-hues).
         *  Guarantees the stage reads as luminous even with the
         *  schema-default near-black `#111111` ink. Opacity trimmed slightly
         *  from the original single-bloom version now that two ink-tinted
         *  layers sit on top of it. */}
        <div className="absolute top-1/2 left-1/2 h-[130%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.08] blur-3xl dark:opacity-[0.13]" />
        {/* 2. Outer field — the wide ink-tinted bloom, OFFSET DOWNWARD
         *  (center ~57% vertical, not 50%) so it pools below the artifact
         *  like cast light instead of a symmetric halo. Solid color under
         *  blur, not a radial-gradient — see the design-guide's
         *  "solid-under-blur technique" for why that's what lets this re-hue
         *  smoothly as the transition below fires. */}
        <div
          className="absolute top-[57%] left-1/2 h-[110%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.20] blur-3xl transition-[background-color] duration-(--duration-slow) ease-(--motion-ease-out) dark:opacity-[0.28]"
          style={{ backgroundColor: ink }}
        />
        {/* 3. Inner halo — NEW, tighter (just beyond the card) and less
         *  blurred (blur-xl, not 3xl) than the outer field, at higher
         *  opacity: reads as light emitting directly from the object's
         *  edge rather than ambient room fill. Stays centered (not offset)
         *  — this is the "glow hugging the object" layer. */}
        <div
          className="absolute top-1/2 left-1/2 h-[108%] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-xl transition-[background-color] duration-(--duration-slow) ease-(--motion-ease-out) dark:opacity-[0.30]"
          style={{ backgroundColor: ink }}
        />
        {/* 4. Floor-shadow ellipse — anchors the artifact to the stage floor
         *  instead of letting it float with no grounding. */}
        <div className="absolute inset-x-8 -bottom-5 h-8 rounded-[50%] bg-black/20 blur-2xl dark:bg-black/55" />
        {/* 5. Reflection streak — NEW, the strongest authored cue: a thin
         *  specular highlight ~1.5rem below the card, as if light were
         *  catching the stage floor's surface. `via-current` reads the
         *  `color` set below, which is what lets this re-hue smoothly under
         *  the same `color` transition (the gradient recomputes live from
         *  the interpolated `currentColor`, same principle as the
         *  solid-under-blur trick above, applied to `color` instead of
         *  `background-color`). */}
        <div
          className="absolute inset-x-0 -bottom-6 mx-auto h-px w-3/5 bg-gradient-to-r from-transparent via-current to-transparent opacity-[0.25] blur-[1px] transition-[color] duration-(--duration-slow) ease-(--motion-ease-out) dark:opacity-[0.40]"
          style={{ color: ink }}
        />
      </div>
      {children}
    </div>
  );
}
