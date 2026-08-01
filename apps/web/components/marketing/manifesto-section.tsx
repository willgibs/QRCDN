import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * 10 — Manifesto (P9.5-T3c, new section). "Centered band" per the spec:
 * `variant="centered"` is what actually triggers the real centering CSS
 * (globals.css's `[data-variant="centered"]` rule targets SectionHeading
 * specifically) — `variant="band"` alone would NOT center anything (its
 * only special-cased behavior in section.tsx is forcing divider="none").
 * The "band" look (tinted, full-bleed, no hairline) comes from
 * `surface="tint"` + explicit `divider="none"` instead, composed on top of
 * `variant="centered"` rather than choosing between the two. This section
 * is typography only: no plot, no table, no icon grid — three short
 * commitments and an infra strip, generous air.
 */
const COMMITMENTS = [
  { claim: "Free codes are never deactivated.", cite: "pricing policy, in the terms" },
  { claim: "A downgrade makes codes read-only, never dead.", cite: "D14, in the terms" },
  {
    claim: "Redirects run at the edge, independent of our app and database.",
    cite: "architecture, in the open",
  },
] as const;

export function ManifestoSection() {
  return (
    <Section variant="centered" surface="tint" divider="none" rhythm="air">
      <SectionHeading eyebrow="Manifesto" index="10" title="Your code never dies." />

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-6">
          {COMMITMENTS.map((commitment) => (
            <div key={commitment.claim} className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-lg text-foreground">{commitment.claim}</p>
              <p className="font-mono text-xs text-muted-foreground">{commitment.cite}</p>
            </div>
          ))}
        </div>

        <MonoStrip>
          302 + no-store, never 301 · KV in front of Postgres · retarget propagates instantly, ≤ 5
          min worst case · raw IPs never stored
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
