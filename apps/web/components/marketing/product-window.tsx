import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Generic "browser window" frame for product mockups — harvested-for-pattern
 * from components/explore/product-window.tsx (P9-U2): the gradient-border +
 * chrome-bar treatment shared by every framed product shot on the landing
 * page (studio window, dashboard window, API window). Presentational only:
 * no state, no client hooks, safe to render from a server component.
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
      <div className="overflow-hidden rounded-[calc(var(--radius)+12px)] bg-card">
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
