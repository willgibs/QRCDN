import { Clock, Lock, Pause } from "lucide-react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { FEATURE_DOORWAYS_ENABLED } from "@/lib/marketing-flags";

// 04 — Dynamic codes (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strips applied; the guarantee strip's text also
// picks up the site-wide no-em-dash fix — deck v3 replaces the original
// "your code never dies — ..." with a colon). No dedicated framed-window
// harvest source for this section (unlike the studio/dashboard windows) —
// the capability pills below visually echo the lede's own "pause it,
// protect it, expire it" (no new claims, just emphasis).
const CAPABILITIES = [
  { icon: Pause, label: "Pause" },
  { icon: Lock, label: "Protect" },
  { icon: Clock, label: "Expire" },
] as const;

export function DynamicCodesSection() {
  return (
    <Section id="dynamic-codes" variant="showcase" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Dynamic codes"
        index="04"
        title="Print once. Point anywhere."
        lede="A QRCDN code is a permanent address. Retarget it in seconds and the printed code never changes. Pause it, protect it, expire it."
      />

      <SectionBody className="mt-6 flex flex-wrap items-center gap-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3.5 py-1.5 font-mono text-[11px] text-muted-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </span>
        ))}
      </SectionBody>

      <SectionBody delay={0.15} className="mt-6 flex flex-col items-start gap-3">
        <MonoStrip>
          <span className="text-foreground">your code never dies</span>: free codes are never
          deactivated, and a downgrade never breaks a printed code.
        </MonoStrip>
        <MonoStrip icon={false}>302 + no-store · retarget live in seconds · ≤ 5 min worst case</MonoStrip>
        {FEATURE_DOORWAYS_ENABLED && (
          <LearnMoreLink href="/features/dynamic-codes">Explore dynamic codes</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
