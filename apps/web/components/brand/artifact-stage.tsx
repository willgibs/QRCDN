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
 */
export function ArtifactStage({
  /** sRGB hex (or any CSS color) to tint the ink bloom. Falls back to the
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
  return (
    <div className={cn("relative isolate", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Base violet bloom — always on. Guarantees the stage reads as
         *  luminous even with the schema-default near-black `#111111` ink,
         *  which would otherwise tint the layer below to near-invisibility. */}
        <div className="absolute top-1/2 left-1/2 h-[130%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.10] blur-3xl dark:opacity-[0.16]" />
        {/* Ink-tinted bloom — a solid color under blur-3xl, not a
         *  radial-gradient: only `background-color` interpolates smoothly
         *  across a transition, so this re-hues live as the user edits
         *  their kit's ink color ("your brand, everywhere"). */}
        <div
          className="absolute top-1/2 left-1/2 h-[110%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.20] blur-3xl transition-[background-color] duration-(--duration-slow) ease-(--motion-ease-out) dark:opacity-[0.28]"
          style={{ backgroundColor: glowColor ?? "var(--primary)" }}
        />
        {/* Floor-shadow ellipse — anchors the artifact to the stage floor
         *  instead of letting it float with no grounding. */}
        <div className="absolute inset-x-8 -bottom-5 h-8 rounded-[50%] bg-black/20 blur-2xl dark:bg-black/55" />
      </div>
      {children}
    </div>
  );
}
