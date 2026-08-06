import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * 10 — Manifesto (P9.5-T3c, new section). "Centered band" per the spec:
 * `variant="centered"` is what actually triggers the real centering CSS
 * (globals.css's `[data-variant="centered"]` rule targets SectionHeading
 * specifically) — `variant="band"` alone would NOT center anything (its
 * only special-cased behavior in section.tsx is forcing divider="none").
 * The "band" look (full-bleed, no hairline) originally came from
 * `surface="tint"` + explicit `divider="none"`, composed on top of
 * `variant="centered"` rather than choosing between the two. P9.9-C0 moves
 * this section onto the page's one inverted plate instead (`surface="ink"`,
 * which already forces `divider="none"` and carries its own load-bearing
 * top/bottom hairline in `--ink-border` — see `Section`'s own doc comment) —
 * a board-approved pairing: the page's one inverted plate carries the one
 * Loud (`text-h1`) heading on the page. This section is typography only: no
 * plot, no table, no icon grid — three short commitments and an infra
 * strip, generous air.
 */
const COMMITMENTS = [
  { claim: "Free codes are never deactivated.", cite: "pricing policy, in the terms" },
  { claim: "A downgrade makes codes read-only, never dead.", cite: "D14, in the terms" },
  {
    claim: "Redirects run at the edge, independent of our app and database.",
    cite: "architecture, in the open",
  },
] as const;

export function ManifestoSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section variant="centered" surface="ink" divider="none" rhythm="air">
      <SectionHeading
        eyebrow="Trust & privacy"
        index={index}
        title="Our lifetime guarantee."
        titleSize={titleSize}
        tone="ink"
      />

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-6">
          {COMMITMENTS.map((commitment) => (
            <div key={commitment.claim} className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-lg text-ink-foreground">{commitment.claim}</p>
              <p className="font-mono text-xs text-ink-muted">{commitment.cite}</p>
            </div>
          ))}
        </div>

        <MonoStrip tone="ink">
          302 + no-store, never 301 · KV in front of Postgres · retarget propagates instantly, ≤ 5
          min worst case · raw IPs never stored
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
