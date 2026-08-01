import type { Metadata } from "next";
import { Eyebrow } from "@/components/brand/magic";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { StateCards } from "@/components/marketing/state-cards";
import { ClosingSection } from "@/components/marketing/closing-section";
import { FeatureHero } from "@/components/marketing/features/feature-hero";
import { FaqList } from "@/components/marketing/features/faq-list";
import { PRICING_ROWS, type PricingRow } from "@/lib/pricing";

// /features/access-controls (P9.5-T-F2) — the fourth feature-depth page,
// composing the landing's section-04 `StateCards` (via its additive `only`
// prop, one card per section) with page-depth copy from the T-F chunk-2
// deck. See /features/dynamic-codes' own header comment (P9.5-T-F1) for
// the shared reasoning this chunk continues.
//
// TRUTH-GATE G2 (where is the password checked, and is the destination
// absent from the gate's HTML?) resolved to variant A, proven against
// three files: `workers/redirect/src/responses.ts`'s
// `scanRedirectToPasswordWall` only ever redirects to `/p/{slug}` — it
// never sees or checks a password. `app/p/[slug]/actions.ts`'s
// `verifyCodeAccess` is a `"use server"` action (runs on the server, never
// shipped to the client) that calls `verifyCodePassword`
// (`lib/passwords.ts`, scrypt) — the actual comparison happens server-side,
// not at the edge and never in browser JS. `app/p/[slug]/page.tsx` fetches
// `destination_url` but never renders it into the gate's JSX in the
// protected-and-unexpired branch (the only branch where the gate form
// actually shows) — it's referenced solely in two branches that redirect
// AWAY before the gate ever renders. S1's mono line below is the deck's
// variant-A text, shipped verbatim.
//
// TRUTH-GATE G3 (vanity slug rules) read from `lib/slug.ts`: `SLUG_CHARSET`
// (30 symbols, digits 2-9 + A-Z minus I/L/O/U), 4-30 chars
// (`validateVanitySlug`/`isValidSlug`), case-insensitive input normalized
// to uppercase, and the `RESERVED_SLUGS` blocklist. S3 below states exactly
// this, no more.
//
// TRUTH-GATE G4 (can an expired code be revived by editing expiry?) read
// from `lib/codes-core.ts`'s `setCodeAccessCore` + `lib/validation.ts`'s
// `parseExpiresAt` (`null` explicitly clears `expires_at`; past dates are
// "deliberately accepted... not a mistake to reject") and
// `lib/access.ts`'s `isCodeExpired`/`codeState` (purely derived from the
// LIVE `expires_at` value every time — no separate "this code died once"
// flag exists anywhere in the schema). Answer: yes, immediately, by design.
// S2's lede and S6's third FAQ answer both reflect this.
//
// DEVIATION (flagged, not silent): the deck's S2 lede and hero lede both
// use the phrase "schedule its start" / list "scheduling" as a shipped
// control. No such feature exists — verified by grep across
// `supabase/migrations` (qr_codes has `expires_at` and `password_hash`
// only, no `starts_at`/`scheduled_at` column), `code-access-dialog.tsx`
// (exposes only "Expires" + "Password" inputs), and `lib/api-reference.ts`
// (the public API's PATCH surface has no scheduling field either). Per the
// task's own directive ("a claim you cannot prove does not ship"), both
// ledes below drop the scheduling clause and describe only the real expiry
// capability; `lib/pricing.ts`'s pre-existing "Expiry, password &
// scheduling" row label carries the same imprecision but is a shared,
// already-shipped `/pricing` surface out of this chunk's scope to edit —
// S5's table below overrides that one row's LABEL text locally (its
// free/pro VALUES are still read unchanged from `PRICING_ROWS`) rather
// than perpetuating the claim on a new page.
//
// Static route, no data fetching, no dynamic APIs — renders `○ (Static)`
// in `next build` output. Zero client JS: StateCards has no "use client"
// and no hooks.
export const metadata: Metadata = {
  title: "Access controls",
  description:
    "Passwords, expiry, pause, and vanity slugs: the controls that sit on a QRCDN code's address, changeable any time without touching what's already printed.",
};

/** S5's honest plans-and-limits table. `vanitySlugs`/`bulk` read the exact
 *  `PRICING_ROWS` values /pricing itself renders. The `accessControls` row
 *  keeps its real free/pro VALUES from `PRICING_ROWS` but overrides the
 *  LABEL — see the file header's DEVIATION note for why ("scheduling" isn't
 *  a real, shipped capability). "Pause / resume" has no `PlanLimits` field
 *  behind it: `setCodePausedCore` (lib/codes-core.ts) has no plan gate at
 *  all, matching D14's "retargeting always allowed, never deactivated"
 *  framing, so it's a static Included/Included pair, the same "policy
 *  fact, not an entitlement number" precedent /features/dynamic-codes' own
 *  "Retargets" row set. */
function pricingRow(key: PricingRow["key"]): PricingRow {
  const row = PRICING_ROWS.find((r) => r.key === key);
  if (!row) throw new Error(`pricing.ts: no PRICING_ROWS entry for "${key}"`);
  return row;
}

