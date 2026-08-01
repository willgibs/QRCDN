import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { RetargetTheatre } from "@/components/marketing/retarget-theatre";
import { StateCards } from "@/components/marketing/state-cards";
import { DYNAMIC_CODES_DOORWAY_ENABLED, ACCESS_CONTROLS_DOORWAY_ENABLED } from "@/lib/marketing-flags";

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
export function DynamicCodesSection() {
  return (
    <Section id="dynamic-codes" variant="showcase" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Dynamic codes"
        index="04"
        title="Change the destination after printing."
        lede="A QRCDN code is a permanent address. Retarget it in seconds and the printed code never changes. Pause it, protect it, expire it."
      />

      <SectionBody className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <RetargetTheatre />
        <StateCards />
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
        {ACCESS_CONTROLS_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/access-controls">Explore access controls</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
