import { useId, type ReactNode } from "react";

/**
 * Directive-free home for the two brand marks (P9.7-U1 rider). `ModuleMark`
 * and `Eyebrow` used to live in `magic.tsx` purely because that file once
 * carried `"use client"` for its motion exports. Moved here so a server-only
 * consumer (e.g. `components/marketing/section.tsx`, post P9.7-U1's reveal
 * fix) can render an eyebrow without pulling a client boundary in behind it
 * (`useId` below is RSC-safe — it never forces a client boundary).
 * Re-exported from `magic.tsx` so every pre-existing
 * `@/components/brand/magic` import site is unaffected.
 */

/**
 * The QRCDN brand mark — board-supplied maze glyph (P9.10-D1 close-out,
 * 2026-08-08), replacing the original 2×2 module glyph. One geometry, two
 * paints:
 *
 * - `tone="brand"`: the supplied vertical #E7E7E7→white gradient — the
 *   logo lockups on the dark field (nav, footer, auth, interstitials).
 *   The gradient def is useId-namespaced so several lockups on one page
 *   keep valid unique ids.
 * - `tone="current"` (default): fill=currentColor — the functional mode
 *   every tinted consumer relies on (kit ink swatches in kit-bar and
 *   kit-picker, the kit-sync theatre's ink story, mono-strip's promise
 *   that its mark follows the eyebrow register on any plate).
 *
 * Default stays "current" so no pre-existing call site changes color
 * semantics silently; lockups opt into the brand dress explicitly.
 */
export function ModuleMark({
  className,
  tone = "current",
}: {
  className?: string;
  tone?: "brand" | "current";
}) {
  const id = useId();
  const fill = tone === "brand" ? `url(#${id})` : "currentColor";
  return (
    <svg
      viewBox="0 0 269 269"
      aria-hidden
      className={className ?? "size-2.5 text-primary"}
    >
      {tone === "brand" && (
        <defs>
          <linearGradient
            id={id}
            x1="134.398"
            y1="268.801"
            x2="134.398"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E7E7E7" />
            <stop offset="1" stopColor="white" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M204.797 6.40002C204.797 2.8654 207.662 1.75949e-05 211.197 1.79039e-05L262.397 2.238e-05C265.932 2.2689e-05 268.797 2.8654 268.797 6.40002V57.6C268.797 61.1346 265.932 64 262.397 64L211.197 64C207.662 64 204.797 61.1346 204.797 57.6V6.40002Z"
        fill={fill}
      />
      <path
        d="M204.797 224.001C204.797 220.466 201.932 217.601 198.397 217.601H172.798C169.264 217.601 166.398 220.466 166.398 224.001V262.401C166.398 265.935 163.533 268.801 159.998 268.801H108.798C105.264 268.801 102.398 265.935 102.398 262.401L102.398 211.201C102.398 207.666 105.264 204.801 108.798 204.801H147.194C150.728 204.801 153.594 201.935 153.594 198.401L153.594 172.8C153.594 169.266 150.728 166.4 147.194 166.4H108.798C105.264 166.4 102.398 163.535 102.398 160L102.398 121.6C102.398 118.066 99.5331 115.2 95.9985 115.2H70.4C66.8654 115.2 64 118.066 64 121.6L64 160C64 163.535 61.1346 166.4 57.6 166.4H6.40001C2.86539 166.4 8.64312e-06 163.535 8.95213e-06 160L1.34282e-05 108.8C1.37372e-05 105.266 2.86539 102.4 6.40001 102.4H44.7953C48.3299 102.4 51.1953 99.535 51.1953 96.0004V70.4C51.1953 66.8654 48.33 64 44.7953 64H6.40002C2.8654 64 1.75952e-05 61.1346 1.79043e-05 57.6L2.23803e-05 6.4C2.26893e-05 2.86538 2.8654 -3.09007e-07 6.40002 0L57.6 4.47605e-06C61.1346 4.78505e-06 64 2.86538 64 6.4L64 44.8002C64 48.3348 66.8654 51.2002 70.4 51.2002L95.9985 51.2002C99.5331 51.2002 102.398 48.3348 102.398 44.8002L102.398 6.40001C102.398 2.86539 105.264 8.64295e-06 108.798 8.95196e-06L159.998 1.3428e-05C163.533 1.3737e-05 166.398 2.86539 166.398 6.40001V57.6C166.398 61.1346 163.533 64 159.998 64L121.595 64C118.061 64 115.195 66.8654 115.195 70.4V96.0004C115.195 99.535 118.061 102.4 121.595 102.4L159.998 102.4C163.533 102.4 166.398 105.266 166.398 108.8V147.201C166.398 150.735 169.264 153.601 172.798 153.601H198.397C201.932 153.601 204.797 150.735 204.797 147.201V108.8C204.797 105.266 207.662 102.4 211.197 102.4L262.397 102.4C265.932 102.4 268.797 105.266 268.797 108.8V160C268.797 163.535 265.932 166.4 262.397 166.4H223.994C220.459 166.4 217.594 169.266 217.594 172.8L217.594 198.401C217.594 201.935 220.459 204.801 223.994 204.801H262.397C265.932 204.801 268.797 207.666 268.797 211.201V262.401C268.797 265.935 265.932 268.801 262.397 268.801H211.197C207.662 268.801 204.797 265.935 204.797 262.401V224.001Z"
        fill={fill}
      />
      <path
        d="M4.47605e-06 211.201C4.78505e-06 207.666 2.86538 204.801 6.40001 204.801H57.6C61.1346 204.801 64 207.666 64 211.201L64 262.401C64 265.935 61.1346 268.801 57.6 268.801H6.4C2.86538 268.801 -3.09007e-07 265.935 0 262.401L4.47605e-06 211.201Z"
        fill={fill}
      />
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
