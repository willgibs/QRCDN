import type { ReactNode } from "react";
import { ModuleMark } from "@/components/brand/magic";
import { cn } from "@/lib/utils";

/**
 * The two-register voice's "developer proof" line (copy deck v3's standing
 * rule: plain-benefit head+lede for owners, a mono proof-strip beside it
 * for their developers). Extracted at P9.5-T3a from DynamicCodesSection's
 * original one-off guarantee strip (same classes, byte for byte) so every
 * section that now carries one of these (how-it-works, studio, brand
 * system, dynamic codes, analytics, API) shares one visual register instead
 * of drifting. `icon={false}` drops the leading ModuleMark for a second
 * strip stacked under a first (e.g. dynamic codes' guarantee + facts
 * lines) — one glyph per group of strips reads as a label; one per line
 * reads as noise.
 */
export function MonoStrip({
  children,
  className,
  icon = true,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  icon?: boolean;
  /** "ink" (P9.9-C0, additive - default stays "default", byte-identical to
   *  before this prop existed) inverts the strip's own chrome for
   *  surface="ink" plates, where the site's normal border/card/
   *  muted-foreground tokens don't re-scope. First consumer: ManifestoSection's
   *  move onto the ink plate. ModuleMark stays text-primary regardless of
   *  tone: since the D13 monochrome amendment (P9.10-D1) primary is
   *  ink-register (near-white in dark), legible on the plate either way. */
  tone?: "default" | "ink";
}) {
  return (
    <div
      className={cn(
        "flex max-w-3xl items-center gap-3 rounded-2xl border px-5 py-4",
        tone === "ink" ? "border-ink-border bg-white/[0.06]" : "border-border/60 bg-card/60",
        className,
      )}
    >
      {icon && <ModuleMark className="size-3 shrink-0 text-primary" />}
      <p className={cn("font-mono text-xs", tone === "ink" ? "text-ink-muted" : "text-muted-foreground")}>
        {children}
      </p>
    </div>
  );
}
