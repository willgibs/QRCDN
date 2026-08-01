"use client";

import { useState } from "react";
import { ANNUAL_MONTHLY_EQUIV_USD, ANNUAL_SAVINGS_PCT, ANNUAL_USD } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * /pricing trust accordion (P9-U3). Copy is the CEO-drafted content file
 * (docs handoff, 2026-07-30), verbatim and in order — downgrade fear
 * first. The last item's savings figure is computed from lib/pricing.ts
 * rather than quoting the draft's literal "two months free" (the draft's
 * own parenthetical instructs this: render the equivalence and savings
 * from the derivations, never as literals — the literal draft figure
 * doesn't match PRICING's actual $12/$96 numbers).
 *
 * The FaqItem disclosure is harvested-for-pattern from
 * components/explore/pricing-pair.tsx's grid-rows technique (transitions.dev
 * "Accordion expand") into this fresh file — not imported from
 * components/explore, which is slated for deletion at U5.
 */

const FAQ_ITEMS = [
  {
    q: "What happens to my codes if I downgrade or stop paying?",
    a: "They keep redirecting, forever. Codes beyond the free limit become read-only: you can't edit them, but every printed code keeps working, pointed wherever you last aimed it. We cap features, never your codes.",
  },
  {
    q: "Can I change where a code points after it's printed?",
    a: "That's the whole point. Retargeting is live everywhere within about a minute, usually instantly: the printed code never changes, only its destination.",
  },
  {
    q: "What's the difference between static and dynamic codes?",
    a: "A static code encodes your URL directly: free, unlimited, ours to render and yours to keep, but fixed once printed. A dynamic code points at a short QRCDN URL, which makes it retargetable, pausable, and measurable.",
  },
  {
    q: "Do redirects break if QRCDN has an outage?",
    a: "The redirect layer is engineered to run independently of our application and database: if everything else is down, scans still resolve. Your code is the last thing standing.",
  },
  {
    q: "When can I buy Pro?",
    a: "Paid checkout opens at launch. Until then, start free: your account, codes, and styles carry over unchanged the day billing opens.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: `Yes: $${ANNUAL_USD}/year, billed once. That's equivalent to $${ANNUAL_MONTHLY_EQUIV_USD}/mo, ${ANNUAL_SAVINGS_PCT}% less than paying monthly.`,
  },
] as const;

/** Single FAQ disclosure — grid-template-rows 0fr→1fr for the height tween
 *  (no JS measuring), a vertical chevron flip through a flat midpoint
 *  rather than a `d:` path morph (path morphing is Chromium-only). Native
 *  button + aria-expanded, not the shadcn accordion (not vendored). */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
      >
        <span>{q}</span>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none",
            open && "scale-y-[-1]",
          )}
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6.5L8 10.5L12 6.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-4 pr-8 text-sm text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function PricingFaq() {
  return (
    <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/60 px-5">
      {FAQ_ITEMS.map((item) => (
        <FaqItem key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}
