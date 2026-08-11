import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/magic";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { RetargetPlate } from "@/components/marketing/retarget-stage";
import { StateCards } from "@/components/marketing/state-cards";
import { ClosingSection } from "@/components/marketing/closing-section";
import { FeatureHero } from "@/components/marketing/features/feature-hero";
import { FaqList } from "@/components/marketing/features/faq-list";
import { AddressLayersDiagram } from "@/components/marketing/features/address-layers-diagram";
import { PRICING_ROWS, type PricingRow } from "@/lib/pricing";

// /features/dynamic-codes (P9.5-T-F1) — the first of two feature-depth
// pages that COMPOSE the landing's already-proven section-04 components
// (RetargetPlate, StateCards) with page-depth copy from the T-F chunk-1
// deck, rather than inventing a new visual system. Every deck string below
// is verbatim-locked; the only invented copy is the FAQ block's own small
// heading (the deck gives 5 Q&A pairs but no section head for the block
// itself) — flagged in the implementer's report as a spec-adjacent
// judgment call, the same class of gap-fill /pricing's own FAQ aside
// ("Before you pick a plan.") already set precedent for.
//
// Static route, no data fetching, no dynamic APIs — renders `○ (Static)`
// in `next build` output, same as every other marketing page.
export const metadata: Metadata = {
  title: "Dynamic codes",
  description:
    "A QRCDN code is a permanent short address you control. Retarget it in seconds and the printed code never changes: paused, protected, or expired, it always resolves somewhere.",
};

/** S5's honest plans-and-limits table — every number/capability string is
 *  the exact `PRICING_ROWS` value /pricing itself renders (lib/pricing.ts,
 *  itself derived from PLAN_LIMITS only), not re-derived a second way. The
 *  one row with no PlanLimits field behind it ("Retargets") is a product
 *  policy fact (D14: retargeting is unconditionally unlimited on both
 *  plans, never a numeric cap), not an entitlement number, so it's the one
 *  static pair here rather than a `lib/pricing.ts` import. */
function pricingRow(key: PricingRow["key"]): PricingRow {
  const row = PRICING_ROWS.find((r) => r.key === key);
  if (!row) throw new Error(`pricing.ts: no PRICING_ROWS entry for "${key}"`);
  return row;
}

const dynamicCodesRow = pricingRow("dynamicCodes");
const accessControlsRow = pricingRow("accessControls");
const apiRow = pricingRow("apiMonthlyRequests");

const PLAN_ROWS: { label: string; free: string; pro: string }[] = [
  { label: dynamicCodesRow.label, free: dynamicCodesRow.free, pro: dynamicCodesRow.pro },
  { label: "Retargets", free: "Unlimited", pro: "Unlimited" },
  { label: accessControlsRow.label, free: accessControlsRow.free, pro: accessControlsRow.pro },
  { label: apiRow.label, free: apiRow.free, pro: apiRow.pro },
];

const FAQ_ITEMS = [
  {
    q: "What happens to my codes if I stop paying?",
    a: "They pause growth, not print: existing codes keep redirecting and become read-only. This is policy and it is in the terms, not just marketing.",
  },
  {
    q: "How fast is a retarget?",
    a: "The redirect layer picks up changes immediately in the common case; the hard ceiling is five minutes of edge cache, and we publish that number instead of pretending it is zero.",
  },
  {
    q: "Can a printed code ever die?",
    a: "Not by our hand. Free codes are never deactivated. If we ever shut down, the source is MIT-licensed and the path off is public.",
  },
  {
    q: "What is the difference between static and dynamic codes?",
    a: "A static code encodes your destination directly: free, unlimited, and unchangeable after printing. A dynamic code encodes a QRCDN address so the destination stays editable.",
  },
  {
    q: "Do dynamic codes work without JavaScript, apps, or a special scanner?",
    a: "Yes. A scan is a plain HTTP redirect: any camera app that can open a link can follow it.",
  },
] as const;

