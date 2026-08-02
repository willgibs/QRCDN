"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared motion language, per the emil-design-eng skill: entrances use the
 * strong ease-out curve, full `transform` strings (hardware-accelerated —
 * motion's x/y shorthands run on the main thread), reduced-motion collapses
 * movement to opacity-only. Marketing entrances may exceed the 300ms UI
 * budget; in-app UI must not.
 *
 * `ModuleMark`/`Eyebrow` (P9.7-U1): moved to the directive-free
 * `./marks.tsx` and re-exported here — neither used a hook, they only lived
 * in this "use client" file because `Reveal` did. Every existing
 * `@/components/brand/magic` import of either name keeps working unchanged.
 */
export { ModuleMark, Eyebrow } from "./marks";

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function useRevealVariants(): { container: Variants; item: Variants } {
  const reduced = useReducedMotion();
  const from = reduced ? "translateY(0px)" : "translateY(16px)";
  return {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, transform: from },
      visible: {
        opacity: 1,
        transform: "translateY(0px)",
        transition: { duration: 0.55, ease: EASE_OUT },
      },
    },
  };
}

/**
 * Scroll-triggered reveal for a whole section block. `trigger` (P9.5-T1b,
 * additive — every existing call site omits it and keeps today's
 * behavior): `"inView"` (default) is the original `whileInView` scroll
 * reveal; `"mount"` swaps to `animate`, so the block plays its entrance the
 * instant it hydrates instead of waiting for an IntersectionObserver — for
 * content that's already above the fold (or inside something else that's
 * already scroll-gating it, like a tab panel), where `whileInView` would
 * either never fire or fire redundantly.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  trigger = "inView",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  trigger?: "inView" | "mount";
}) {
  const reduced = useReducedMotion();
  const initial = {
    opacity: 0,
    transform: reduced ? "translateY(0px)" : "translateY(18px)",
  };
  const entered = { opacity: 1, transform: "translateY(0px)" };
  const triggerProps =
    trigger === "mount"
      ? { animate: entered }
      : { whileInView: entered, viewport: { once: true, amount: 0.25 } };
  return (
    <motion.div
      className={className}
      initial={initial}
      {...triggerProps}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
