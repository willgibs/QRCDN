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
}: {
  children: ReactNode;
  className?: string;
  icon?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex max-w-3xl items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4",
        className,
      )}
    >
      {icon && <ModuleMark className="size-3 shrink-0 text-primary" />}
      <p className="font-mono text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
