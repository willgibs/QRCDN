import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { ModuleMark } from "@/components/brand/magic";
import { MonoStrip } from "@/components/marketing/mono-strip";

const STEPS = [
  "Set the kit once.",
  "Print or export anything.",
  "Change where it points, forever.",
] as const;

/**
 * 01 — How it works (P9.5-T3a, new section, rebuilt fully per copy deck
 * v3). `variant="band"` + `surface="tint"` per the IA mapping; band renders
 * full-bleed with no hairline (Section's own rule — its surface change
 * against the hero above and the studio/floor section below is the seam).
 *
 * Each step's glyph reuses `ModuleMark` (the same authored brand mark the
 * eyebrow itself uses) rather than a generic icon-library pictogram or
 * bespoke new iconography — "small, static, authored" is exactly what that
 * glyph already is; the ordinal + step text (not three different pictures)
 * differentiate the three steps.
 */
export function HowItWorksSection() {
  return (
    <Section variant="band" surface="tint">
      <SectionHeading eyebrow="How it works" index="01" title="Three steps, then it's printed." />

      <SectionBody className="mt-10 grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-col gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
              <ModuleMark className="size-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
              <p className="mt-1 text-lg font-medium text-foreground">{step}</p>
            </div>
          </div>
        ))}
      </SectionBody>

      <SectionBody delay={0.2} className="mt-8">
        <MonoStrip>kit → codes → print → retarget · no reprints, ever</MonoStrip>
      </SectionBody>
    </Section>
  );
}
