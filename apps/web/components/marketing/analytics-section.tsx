import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { ANALYTICS_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { ScanField } from "./scan-field";

// 06 — Analytics (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strips applied). surface="floor" is new here (the
// section had no bg-surface-studio before) — the IA mapping calls for it,
// matching the studio section's own recessed register. P9.5-T3b: the
// retention line moved INTO `DashboardWindow` itself (a footer row inside
// the window's own chrome, "one window, more instrument") — this section
// body now carries only the privacy strip, which "stays as shipped" per
// the spec. Entitlement numbers for it still come from entitlements.ts
// only (CLAUDE.md hard rule), just read inside dashboard-window.tsx now.
export function AnalyticsSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="analytics" variant="showcase" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Analytics"
        index={index}
        title="Track every scan globally"
        lede="Every scan is a place and a moment. By day, country, city, device and referrer, rolled up daily and honest about bots."
        titleSize={titleSize}
        className="mb-10"
      />

      {/* P9.7-V5: DashboardWindow's fake browser chrome went. It read as a
          screenshot of software rather than a fact about the world, and
          nothing in it was QR-native. ScanField draws the events themselves.
          DashboardWindow is untouched and still serves /features/analytics,
          where a product shot is the right thing to show. */}
      <SectionBody>
        <ScanField />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-3">
        <MonoStrip>sha256(ip + daily rotating salt) → raw IPs never stored</MonoStrip>
        {ANALYTICS_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/analytics">Explore analytics</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
