import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { FEATURE_DOORWAYS_ENABLED } from "@/lib/marketing-flags";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { DashboardWindow } from "./dashboard-window";

// 06 — Analytics (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strips applied). surface="floor" is new here (the
// section had no bg-surface-studio before) — the IA mapping calls for it,
// matching the studio section's own recessed register. Retention numbers
// come from entitlements.ts only (CLAUDE.md hard rule) — never retyped.
export function AnalyticsSection() {
  return (
    <Section id="analytics" variant="showcase" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Analytics"
        index="06"
        title="Know every scan."
        lede="By day, country, city, device, and referrer: rolled up daily, honest about bots."
        className="mb-10"
      />

      <SectionBody className="max-w-5xl">
        <DashboardWindow />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-3">
        <MonoStrip>sha256(ip + daily rotating salt) → raw IPs never stored</MonoStrip>
        <MonoStrip icon={false}>
          {PLAN_LIMITS.free.analyticsRetentionDays}-day history free ·{" "}
          {PLAN_LIMITS.pro.analyticsRetentionDays}-day + city-level on Pro
        </MonoStrip>
        {FEATURE_DOORWAYS_ENABLED && (
          <LearnMoreLink href="/features/analytics">Explore analytics</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
