"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared motion language, per the emil-design-eng skill: entrances use the
 * strong ease-out curve, full `transform` strings (hardware-accelerated —
 * motion's x/y shorthands run on the main thread), reduced-motion collapses
 * movement to opacity-only. Marketing entrances may exceed the 300ms UI
 * budget; in-app UI must not.
 */

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

/** Scroll-triggered reveal for a whole section block. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        transform: reduced ? "translateY(0px)" : "translateY(18px)",
      }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** 2×2 QR-module glyph used before eyebrow labels — the brand mark detail. */
export function ModuleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className={className ?? "size-2.5 text-primary"}
    >
      <rect x="0" y="0" width="4" height="4" fill="currentColor" />
      <rect x="6" y="0" width="4" height="4" fill="currentColor" opacity="0.45" />
      <rect x="0" y="6" width="4" height="4" fill="currentColor" opacity="0.45" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" />
    </svg>
  );
}

/** Standard eyebrow: module mark + tracked mono caps. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
      <ModuleMark />
      {children}
    </p>
  );
}
