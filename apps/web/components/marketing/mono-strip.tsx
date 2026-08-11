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
  /** Inverts the strip's chrome for a plate whose tokens do not re-scope.
   *  The ink plate held this from P9.9-C0 until P9.10-D6 retired it;
   *  "paper" is its heir, and unlike ink it also has to move the
   *  ModuleMark (see below). */
  tone?: "default" | "paper";
}) {
  return (
    <div
      className={cn(
        "flex max-w-3xl items-center gap-3 rounded-2xl border px-5 py-4",
        tone === "paper" && "border-paper-border bg-paper-foreground/[0.04]",
        tone === "default" && "border-border/60 bg-card/60",
        className,
      )}
    >
      {/* The mark follows the plate. It stayed `text-primary` through the
          ink era because primary is near-white in dark and read fine on a
          dark plate; on PAPER that is near-white on near-white, which the
          D6 recon caught before it shipped. */}
      {icon && (
        <ModuleMark
          className={cn(
            "size-3 shrink-0",
            tone === "paper" ? "text-paper-foreground" : "text-primary",
          )}
        />
      )}
      <p
        className={cn(
          "font-mono text-xs",
          tone === "paper" && "text-paper-muted",
          tone === "default" && "text-muted-foreground",
        )}
      >
        {children}
      </p>
    </div>
  );
}
