"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EASE_OUT } from "@/components/brand/magic";
import { PLAN_LIMITS } from "@/lib/entitlements";
import {
  ANNUAL_MONTHLY_EQUIV_USD,
  ANNUAL_SAVINGS_PCT,
  ANNUAL_USD,
  MONTHLY_USD,
  PRICING_ROWS,
  type PricingRow,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Toggle + two-card pricing block for /pricing (P9-U3). Harvested-for-
 * pattern from components/explore/pricing-pair.tsx (P2's sliding
 * BillingToggle + AnimatePresence price cross-fade) into a fresh file per
 * the phase spec's instruction — not imported from components/explore,
 * which is slated for deletion at U5. Every number below is read from
 * PLAN_LIMITS / lib/pricing rather than retyped (CLAUDE.md hard rule).
 */

type Billing = "monthly" | "annual";

const BILLING_OPTIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
] as const satisfies readonly { id: Billing; label: string }[];

function rowValue(key: PricingRow["key"], plan: "free" | "pro"): string {
  const found = PRICING_ROWS.find((r) => r.key === key);
  if (!found) throw new Error(`no PRICING_ROWS entry for "${key}"`);
  return plan === "free" ? found.free : found.pro;
}

const FREE_FEATURES = [
  "Unlimited static codes, full studio access",
  `${PLAN_LIMITS.free.dynamicCodes} dynamic codes: free forever, always redirecting`,
  `${PLAN_LIMITS.free.brandKits} brand kit · ${PLAN_LIMITS.free.analyticsRetentionDays}-day analytics`,
  "Unlimited scans, retargeting always allowed",
];

const PRO_FEATURES = [
  `${PLAN_LIMITS.pro.dynamicCodes} dynamic codes, unlimited brand kits`,
  `Full analytics: ${PLAN_LIMITS.pro.analyticsRetentionDays}-day history, city-level geo`,
  `API access: ${rowValue("apiMonthlyRequests", "pro")} · bulk generation`,
  "Expiry, passwords & vanity short links",
];

/** Monthly/annual segmented toggle — transitions.dev "Tabs sliding" pattern,
 *  simplified to two fixed-width options so the pill only ever needs a
 *  translate (no JS width measurement required). */
function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (billing: Billing) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Billing period"
      className="relative inline-flex rounded-full bg-muted p-1"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 w-24 rounded-full bg-background shadow-sm transition-transform duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none",
          billing === "annual" && "translate-x-24",
        )}
      />
      {BILLING_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={billing === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "relative z-10 inline-flex w-24 items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none",
            billing === opt.id ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("annual");
  const reduced = useReducedMotion();
  const priceOffset = reduced ? "0px" : "8px";
  const badgeScale = reduced ? 1 : 0.9;

  return (
    <div>
      <BillingToggle billing={billing} onChange={setBilling} />

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Free — glass gradient-border register, neutral (no violet tint). */}
        <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-border/60 via-border/40 to-border/20 p-px">
          <Card className="h-full border-transparent bg-card/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl">Free</CardTitle>
              <p className="text-sm text-muted-foreground">
                Unlimited static codes. A few dynamic ones that never die.
              </p>
              <p className="font-display text-4xl font-bold">
                $0<span className="text-sm font-normal text-muted-foreground"> forever</span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2.5">
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
        </div>

        {/* Pro — same glass register, plus the restrained violet accent: a
            lit border/glow whisper (soft gradient + shadow), not a carnival. */}
        <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/45 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
          <Card className="h-full border-transparent bg-card/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-display text-xl">Pro</CardTitle>
                {/* initial={false} (P9.7-U1): annual is the default, so without
                    it this badge server-rendered at opacity:0 and only appeared
                    once JS ran. Toggling still animates; only the very first
                    render skips the entrance. The price cross-fade below already
                    did this; the badge was the one that missed it. */}
                <AnimatePresence initial={false}>
                  {billing === "annual" && (
                    <motion.div
                      initial={{ opacity: 0, transform: `scale(${badgeScale})` }}
                      animate={{ opacity: 1, transform: "scale(1)" }}
                      exit={{ opacity: 0, transform: `scale(${badgeScale})` }}
                      transition={{ duration: 0.15, ease: EASE_OUT }}
                    >
                      <Badge>Save {ANNUAL_SAVINGS_PCT}%</Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-sm text-muted-foreground">
                QR infrastructure for teams that print at scale.
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={billing}
                  initial={{ opacity: 0, transform: `translateY(${priceOffset})` }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: `translateY(-${priceOffset})` }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <p className="font-display text-4xl font-bold">
                    {billing === "monthly" ? `$${MONTHLY_USD}` : `$${ANNUAL_MONTHLY_EQUIV_USD}`}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  {billing === "annual" && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      billed annually: ${ANNUAL_USD}/yr
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2.5">
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
                Paid checkout opens at launch. Start free today and everything carries over.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
