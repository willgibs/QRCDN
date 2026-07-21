import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Generic "browser window" frame for product mockups — the gradient-border +
 * chrome-bar pattern already used for the pricing card (`pricing-pair.tsx`),
 * lifted into a reusable shell so studio/dashboard product shots share one
 * frame. Presentational only: no state, no client hooks.
 */
export function ProductWindow({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/25 via-border/60 to-border/20 p-px shadow-2xl shadow-primary/10",
        className,
      )}
    >
      <div className="rounded-[calc(var(--radius)+12px)] bg-card overflow-hidden">
        <div className="flex h-10 items-center border-b border-border/60 px-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          </div>
          <div className="mx-auto rounded-full bg-muted px-4 py-1 font-mono text-[11px] text-muted-foreground">
            {url}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
