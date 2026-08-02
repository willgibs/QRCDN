import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Board-requested callout primitive (P9.7-U1): a left-rule annotation, not
 * a box. Server component, zero client JS. The landing has ~32 bordered
 * rounded rectangles and essentially no other shape — this is deliberately
 * the one device that isn't one: no background fill, no radius, a border on
 * exactly one side. Padding/rule-weight mirror the existing left-rule
 * precedent (`components/marketing/blog/post-shell.tsx`'s `Pull`
 * blockquote: `border-l-2` + `pl-6`), so the page's two left-rule treatments
 * share one physical vocabulary rather than drifting to slightly different
 * numbers. `accent` reuses the exact same `border-primary` class `Pull`
 * already establishes for "this rule is the brand accent."
 *
 * Lands unused this unit — adding a section-file consumer is out of scope
 * (the file allowlist bans every `*-section.tsx`). Later units consume it
 * sparingly, for contextual/honesty copy that currently renders at
 * `text-xs` and reads as apologetic.
 *
 * ```tsx
 * <Note lead="Each mark is one scan.">Not an area chart of a rolled up number…</Note>
 * ```
 */
export function Note({
  lead,
  tone = "default",
  className,
  children,
}: {
  lead?: ReactNode;
  tone?: "default" | "accent";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      data-slot="note"
      data-tone={tone}
      className={cn(
        "max-w-[76ch] border-l-2 py-0.5 pl-6 text-sm leading-relaxed text-muted-foreground",
        tone === "accent" ? "border-primary" : "border-border",
        className,
      )}
    >
      {lead && <strong className="font-semibold text-foreground">{lead} </strong>}
      {children}
    </p>
  );
}
