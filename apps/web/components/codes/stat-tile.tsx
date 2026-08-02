import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared stat-cell shell (P9.6-U2 consolidation) — label / value / optional
 * caption. Previously defined three near-identical times: `codes/page.tsx`,
 * `codes-overview-panel.tsx`, and `code-analytics-panel.tsx` each had their
 * own byte-for-byte-similar `StatTile`. `components/marketing/
 * dashboard-window.tsx`'s own `StatTile` is a fourth, deliberately left
 * alone — different register (marketing, has the live-pulse dot), not part
 * of this consolidation.
 *
 * Directive-free (no "use client", no hooks) so it works as a plain leaf
 * from either side of the RSC boundary — same precedent this directory's
 * `codes-table.tsx` already set for `statusMeta`/`StatusPill`/`ProtectedTag`.
 *
 * `value` takes a `ReactNode` rather than a plain string so
 * `code-analytics-panel.tsx` (which needs its value to pop in on change
 * after the panel's first paint, via that file's own client-only
 * `PoppingStat`) can pass that element straight through. A plain
 * string/number renders with this shell's own default text styling, so
 * every OTHER caller keeps writing a plain value with no extra ceremony.
 * `PoppingStat` already carries the exact classes this shell would
 * otherwise apply to a plain value, so there is no double-styling — a
 * custom node owns its own presentation entirely once passed in.
 *
 * No outer `<Card>` here (unlike the three definitions this replaces): the
 * detail page still wants each tile individually card-wrapped (unchanged
 * from today, so callers do that themselves), while the new /codes stat
 * strip wants one shared bordered container with internal dividers instead
 * of four floating cards — a single chrome-less shell composes into both.
 *
 * `labelClassName` (additive): the /codes overview stat strip wants mono
 * uppercase labels (spec: "Mono uppercase labels, tabular-nums values"), a
 * different register from the plain `text-xs` label the three consolidated
 * definitions all already used and `code-analytics-panel.tsx` keeps today.
 * Omitted, the label renders exactly as those three did.
 */
export function StatTile({
  label,
  value,
  caption,
  className,
  labelClassName,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  className?: string;
  labelClassName?: string;
}) {
  const isPlainValue = typeof value === "string" || typeof value === "number";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className={cn("text-xs text-muted-foreground", labelClassName)}>{label}</p>
      {isPlainValue ? (
        <p className="font-display text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      ) : (
        value
      )}
      {caption && <p className="font-mono text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}
