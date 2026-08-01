import type { ReactNode } from "react";

/**
 * Static Q&A list for the /features/* pages (P9.5-T-F1). Deliberately NOT
 * `PricingFaq`'s pattern (components/marketing/pricing-faq.tsx): that
 * component is a `"use client"` expand/collapse accordion (`useState` per
 * item), and this unit's own non-negotiable is zero NEW client JS — the
 * only client island this chunk may reuse is the one that already exists
 * (`RetargetTheatre`). The deck's own framing ("plain answers") reads as
 * "just show them," not "hide them behind a disclosure," so every answer
 * renders open, always — a plain `<dl>` of question/answer pairs, zero
 * hooks, safe on a fully static route. Visual chrome (divide-y rounded card)
 * intentionally echoes `PricingFaq`'s so the two FAQ treatments on the site
 * read as one family despite the different interaction model.
 *
 * `a` is `ReactNode`, not a plain string: one answer on the analytics page
 * (P9.5-T-F1's own deck, "Can I get analytics over the API?") carries the
 * deck's explicit instruction to link its answer to a real anchor
 * (`/developers#code-analytics`), so the type has to allow an inline
 * `<Link>` inside an answer without a second, parallel component.
 */
export function FaqList({ items }: { items: readonly { q: string; a: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/60 px-5">
      {items.map((item) => (
        <div key={item.q} className="py-4">
          <dt className="text-sm font-medium text-foreground">{item.q}</dt>
          <dd className="mt-1.5 text-sm text-muted-foreground">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}