export default function DynamicCodesFeaturePage() {
  return (
    <>
      <FeatureHero
        eyebrow="Dynamic codes"
        title="Repoint anything you have printed"
        lede="A QRCDN code is a permanent short address with a destination you control: print it once, repoint it in seconds, and the printed thing never goes stale."
        mono="302 + no-store, never 301 · retarget live in seconds · ≤ 5 min worst case"
      />

      {/* S1 — One address, two layers. */}
      <Section variant="split">
        <SectionHeading
          title="One address, two layers"
          lede="The printed code encodes a permanent QRCDN address. The destination is a database row you can change. Scanners always travel address first, destination second, so the print never has to know where it ends up."
          className="mb-10"
        />
        <SectionBody className="flex justify-center">
          <AddressLayersDiagram />
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex justify-center">
          <MonoStrip>printed: qrcdn.com/K7M2X9A · live: wherever you point it</MonoStrip>
        </SectionBody>
      </Section>

      {/* S2 — Retarget it yourself, right here. RetargetPlate reused
          as-is; its own caption ("the printed code never changes") is
          already part of the component, per the deck's own note. */}
      <Section variant="showcase" surface="tint" divider="none">
        <SectionHeading title="Retarget it yourself, right here" className="mb-10" />
        <SectionBody>
          <RetargetPlate />
        </SectionBody>
      </Section>

      {/* S3 — Every state is a safe state. StateCards reused as-is, with
          the additive `layout="grid"` prop (see state-cards.tsx) so three
          cards read as a full-width row instead of the landing's narrow
          sidebar stack. */}
      <Section variant="split" divider="none">
        <SectionHeading
          title="Every state is a safe state"
          lede="Paused codes park visitors on a neutral page. Password-protected codes ask before they forward. Expired codes stop forwarding but keep resolving. Nothing ever 404s because you changed your mind."
          className="mb-10"
        />
        <SectionBody>
          <StateCards layout="grid" />
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex justify-center">
          <MonoStrip>
            paused · protected · expired: printed codes always resolve somewhere
          </MonoStrip>
        </SectionBody>
      </Section>

      {/* S4 — The floor is the promise. Band/tint guarantee strip, same
          register /pricing's own guarantee band already established. */}
      <Section variant="band" surface="tint">
        <SectionBody className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>Guarantee</Eyebrow>
          <h2 className="max-w-2xl text-h3 font-display font-semibold text-foreground">
            The floor is the promise
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Downgrading from Pro pauses growth, never print: your codes go read-only and keep
            redirecting. Free codes are never deactivated.
          </p>
          <MonoStrip>
            <span className="text-foreground">your code never dies</span>: free codes are never
            deactivated, and a downgrade never breaks a printed code.
          </MonoStrip>
          <p className="text-xs text-muted-foreground">
            The exact policy lives in{" "}
            <Link href="/terms" className="text-foreground underline-offset-4 hover:underline">
              the terms
            </Link>
            , in plain language.
          </p>
        </SectionBody>
      </Section>

      {/* S5 — Plans and limits. Stack, honest table, no drama: plain text
          values, no marketing check-glyphs. */}
      <Section variant="stack" divider="none">
        <SectionHeading title="What each plan holds" className="mb-10" />
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

      {/* S6 — FAQ. Split: a short invented micro-heading (not deck text —
          the deck gives 5 Q&A pairs but no section head) beside the
          answers, mirroring /pricing's own split-FAQ grid. Same "default"
          surface as S5 above it, so this keeps Section's default hairline
          divider rather than overriding to "none" (hairline-only-between-
          same-surface-neighbors, the Section system's own rule). */}
      <Section variant="split">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <SectionBody className="flex flex-col gap-4">
            <SectionHeading eyebrow="Questions" title="Before you print" reveal={false} />
          </SectionBody>
          <SectionBody delay={0.15}>
            <FaqList items={FAQ_ITEMS} />
          </SectionBody>
        </div>
      </Section>

      {/* Closing CTA. This used to render with zero props, relying on
          ClosingSection's default head being verbatim identical to the
          landing's. P9.7-V1 broke that coincidence: the landing now closes
          with "Create your first code in minutes." Passing this page's own
          head explicitly means the two surfaces can never again move each
          other by accident, which is what a shared default quietly does. */}
      <ClosingSection title="Print something that can change its mind" />
    </>
  );
}
