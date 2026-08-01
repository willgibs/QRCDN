import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { GuardrailsPlot } from "./guardrails-plot";

// 05 — Guardrails (P9.5-T3c, new section). Sits between 04 dynamic-codes
// (surface="tint") and 06 analytics (surface="floor") — surface="default"
// here matches how 03 brand-system already sits as the neutral pause
// between two colored neighbors (02 floor, 04 tint); divider="none" on both
// sides since neither neighbor shares this surface (Section's own
// hairline-only-between-same-surface rule).
export function GuardrailsSection() {
  return (
    <Section variant="split" divider="none">
      <SectionHeading
        eyebrow="Guardrails"
        index="05"
        title="We measured what actually scans."
        lede="Every style rule in the studio is calibrated against real decode campaigns, not theory. When the instrument says scannable, it means their camera and your printer, not just our math."
        className="mb-10"
      />

      <SectionBody className="max-w-4xl">
        <GuardrailsPlot />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-3">
        <MonoStrip>
          160+ style combinations · 2 adversarial decode campaigns · warn 0.395 · fail 0.412
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
