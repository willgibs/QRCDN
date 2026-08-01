import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { KitContactSheet } from "@/components/marketing/kit-contact-sheet";
import { Playground } from "@/components/marketing/playground";
import { GuardrailsPlot } from "@/components/marketing/guardrails-plot";
import { ClosingSection } from "@/components/marketing/closing-section";
import { FeatureHero } from "@/components/marketing/features/feature-hero";
import { FaqList } from "@/components/marketing/features/faq-list";
import { PRICING_ROWS, type PricingRow } from "@/lib/pricing";

// /features/brand-studio (P9.5-T-F2) — the third feature-depth page,
// composing the landing's proven section-02/03/05 components
// (Playground, KitContactSheet, GuardrailsPlot) with page-depth copy from
// the T-F chunk-2 deck. See /features/dynamic-codes' own header comment
// (P9.5-T-F1) for the shared reasoning this chunk continues: verbatim deck
// strings outside truth-gate variants, static route, one invented
// micro-heading for the FAQ block the deck leaves unheaded.
//
// TRUTH-GATE G1 (does the studio block export on an instrument FAIL, or
// only warn?) resolved to the warn-only variant, proven against the real
// export path, not assumed: `components/studio/studio-shell.tsx`'s
// `handleExportSvg`/`handleExportPng` call `downloadBlob`/
// `rasterizeSvgToPng` directly with no gate on `report` (the live
// `scannabilityReport` result), and `components/studio/controls-rail.tsx`'s
// Export section only ever disables its Download buttons while
// `exporting !== null` — never on scannability state. `ScannabilityChip`
// (components/studio/scannability-chip.tsx) is a read-only instrument: it
// renders issues, it never disables anything. S3's lede below reflects
// this exactly ("warns before you export, while you decide").
//
// Static route, no data fetching, no dynamic APIs — renders `○ (Static)`
// in `next build` output, same as every other marketing page. The only
// client island on this page is `Playground` (via its additive `embedded`
// prop, see that file's own doc comment), already shipped and already
// bundled for the landing — zero new client JS.
export const metadata: Metadata = {
  title: "Brand studio",
  description:
    "A full QR design system: module shapes, eye frames, ink, gradients, and logo knockout, checked live by a scannability instrument calibrated on real decode campaigns.",
};

/** S4's honest plans-and-limits table — brandKits/dynamicCodes read the
 *  exact `PRICING_ROWS` values /pricing itself renders (lib/pricing.ts,
 *  itself derived from PLAN_LIMITS only), not re-derived a second way.
 *  "Static codes" and "Export formats" have no `PlanLimits` field behind
 *  them (D14: static codes and SVG/PNG export are unconditionally
 *  unlimited on both plans, never a numeric cap) — the same "one static
 *  pair for a policy fact, not an entitlement number" precedent
 *  /features/dynamic-codes' own "Retargets" row already set. */
function pricingRow(key: PricingRow["key"]): PricingRow {
  const row = PRICING_ROWS.find((r) => r.key === key);
  if (!row) throw new Error(`pricing.ts: no PRICING_ROWS entry for "${key}"`);
  return row;
}

const brandKitsRow = pricingRow("brandKits");
const dynamicCodesRow = pricingRow("dynamicCodes");

const PLAN_ROWS: { label: string; free: string; pro: string }[] = [
  { label: brandKitsRow.label, free: brandKitsRow.free, pro: brandKitsRow.pro },
  { label: "Static codes", free: "Unlimited", pro: "Unlimited" },
  { label: "Export formats", free: "SVG + PNG", pro: "SVG + PNG" },
  { label: dynamicCodesRow.label, free: dynamicCodesRow.free, pro: dynamicCodesRow.pro },
];

