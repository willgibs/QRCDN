import type { ReactNode } from "react";

/**
 * Docs subsection wrapper for `/developers` (P9.5-T1b) — distinct from
 * `components/marketing/section.tsx`'s `Section` (the marketing-page
 * primitive: variants, rhythm, surface, divider). This one is much
 * plainer on purpose: a docs page is a single continuous reading column,
 * not a sequence of alternating-surface marketing beats. Heading moved
 * from an ad hoc `text-xl` onto the shared type scale's `text-h3` (the
 * "text-xl inconsistency" the ascent spec calls out) — semantic tag stays
 * `<h2>` (correct hierarchy under the page's one `<h1>`), only the visual
 * size changed. `scroll-mt-24` keeps an anchor-jumped-to heading clear of
 * the sticky site nav.
 */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border/60 pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-h3 font-display font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
