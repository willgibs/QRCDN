import type { ReactNode } from "react";
import { statusMeta } from "@/components/codes/codes-table";
import { cn } from "@/lib/utils";

/**
 * Truthful state-cards (P9.5-T3b) — three compact, static mocks of real
 * product states, sitting beside the RetargetTheatre so "pause it, protect
 * it, expire it" (the section's own lede) isn't just a claim but something
 * a visitor can see the actual shape of. Every card mirrors a REAL route's
 * copy/structure, checked against the source before drawing anything here:
 *
 *  - `app/u/[slug]/page.tsx` — the unclaimed/paused/archived fallback a
 *    scanner actually lands on. That page's own subcopy had a pre-existing
 *    em dash ("...paused it — or it hasn't been claimed yet."), a real bug
 *    on that route but out of this unit's (P9.5-T3b) scope (not a landing
 *    section) — flagged rather than silently perpetuated here, so this
 *    card's copy was punctuated with a comma instead. Fixed at its source
 *    at P9.5-T3c (same comma restructure), so both now agree.
 *  - `app/p/[slug]/page.tsx` + `unlock-form.tsx` — the password gate.
 *  - `components/codes/codes-table.tsx`'s `statusMeta` — imported directly
 *    (not re-typed) for the "Expired" pill's exact label/classes, so this
 *    card can never silently drift from what the real dashboard renders.
 *    There is no distinct scan-facing "expired" page (an expired code
 *    decides `{kind: "unclaimed"}` in `redirect-decision.ts`, landing on
 *    the exact same /u page as card one) — the honest place to depict
 *    "expired" is the owner-facing dashboard row, so that's what this card
 *    shows, captioned accordingly rather than implying a scanner sees
 *    something different.
 *
 * Static, zero client JS (no "use client", no hooks), both themes. The
 * fake input/button chrome inside each card is `aria-hidden` — decoration
 * only, same convention `ProductWindow`'s traffic-light dots use; the real
 * information (heading, route label) stays regular readable text.
 */

const DEMO_SLUG = "K7M2X9A";

function StateCard({
  routeLabel,
  children,
}: {
  routeLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {routeLabel}
      </span>
      {children}
    </div>
  );
}

function MockButton({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="mt-1 inline-flex w-fit items-center justify-center rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground"
    >
      {children}
    </span>
  );
}

export function StateCards() {
  const expired = statusMeta("active", "2024-01-01T00:00:00.000Z");

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
      <StateCard routeLabel={`/u/${DEMO_SLUG}`}>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-foreground">This code isn&apos;t live right now.</p>
          <p className="text-xs text-muted-foreground">
            The person who printed it may have paused it, or it hasn&apos;t been claimed yet.
          </p>
        </div>
        <MockButton>Create a code that never dies</MockButton>
      </StateCard>

      <StateCard routeLabel={`/p/${DEMO_SLUG}`}>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-foreground">This code is password-protected.</p>
          <p className="text-xs text-muted-foreground">Enter the password to continue.</p>
        </div>
        <div className="mt-1 flex items-center gap-2" aria-hidden>
          <span className="flex h-8 flex-1 items-center rounded-md border border-input bg-background px-2.5 font-mono text-xs text-muted-foreground/60">
            ••••••••
          </span>
          <span className="flex h-8 shrink-0 items-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">
            Continue
          </span>
        </div>
      </StateCard>

      <StateCard routeLabel="dashboard · your codes">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">Café Norte menu</span>
            <span className="font-mono text-[11px] text-muted-foreground">/{DEMO_SLUG}</span>
          </div>
          <span
            className={cn(
              "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              expired.className,
            )}
          >
            {expired.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Still redirects safely, just never to the old destination.
        </p>
      </StateCard>
    </div>
  );
}
