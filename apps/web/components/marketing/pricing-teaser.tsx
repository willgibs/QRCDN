import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow, Reveal } from "@/components/brand/magic";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { ANNUAL_MONTHLY_EQUIV_USD, ANNUAL_SAVINGS_PCT, ANNUAL_USD } from "@/lib/pricing";
import { LearnMoreLink } from "./learn-more-link";

// Compact card pair only — the full feature matrix + monthly/annual toggle
// lives on /pricing (components/marketing/pricing-plans.tsx). Every figure
// below is read from lib/entitlements.ts / lib/pricing.ts; nothing here is a
// retyped literal (CLAUDE.md hard rule). Annual framing is fixed (no
// toggle) per the copy deck — "compact" means no interactive billing switch.
const FREE_FEATURES = [
  "Unlimited static codes",
  `${PLAN_LIMITS.free.dynamicCodes} dynamic codes — free forever`,
  `${PLAN_LIMITS.free.brandKits} brand kit · ${PLAN_LIMITS.free.analyticsRetentionDays}-day analytics`,
];

const PRO_FEATURES = [
  `${PLAN_LIMITS.pro.dynamicCodes} dynamic codes, unlimited brand kits`,
  `${PLAN_LIMITS.pro.analyticsRetentionDays}-day analytics, city-level geo`,
  "API access, bulk generation & vanity links",
];

export function PricingTeaser() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Simple, honest pricing.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Free</CardTitle>
              <p className="font-display text-4xl font-bold">
                $0<span className="text-sm font-normal text-muted-foreground"> forever</span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <p key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {f}
                </p>
              ))}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Start free</Link>
              </Button>
            </CardFooter>
          </Card>

          <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/45 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <Card className="h-full border-transparent">
              <CardHeader>
                <CardTitle className="font-display text-xl">Pro</CardTitle>
                <p className="font-display text-4xl font-bold">
                  ${ANNUAL_MONTHLY_EQUIV_USD}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  billed annually — ${ANNUAL_USD}/yr · save {ANNUAL_SAVINGS_PCT}%
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <p key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {f}
                  </p>
                ))}
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2">
                <Button asChild className="w-full">
                  <Link href="/login">Start free</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Paid checkout opens at launch — start free today and
                  everything carries over.
                </p>
              </CardFooter>
            </Card>
          </div>
        </Reveal>

        <div className="mt-6">
          <LearnMoreLink href="/pricing">Compare everything</LearnMoreLink>
        </div>
      </div>
    </section>
  );
}