const accessControlsRow = pricingRow("accessControls");
const vanitySlugsRow = pricingRow("vanitySlugs");
const bulkRow = pricingRow("bulk");

const PLAN_ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Expiry & password", free: accessControlsRow.free, pro: accessControlsRow.pro },
  { label: vanitySlugsRow.label, free: vanitySlugsRow.free, pro: vanitySlugsRow.pro },
  { label: "Pause / resume", free: "Included", pro: "Included" },
  { label: bulkRow.label, free: bulkRow.free, pro: bulkRow.pro },
];

const FAQ_ITEMS = [
  {
    q: "What if someone forgets the password?",
    a: "You own the code: change or remove the password any time and the printed code follows instantly.",
  },
  {
    q: "Do controls slow the scan down?",
    a: "No perceptible cost: the redirect decision happens in the same lookup that routes the scan.",
  },
  {
    q: "Can an expired code come back?",
    a: "Yes. Clear or extend its expiry and the code picks up exactly where it left off, password and all.",
  },
  {
    q: "Do gated scans still count in analytics?",
    a: "Yes. A scan is logged the instant it happens, gated or not; whether a visitor typed the password correctly afterward is the one thing that lookup can't tell you.",
  },
] as const;

export default function AccessControlsFeaturePage() {
  return (
    <>
      <FeatureHero
        eyebrow="Access controls"
        title="Decide who gets through."
        lede="Passwords, expiry, pause, and vanity slugs: the controls around a code's destination, changed any time without touching the print."
        mono="controls live on the address, not the print"
      />

      {/* S1 — Gate it. StateCards' password card only, via the additive
          `only` prop. TRUTH-GATE G2: variant A, see file header. */}
      <Section variant="split">
        <SectionHeading
          title="Gate it."
          lede="Add a password and scanners meet a gate before they forward."
          className="mb-10"
        />
        <SectionBody className="flex justify-center">
          <div className="w-full max-w-sm">
            <StateCards only="password" />
          </div>
        </SectionBody>
        <SectionBody delay={0.15} className="mt-8 flex justify-center">
          <MonoStrip icon={false}>
            password checked server-side · destination never in the gate&apos;s HTML
          </MonoStrip>
        </SectionBody>
      </Section>

      {/* S2 — Time-box it. StateCards' expired dashboard row only.
          TRUTH-GATE G4 + the "schedule its start" deviation, see file
          header. */}
      <Section variant="split">
        <SectionHeading
          title="Time-box it."
          lede="Give a code an end date: set its expiry, and once it passes the code stops forwarding but keeps resolving to a safe page. Clear or extend that expiry and it picks up exactly where it left off, password and all."
          className="mb-10"
        />
        <SectionBody className="flex justify-center">
          <div className="w-full max-w-sm">
            <StateCards only="expired" />
          </div>
        </SectionBody>
      </Section>

      {/* S3 — Name it. Copy-only (the deck names no reused component for
          this one). TRUTH-GATE G3, see file header. */}
      <Section variant="split">
        <SectionHeading
          title="Name it."
          lede="Vanity slugs put your words on the address: qrcdn.com/summer-menu instead of a random handle. Pick 4 to 30 characters from a set that skips the letters and digits a camera misreads: no 0, O, 1, I, L, or U."
          className="mb-10"
        />
        <SectionBody className="flex flex-col items-start gap-3">
          <MonoStrip>4-30 chars · charset skips 0 O 1 I L U · reserved words blocked</MonoStrip>
        </SectionBody>
      </Section>

      {/* S4 — Pause it. Band/tint, deck-04 guarantee mono, verbatim. Same
          Eyebrow+h2 shape /features/dynamic-codes' own guarantee band
          uses, for one consistent "band" register across the site. */}
      <Section variant="band" surface="tint">
        <SectionBody className="flex flex-col items-center gap-6 text-center">
          <Eyebrow>Guarantee</Eyebrow>
          <h2 className="max-w-2xl text-h3 font-display font-semibold text-foreground">Pause it.</h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Pause parks every scanner on a neutral page until you resume. It is a switch, not a
            deletion: nothing is lost, and the print stays honest.
          </p>
          <MonoStrip>
            <span className="text-foreground">your code never dies</span>: free codes are never
            deactivated, and a downgrade never breaks a printed code.
          </MonoStrip>
        </SectionBody>
      </Section>

      {/* S5 — Plans and limits. Stack, honest table, no drama. */}
      <Section variant="stack" divider="none">
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

      {/* S6 — FAQ. Split, same invented-micro-heading pattern as every
          other /features/* page's FAQ block. */}
      <Section variant="split">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <SectionBody className="flex flex-col gap-4">
            <SectionHeading eyebrow="Questions" title="Before you turn it on." reveal={false} />
          </SectionBody>
          <SectionBody delay={0.15}>
            <FaqList items={FAQ_ITEMS} />
          </SectionBody>
        </div>
      </Section>

      {/* Closing CTA — deck head, evergreen lede/button/mono. */}
      <ClosingSection title="Control the door, keep the print." />
    </>
  );
}
