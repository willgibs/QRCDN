"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The API console's tab switcher (P9.5-T3c, section 07) — the one client
 * island this chunk adds. Every pane is server-highlighted shiki HTML,
 * rendered ONCE on the server (`ApiConsole`, the caller) and handed in as
 * `panes[].panel` — plain `ReactNode`, already-built markup. This component
 * never imports `lib/highlight.ts` and never re-renders pane content: a
 * click only flips which pane's wrapper carries the `hidden` attribute and
 * which tab button carries `aria-selected`. All panes stay mounted the
 * whole time (so each pane's own CopyButton island hydrates once, up
 * front, not on first reveal) — this component's own state is nothing more
 * than "which id is active."
 */
export interface ApiConsolePane {
  id: string;
  label: string;
  panel: ReactNode;
}

export function ApiConsoleTabs({ panes }: { panes: ApiConsolePane[] }) {
  const [active, setActive] = useState(panes[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label="API examples"
        className="flex items-center gap-1 overflow-x-auto border-b border-border/60 px-4 py-2 sm:px-6"
      >
        {panes.map((pane) => {
          const selected = active === pane.id;
          return (
            <button
              key={pane.id}
              type="button"
              role="tab"
              id={`api-console-tab-${pane.id}`}
              aria-selected={selected}
              aria-controls={`api-console-panel-${pane.id}`}
              onClick={() => setActive(pane.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 font-mono text-[11px] transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
                selected
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {pane.label}
            </button>
          );
        })}
      </div>
      {panes.map((pane) => (
        <div
          key={pane.id}
          role="tabpanel"
          id={`api-console-panel-${pane.id}`}
          aria-labelledby={`api-console-tab-${pane.id}`}
          hidden={active !== pane.id}
        >
          {pane.panel}
        </div>
      ))}
    </div>
  );
}
