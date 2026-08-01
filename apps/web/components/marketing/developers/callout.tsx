import type { ReactNode } from "react";

/**
 * Small inline callout (P9.5-T5) for framing a piece of API behavior as a
 * deliberate design choice rather than a limitation. First use: the
 * 404-indistinguishability property in the shared Errors section. Plainer
 * than `LegalCallout`'s glass gradient-border card (legal-shell.tsx) on
 * purpose: that treatment is a marketing-register full section; this is one
 * paragraph inside an already-plain docs reading column (see
 * `developers/section.tsx`'s own doc comment on why this page stays
 * understated).
 */
export function Callout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/[0.04] px-4 py-3.5">
      <p className="font-mono text-eyebrow font-semibold uppercase text-primary">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
