"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
  children?: TocItem[];
}

/**
 * Sticky scroll-spy TOC for `/developers` (P9.5-T1b). A client component
 * still server-renders its initial markup — the plain, fully-functional
 * anchor list below is what's in the served HTML and what a no-JS visitor
 * gets; `IntersectionObserver` only progressively enhances it with an
 * active-item highlight once hydrated, it doesn't gate the list's
 * existence or usability.
 */
export function ApiToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const flat = items.flatMap((item) => [item, ...(item.children ?? [])]);
    const targets = flat
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    // -96px top: clears the sticky site nav so a section counts as
    // "reached" only once it's actually visible below it. -70% bottom:
    // an entry is "active" once it's within the top ~30% of the
    // viewport, not merely anywhere on screen — the common scroll-spy
    // convention (highlights the section the reader is actually at,
    // not whichever one happens to still have a pixel showing).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="text-sm">
      <ul className="flex flex-col gap-1 border-l border-border/60">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={linkClass(activeId === item.id)}>
              {item.label}
            </a>
            {item.children && item.children.length > 0 && (
              <ul className="ml-3 flex flex-col gap-1 border-l border-border/60">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className={cn(linkClass(activeId === child.id), "font-mono text-xs")}
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function linkClass(active: boolean) {
  return cn(
    "-ml-px block border-l-2 py-1 pl-4 text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground motion-reduce:transition-none",
    active ? "border-primary font-medium text-foreground" : "border-transparent",
  );
}
