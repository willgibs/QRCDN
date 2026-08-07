import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { RetargetTheatre } from "@/components/marketing/retarget-theatre";
import { DYNAMIC_CODES_DOORWAY_ENABLED } from "@/lib/marketing-flags";

// 04 — Dynamic codes (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strips applied; the guarantee strip's text also
// picks up the site-wide no-em-dash fix — deck v3 replaces the original
// "your code never dies — ..." with a colon). P9.5-T3b: the old three
// feature-icon pills (bland, the board's exact word) are retired in favor
// of the RetargetTheatre + truthful state-cards below, which embody the
// same "pause it, protect it, expire it" claim concretely instead of just
// naming it — a paused/archived code IS the /u fallback the first
// state-card shows, a protected code IS the /p gate the second shows, and
// an expired code IS the dashboard "Expired" pill the third shows.
//
// P9.5-T-F2: a second doorway link, into /features/access-controls, joins
// the existing dynamic-codes one below. The T-F2 spec asked for this only
// "if a natural slot exists" — it does: the state-cards right above already
// depict the password gate and the expired-code row this new page expands
// on, and the existing doorway-link convention (a LearnMoreLink beside the
// mono strips) accepts a second entry with zero layout change.
export function DynamicCodesSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="dynamic-codes" variant="showcase" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Dynamic links"
        index={index}
        title="Update a destination anytime"
        lede="A QRCDN code is a permanent address. Retarget it in seconds and the printed code never changes."
        titleSize={titleSize}
      />

      {/* P9.7-V4: the state cards moved to section 06, where they were always
          the story. They had been sharing this row as a 280px sidebar, which
          left the page's one visitor-driven moment rendering narrower than a
          static dashboard mock two sections later. The theatre now has the
          whole frame. */}
      <SectionBody className="mt-10">
        <RetargetTheatre />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-start gap-3">
        <MonoStrip>
          <span className="text-foreground">your code never dies</span>: free codes are never
          deactivated, and a downgrade never breaks a printed code.
        </MonoStrip>
        <MonoStrip icon={false}>302 + no-store · retarget live in seconds · ≤ 5 min worst case</MonoStrip>
        {DYNAMIC_CODES_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/dynamic-codes">Explore dynamic codes</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
