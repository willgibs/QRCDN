import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { ANNUAL_MONTHLY_EQUIV_USD, ANNUAL_SAVINGS_PCT, ANNUAL_USD } from "@/lib/pricing";
import { LearnMoreLink } from "./learn-more-link";

// 11 — Pricing (P9.5-T3a: migrated onto Section/SectionHeading, copy deck
// v3 head/lede applied; no mono strip for this section per the deck).
// Compact card pair only — the full feature matrix + monthly/annual toggle
// lives on /pricing (components/marketing/pricing-plans.tsx). Every figure
// below is read from lib/entitlements.ts / lib/pricing.ts; nothing here is a
// retyped literal (CLAUDE.md hard rule). Annual framing is fixed (no
// toggle) per the copy deck — "compact" means no interactive billing switch.
const FREE_FEATURES = [
  "Unlimited static codes",
  `${PLAN_LIMITS.free.dynamicCodes} dynamic codes, free forever`,
  `${PLAN_LIMITS.free.brandKits} brand kit · ${PLAN_LIMITS.free.analyticsRetentionDays}-day analytics`,
];

const PRO_FEATURES = [
  `${PLAN_LIMITS.pro.dynamicCodes} dynamic codes, unlimited brand kits`,
  `${PLAN_LIMITS.pro.analyticsRetentionDays}-day analytics, city-level geo`,
  "API access, bulk generation & vanity links",
];

export function PricingTeaser() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Pricing"
        index="11"
        title="Free forever means forever."
        lede={
          <>
            $0 gets {PLAN_LIMITS.free.dynamicCodes} dynamic codes that never stop redirecting. $
            {ANNUAL_MONTHLY_EQUIV_USD}/mo when you print at scale.
          </>
        }
        className="mb-10"
      />

      <SectionBody className="grid max-w-3xl gap-6 sm:grid-cols-2">
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
                  billed annually: ${ANNUAL_USD}/yr · save {ANNUAL_SAVINGS_PCT}%
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
                  Paid checkout opens at launch. Start free today and
                  everything carries over.
                </p>
              </CardFooter>
            </Card>
          </div>
      </SectionBody>

      <div className="mt-6">
        <LearnMoreLink href="/pricing">Compare everything</LearnMoreLink>
      </div>
    </Section>
  );
}
