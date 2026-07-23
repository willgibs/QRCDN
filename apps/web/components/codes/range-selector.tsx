"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RANGE_OPTIONS, type RangeDays } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * `RangeSelector` + `rangeLabel`, extracted verbatim from
 * code-analytics-panel.tsx (P6.5-U1) so `/codes`' global overview panel can
 * reuse the exact same range control the per-code panel already has — zero
 * behavior change. Every `href="?range=N"` link below is relative, so it
 * resolves against whichever route segment renders this component: both
 * `/codes` and `/codes/[slug]` work unmodified.
 */
export function rangeLabel(days: number): string {
  return days === 365 ? "1y" : `${days}d`;
}

/**
 * Each option is a plain `<Link href="?range=N">` — a server refetch by
 * navigation, no client refetch machinery (spec). Options above the plan's
 * ceiling render locked: disabled, a subtle "Pro" tag, and a tooltip —
 * upsell affordance, honest not pushy (everyone is free until P8).
 * `TooltipProvider` is scoped locally here (no ancestor one exists in the
 * app yet) rather than touching app/layout.tsx, which is out of this
 * unit's file scope.
 */
export function RangeSelector({ current, maxDays }: { current: RangeDays; maxDays: number }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 p-1">
        {RANGE_OPTIONS.map((days) => {
          const locked = days > maxDays;
          const active = days === current;

          if (locked) {
            return (
              <Tooltip key={days}>
                <TooltipTrigger asChild>
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground/40"
                  >
                    {rangeLabel(days)}
                    <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                      Pro
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Upgrade to Pro for {rangeLabel(days)} of history</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={days}
              href={`?range=${days}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rangeLabel(days)}
            </Link>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
