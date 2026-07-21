"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const DESTINATIONS = [
  "yourcafe.com/menu",
  "instagram.com/summer-drop",
  "tickets.io/tour-2026",
  "yourcafe.com/menu-fall",
];

/**
 * The money feature as a living detail: the printed code never changes,
 * the destination does. Cycles through destinations with a quiet swap.
 */
export function RetargetDemo() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % DESTINATIONS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full flex-col gap-1.5 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>qrcdn.com/K7M2X9A</span>
        <span className="flex items-center gap-1 text-primary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          live
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-sm">
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        <div className="relative h-5 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={DESTINATIONS[index]}
              className="absolute inset-0 truncate text-foreground"
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {DESTINATIONS[index]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Destination updated — the printed code never changes.
      </p>
    </div>
  );
}