const FAQ_ITEMS = [
  {
    q: "Can a logo break my code?",
    a: "Not silently. Logo knockout is bounded by the same thresholds the campaigns produced; the instrument reacts the moment a combination gets risky.",
  },
  {
    q: "What sizes can I print?",
    a: "Any size your printer resolves cleanly. The studio's preview shows module counts, and simpler payloads make sturdier codes: short QRCDN addresses keep the grid coarse on purpose.",
  },
  {
    q: "What formats can I export?",
    a: "SVG and PNG today. SVG is resolution-independent and what we recommend handing a printer.",
  },
  {
    q: "Can I render codes with my own stack?",
    a: (
      <>
        Yes. The engine is MIT-licensed and deterministic: the same style object produces the
        same SVG anywhere.{" "}
        <Link href="/#open-source" className="text-foreground underline-offset-4 hover:underline">
          See the source
        </Link>
        .
      </>
    ),
  },
] as const;

export default function BrandStudioFeaturePage() {
  return (
    <>
      <FeatureHero
        eyebrow="Brand studio"
        title="Design the code itself."
        lede="A real design system for QR: module shapes, eye frames, ink, and logo knockout, all watched by a scannability instrument calibrated on real decode campaigns."
        mono="SVG + PNG export · instrument: live · engine: open source"
      />

      {/* S1 — One kit, every artifact. KitContactSheet reused as-is. */}
      <Section variant="split">
        <SectionHeading
          title="One kit, every artifact."
          lede="Set ink, paper, shapes, and logo once as a kit. Every code you mint inherits it, and every re-render is identical forever: the style is frozen into the code at mint."
          className="mb-10"
        />
        <SectionBody className="max-w-5xl">
          <KitContactSheet />
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex justify-center">
          <MonoStrip>style frozen per code at mint · re-renders identical forever</MonoStrip>
        </SectionBody>
      </Section>

      {/* S2 — Try it, no account. The exact Playground island the landing
          runs, in its `embedded` shape (see playground.tsx's own doc
          comment): this page supplies its own heading instead of
          Playground's landing-specific one, and the closing doorway link
          is dropped automatically (a page can't doorway-link to itself). */}
      <Section variant="showcase" surface="floor" divider="none">
        <SectionHeading
          title="Try it, no account."
          lede="The exact engine and instrument from the studio, running on this page. Design something, download it, print it: static codes are free forever."
          className="mb-10"
        />
        <Playground embedded />
      </Section>

      {/* S3 — The instrument says no before your printer does. GuardrailsPlot
          reused as-is. TRUTH-GATE G1: warn-only variant, see file header. */}
      <Section variant="split" divider="none">
        <SectionHeading
          title="The instrument says no before your printer does."
          lede="Every control is bounded by decode-campaign data. When a combination risks the scan, the studio warns before you export, while you decide."
          className="mb-10"
        />
        <SectionBody className="max-w-4xl">
          <GuardrailsPlot />
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-3">
          <MonoStrip>160+ style combinations · 2 adversarial decode campaigns</MonoStrip>
        </SectionBody>
      </Section>

      {/* S4 — Plans and limits. Stack, honest table, no drama. */}
      <Section variant="stack">
        <SectionHeading title="What each plan holds." className="mb-10" />
        <SectionBody className="max-w-2xl overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Plan holds</th>
                <th className="py-2 pr-4 font-medium">Free</th>
                <th className="py-2 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-4 text-foreground">{row.label}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.free}</td>
                  <td className="py-3 text-muted-foreground">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionBody>
        <SectionBody delay={0.15} className="mt-6">
          <LearnMoreLink href="/pricing">Every number, on the pricing page</LearnMoreLink>
        </SectionBody>
      </Section>

      {/* S5 — FAQ. Split: a short invented micro-heading (not deck text —
          the deck gives 4 Q&A pairs but no section head), same judgment-call
          precedent /features/dynamic-codes' own "Before you print." set. */}
      <Section variant="split">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <SectionBody className="flex flex-col gap-4">
            <SectionHeading eyebrow="Questions" title="Before you export." reveal={false} />
          </SectionBody>
          <SectionBody delay={0.15}>
            <FaqList items={FAQ_ITEMS} />
          </SectionBody>
        </div>
      </Section>

      {/* Closing CTA — deck head, evergreen lede/button/mono. */}
      <ClosingSection title="Design a code worth printing." />
    </>
  );
}
