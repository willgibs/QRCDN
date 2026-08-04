/**
 * Shared motion language, per the emil-design-eng skill: entrances use the
 * strong ease-out curve, full `transform` strings (hardware-accelerated —
 * motion's x/y shorthands run on the main thread), reduced-motion collapses
 * movement to opacity-only. Marketing entrances may exceed the 300ms UI
 * budget; in-app UI must not.
 *
 * P9.7 close-out review: this file no longer carries `"use client"` or any
 * motion component. `Reveal` and `useRevealVariants` were retired when their
 * last consumer (/login) moved to the CSS mount-entrance pattern
 * (`.mount-enter`/`.mount-rise`, globals.css) — a motion `initial` prop SSRs
 * a static inline `opacity:0`, which is exactly the markup the standing
 * whole-document e2e sweeps forbid. What remains here: the shared easing
 * curve, and the brand-marks re-export below.
 *
 * `ModuleMark`/`Eyebrow` (P9.7-U1): live in the directive-free `./marks.tsx`;
 * re-exported here so every existing `@/components/brand/magic` import site
 * keeps working unchanged. With the directive gone, importing them through
 * this path no longer pulls a client boundary in behind them either.
 */
export { ModuleMark, Eyebrow } from "./marks";

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
