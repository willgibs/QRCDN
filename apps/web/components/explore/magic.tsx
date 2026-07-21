"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared motion language: quiet, precise, Apple-esque. Everything respects
 * prefers-reduced-motion (offsets collapse to opacity-only).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function useRevealVariants(): { container: Variants; item: Variants } {
  const reduced = useReducedMotion();
  const y = reduced ? 0 : 16;
  return {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, y },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
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
      initial={{ opacity: 0, y: reduced ? 0 : 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, ease: EASE, delay }}
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
