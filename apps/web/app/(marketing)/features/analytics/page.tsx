import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/magic";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { DashboardWindow } from "@/components/marketing/dashboard-window";
import { ClosingSection } from "@/components/marketing/closing-section";
import { FeatureHero } from "@/components/marketing/features/feature-hero";
import { FaqList } from "@/components/marketing/features/faq-list";
import { PLAN_LIMITS } from "@/lib/entitlements";

// /features/analytics (P9.5-T-F1) — the second feature-depth page, composing
// the landing's section-06 DashboardWindow with page-depth copy from the
// T-F chunk-1 deck. See /features/dynamic-codes' own header comment for the
// shared reasoning (verbatim deck strings, static route, one invented
// micro-heading for the FAQ block the deck left unheaded).
export const metadata: Metadata = {
  title: "Scan analytics",
  description:
    "Daily rollups by country, city, device, and referrer, with a live today count. Raw IP addresses are hashed at the door with a daily rotating salt and never stored.",
};

const PRIVACY_FACT_ROWS = [
  "stored: country, region, city, device class, referrer",
  "hashed: ip + daily rotating salt, one way",
  "never stored: raw IP, precise location, cross-day identity",
] as const;

const FAQ_ITEMS = [
  {
    q: "Why do my numbers differ from my web analytics?",
    a: "We count scans at the redirect; your site counts page loads after it. Bots we can identify are excluded from rollups, ad blockers do not affect us, and neither tool is wrong: they measure different doors.",
  },
  {
    q: "Do you use cookies or fingerprinting?",
    a: "No cookies, no fingerprinting. Uniqueness within a day comes from the salted hash, which cannot survive the day boundary.",
  },
  {
    q: "Is the today number exact?",
    a: "It is the live edge count and can drift slightly from the final daily rollup; the rollup is the number of record.",
  },
  {
    q: "Can I get analytics over the API?",
    a: (
      <>
        Yes:{" "}
        <Link
          href="/developers#code-analytics"
          className="text-foreground underline-offset-4 hover:underline"
        >
          per-code series and breakdowns
        </Link>
        .
      </>
    ),
  },
] as const;

export default function AnalyticsFeaturePage() {
  return (
    <>
      <FeatureHero
        eyebrow="Scan analytics"
        title="Every scan, counted honestly"
        lede="Daily rollups by country, city, device, and referrer, with a live today count. Hashed at the door: raw IP addresses are never stored."
        mono="sha256(ip + daily rotating salt) → raw IPs never stored"
      />

      {/* S1 — What you see. DashboardWindow reused as-is (demo data
          register), same max-w-5xl frame the landing's own analytics
          section uses. */}
      <Section variant="showcase" surface="floor" divider="none">
        <SectionHeading
          title="What you see"
          lede="One window per code: the scan curve, totals, today so far, and breakdowns by country, device, and referrer."
          className="mb-10"
        />
        <SectionBody className="max-w-5xl">
          <DashboardWindow />
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex justify-center">
          <MonoStrip>by day · country · city · device · referrer</MonoStrip>
        </SectionBody>
      </Section>

      {/* S2 — How counting works. */}
      <Section variant="split" divider="none">
        <SectionHeading
          title="How counting works"
          lede="The redirect layer logs each scan at the edge. An hourly job rolls logs into daily counts per code, and the dashboard reads those rollups: fast to load, boring to break. The today tile reads the live edge count."
          className="mb-10"
        />
        <SectionBody className="flex flex-col items-start gap-3">
          <MonoStrip>edge log → hourly rollup → scan_daily · today reads live</MonoStrip>
          <p className="text-xs text-muted-foreground">
            Totals update hourly by design. If another tracker shows different numbers, see the
            FAQ: both are probably right.
          </p>
        </SectionBody>
      </Section>

      {/* S3 — Privacy is the design, not a setting. */}
      <Section variant="split">
        <SectionHeading
          title="Privacy is the design, not a setting"
          lede="We never store a raw IP address. Each scan is hashed with a salt that rotates daily, so we can count unique visitors within a day but cannot trace anyone across days, and neither can anyone who ever reads our database."
          className="mb-10"
        />
        <SectionBody className="flex flex-col items-start gap-3">
          {PRIVACY_FACT_ROWS.map((row, i) => (
            <MonoStrip key={row} icon={i === 0}>
              {row}
            </MonoStrip>
          ))}
        </SectionBody>
        <SectionBody delay={0.15} className="mt-4">
          <p className="text-xs text-muted-foreground">
            The same words, legally binding, in{" "}
            <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
              the privacy policy
            </Link>
            .
          </p>
        </SectionBody>
      </Section>

      {/* S4 — Retention and plans. Band/tint, entitlements-sourced. */}
      <Section variant="band" surface="tint">
        <SectionBody className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>Retention</Eyebrow>
          <h2 className="max-w-2xl text-h3 font-display font-semibold text-foreground">
            History that matches your plan
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Free keeps {PLAN_LIMITS.free.analyticsRetentionDays} days of scan history,
            country-level. Pro extends that to {PLAN_LIMITS.pro.analyticsRetentionDays} days,
            with city-level geography.
          </p>
          <LearnMoreLink href="/pricing">Every number, on the pricing page</LearnMoreLink>
        </SectionBody>
      </Section>

      {/* S5 — FAQ. Split, same invented-micro-heading pattern as
          /features/dynamic-codes' own S6. */}
      <Section variant="split" divider="none">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <SectionBody className="flex flex-col gap-4">
            <SectionHeading eyebrow="Questions" title="Before you trust the numbers" reveal={false} />
          </SectionBody>
          <SectionBody delay={0.15}>
            <FaqList items={FAQ_ITEMS} />
          </SectionBody>
        </div>
      </Section>

      {/* Closing CTA — the deck's own head differs from the landing's
          ClosingSection default, so this overrides `title` only; lede,
          button, and mono sign-off stay the shared evergreen copy. */}
      <ClosingSection title="Know what your print is doing" />
    </>
  );
}
