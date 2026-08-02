"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RANGE_OPTIONS, rangeLabel, type RangeDays } from "@/lib/analytics";
import { cn, withQueryParam } from "@/lib/utils";

// Re-exported so this file's existing importers (code-analytics-panel.tsx)
// don't need to change — `rangeLabel` itself now lives in lib/analytics.ts
// (P9.6-U2: a Server Component needed to call it, and any export of a "use
// client" file like this one becomes an uncallable client reference from
// server code, even a plain function with no client-only behavior).
export { rangeLabel };

/**
 * `RangeSelector`, extracted verbatim from code-analytics-panel.tsx
 * (P6.5-U1) so `/codes`' global overview panel can reuse the exact same
 * range control the per-code panel already has — zero behavior change.
 * Every `href="?range=N"` link below is relative, so it resolves against
 * whichever route segment renders this component: both `/codes` and
 * `/codes/[slug]` work unmodified.
 */

/**
 * Each option is a plain `<Link href="?range=N&...">` — a server refetch by
 * navigation, no client refetch machinery (spec). Options above the plan's
 * ceiling render locked: disabled, a subtle "Pro" tag, and a tooltip —
 * upsell affordance, honest not pushy (everyone is free until P8).
 * `TooltipProvider` is scoped locally here (no ancestor one exists in the
 * app yet) rather than touching app/layout.tsx, which is out of this
 * unit's file scope.
 *
 * Links are built via `withQueryParam` (P9.6-U2 follow-up), not a hardcoded
 * `?range=N` template — `/codes` gained a second independent URL param
 * (`?page=`, `components/codes/codes-pagination.tsx`) once pagination
 * landed, and a hardcoded template here would silently drop it every time
 * someone changed the range. `useSearchParams()` needs no `<Suspense>`
 * wrapper here: this only ever renders on `/codes`/`/codes/[slug]`, both
 * `force-dynamic` (D9), and the Next.js docs' own Suspense requirement is
 * specifically for a route that could otherwise be prerendered/static.
 */
export function RangeSelector({ current, maxDays }: { current: RangeDays; maxDays: number }) {
  const searchParams = useSearchParams();

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
              href={withQueryParam(searchParams, "range", days)}
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
