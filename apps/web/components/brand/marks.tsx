import type { ReactNode } from "react";

/**
 * Directive-free home for the two brand marks (P9.7-U1 rider). `ModuleMark`
 * and `Eyebrow` used to live in `magic.tsx` purely because that file once
 * carried `"use client"` for its motion exports — neither mark uses a hook
 * or any client-only API. Moved here so a server-only consumer (e.g.
 * `components/marketing/section.tsx`, post P9.7-U1's reveal fix) can render
 * an eyebrow without pulling a client boundary in behind it. Re-exported
 * from `magic.tsx` so every pre-existing `@/components/brand/magic` import
 * site is unaffected. (The motion exports are since gone entirely — the
 * P9.7 close-out review retired `Reveal` after its last consumer, /login,
 * moved to the CSS mount-entrance pattern.)
 */

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

/**
 * Standard eyebrow: ordinal + tracked mono caps. The module-mark glyph left
 * the eyebrow at P9.9-C1-R2e (board note: "cleaner") — the ordinal plus the
 * tracked caps now carry the register alone; `MonoStrip` keeps its mark.
 * `index` (P9.5-T1b, optional — existing call sites are unaffected) renders
 * an ordinal ("01") before the label, for `SectionHeading`'s numbered-section
 * treatment; muted further than the label itself so the number reads as a
 * secondary cue, not competing with it. No separator glyph between the
 * ordinal and the label — the flex `gap-2.5` plus the ordinal's own lighter
 * tint already reads as two distinct tokens; an early draft used an em dash
 * here, which the P9.5-T3a no-em-dash copy rule (docs/guides/design-
 * system.md) caught before this prop had ever been exercised in
 * production (T3a is its first real consumer).
 */
export function Eyebrow({
  children,
  index,
  tone = "default",
}: {
  children: ReactNode;
  index?: string;
  /** "ink" (P9.9-C0, additive - default stays byte-identical) swaps the
   *  label and ordinal onto the ink plate's own muted token: the site's
   *  `--muted-foreground` doesn't re-scope inside `surface="ink"`, so
   *  without this the eyebrow renders as the un-inverted grey and reads
   *  dimmer than everything around it. Same prop shape as `MonoStrip`'s
   *  `tone`. */
  tone?: "default" | "ink";
}) {
  return (
    <p
      className={`mb-3 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] ${
        tone === "ink" ? "text-ink-muted" : "text-muted-foreground"
      }`}
    >
      {index && (
        <span className={tone === "ink" ? "text-ink-muted/70" : "text-muted-foreground/70"}>
          {index}
        </span>
      )}
      {children}
    </p>
  );
}
