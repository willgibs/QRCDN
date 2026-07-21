"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brandCopy, type Brand } from "@/lib/explore";
import { cn } from "@/lib/utils";
import { EASE_OUT, Eyebrow, ModuleMark, Reveal } from "./magic";

const freeFeatures = [
  "Unlimited static codes, full studio",
  "3 dynamic codes — free forever",
  "Unlimited scans, always retargetable",
  "1 brand kit · 30-day analytics",
];

const proFeatures = [
  "250 dynamic codes, unlimited brand kits",
  "Full analytics — history, city-level geo, devices",
  "Style-aware API · bulk generation",
  "Expiry, passwords & vanity short links",
];

type Billing = "monthly" | "annual";

const BILLING_OPTIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
] as const satisfies readonly { id: Billing; label: string }[];

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

const FAQ_ITEMS = [
  {
    q: "What happens to my printed codes if I downgrade or cancel?",
    a: "They keep redirecting forever — we cap features, never your codes.",
  },
  {
    q: "Do free dynamic codes really never expire?",
    a: "Yes — 3 free dynamic codes redirect forever, with retargeting always allowed; only illegal or malicious use is ever removed.",
  },
  {
    q: "What counts as a dynamic code?",
    a: "A code pointing at a qrcdn.com short link whose destination you can change anytime; static codes encode your URL directly and are unlimited free.",
  },
  {
    q: "Can I use my own logo and colors?",
    a: "Yes — the studio's brand kit applies your identity to every code, with live scannability checks.",
  },
];

/** Single FAQ disclosure — transitions.dev "Accordion expand" pattern:
 *  grid-template-rows 0fr→1fr for the height tween (no JS measuring), a
 *  vertical chevron flip through a flat midpoint rather than a `d:` path
 *  morph (path morphing is Chromium-only). Native button + aria-expanded,
 *  not the shadcn accordion (not vendored). */
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

export function PricingPair({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];
  const [billing, setBilling] = useState<Billing>("annual");
  const reduced = useReducedMotion();
  const priceOffset = reduced ? "0px" : "8px";

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Honest pricing. Codes that never die.
          </h2>
          <p className="mt-2 text-muted-foreground">
            We cap features, never your printed codes. Downgrade anytime — every
            code keeps redirecting.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-3xl">
          <BillingToggle billing={billing} onChange={setBilling} />

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Free</CardTitle>
                <p className="font-display text-4xl font-bold">
                  $0
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    forever
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {freeFeatures.map((f) => (
                  <p key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                  </p>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Start free
                </Button>
              </CardFooter>
            </Card>

            <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/45 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
              <Card className="border-transparent">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-xl">Pro</CardTitle>
                    {billing === "annual" && <Badge>4 months free</Badge>}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={billing}
                      initial={{ opacity: 0, transform: `translateY(${priceOffset})` }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      exit={{ opacity: 0, transform: `translateY(-${priceOffset})` }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                    >
                      <p className="font-display text-4xl font-bold">
                        {billing === "monthly" ? "$12" : "$8"}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      </p>
                      {billing === "annual" && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          billed $96 yearly
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5">
                  {proFeatures.map((f) => (
                    <p key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />{" "}
                      {f}
                    </p>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full">{copy.proCta}</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
          <ModuleMark className="size-3 shrink-0 text-primary" />
          <p className="font-mono text-xs text-muted-foreground">
            Downgrade anytime — every printed code keeps redirecting.{" "}
            <span className="text-foreground">Forever.</span>
          </p>
        </div>

        <div className="mt-12 max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/60 px-5">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
