import type { Metadata } from "next";
import {
  LegalCallout,
  LegalCrossLink,
  LegalInlineCode,
  LegalSection,
  LegalShell,
  LegalToc,
} from "@/components/marketing/legal-shell";
import { PLAN_LIMITS, PRICING } from "@/lib/entitlements";

// Title/description only — file-based opengraph-image.png (+ .alt.txt, the
// shared legal variant from scripts/generate-brand-images.ts) owns the
// imagery; Next's metadata merge is shallow, so a page-level `openGraph`
// key would replace the root layout's whole object rather than extend it.
export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Plain terms: free codes are never deactivated, downgrades never delete a printed code, and the only kill switch is malicious use.",
};

// Content source: CEO draft, docs/guides/p9-marketing.md's U4 section.
// Substance, claims, and voice are verbatim; only typographic form
// (heading levels, list-vs-paragraph, internal cross-reference links) was
// adjusted. [COUNSEL: ...] markers from the draft are carried as adjacent
// JSX comments at the exact spot they annotate — they must never render;
// the served-HTML grep in this unit's verification pass confirms it.
// Plan numbers render from entitlements.ts (hard rule) — never retyped.

const TOC_ITEMS = [
  { id: "the-service", label: "The service" },
  { id: "your-account", label: "Your account" },
  { id: "the-promise-precisely", label: "The promise, precisely" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "plans-and-payment", label: "Plans and payment" },
  { id: "your-content", label: "Your content" },
  { id: "honesty-about-availability", label: "Honesty about availability" },
  { id: "ending-things", label: "Ending things" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
] as const;

export default function TermsPage() {
  return (
    <LegalShell eyebrow="Legal" title="Terms of Service" lastUpdated="July 30, 2026">
      <LegalSection id="the-short-version" title="The short version" lede>
        <p>
          You make QR codes; they&apos;re yours. Printed codes keep working: we cap
          features, never your codes. Don&apos;t point codes at anything malicious;
          that&apos;s the one thing that gets a code stopped.
        </p>
      </LegalSection>

      <LegalToc items={TOC_ITEMS} />

      <LegalSection id="the-service" title="The service">
        <p>
          QRCDN gives you a brand style system, a QR generator, dynamic codes on
          persistent short URLs (<LegalInlineCode>qrcdn.com/YOURCODE</LegalInlineCode>),
          scan analytics, and an API. &quot;Dynamic&quot; means the printed code points at a
          short URL we host, and you can change its destination at any time without
          reprinting.
        </p>
      </LegalSection>

      <LegalSection id="your-account" title="Your account">
        <p>
          Keep your sign-in email accurate; it&apos;s how we reach you. You&apos;re
          responsible for what happens under your account and for every destination
          your codes point to. One person (or one team acting as one) per account.
        </p>
      </LegalSection>

      <LegalCallout id="the-promise-precisely" title="The promise, precisely">
        <p>
          &quot;Your code never dies&quot; is a design commitment, and here is its exact
          shape:
        </p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong className="font-semibold text-foreground">
              Free codes are never deactivated.
            </strong>{" "}
            The free tier includes {PLAN_LIMITS.free.dynamicCodes} dynamic codes,
            forever, with unlimited scans and retargeting always allowed.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Downgrading never breaks a printed code.
            </strong>{" "}
            If you leave Pro, codes beyond the free limit become read-only: you
            can&apos;t edit them, but they keep redirecting to wherever they last
            pointed. We never delete them and never stop serving them.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Deleting your account is the exception, and it&apos;s yours to make.
            </strong>{" "}
            Account deletion permanently removes your codes, and they stop
            redirecting. We don&apos;t do partial deletions on your behalf.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              The malicious-use carve-out is the only kill switch we hold.
            </strong>{" "}
            See <a href="#acceptable-use" className="underline underline-offset-4">Acceptable use</a>.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>
          Don&apos;t point a QRCDN code at malware, phishing, deceptive or
          impersonating pages, or anything illegal to distribute. We screen
          destination changes against industry threat lists and may pause a code
          (meaning scanners see a neutral &quot;code unavailable&quot; page instead of the
          destination) when a destination endangers the people scanning it. This is
          the only circumstance in which we stop a redirect, and if it happens we
          notify the account email. Don&apos;t abuse the API beyond your plan&apos;s limits
          or attempt to disrupt the service.
        </p>
      </LegalSection>

      <LegalSection id="plans-and-payment" title="Plans and payment">
        <p>
          The free tier is described on the{" "}
          <a href="/pricing" className="underline underline-offset-4">
            pricing page
          </a>{" "}
          and is genuinely free. Pro is ${PRICING.monthlyUsd}/month or $
          {PRICING.annualUsd}/year. Paid checkout opens at launch; until then
          everything you can reach is free to use.
        </p>
        <p>
          When billing is live: it&apos;s handled by Stripe, you can cancel any time
          and keep Pro until the end of the paid period, and if we ever change
          prices, existing subscribers get notice before renewal at a new price. If
          something went wrong with a charge,{" "}
          <a href="mailto:hello@qrcdn.com" className="underline underline-offset-4">
            write to us
          </a>
          . We&apos;re reasonable.
          {/* COUNSEL: refund policy formalization. */}
        </p>
      </LegalSection>

      <LegalSection id="your-content" title="Your content">
        <p>
          Logos, styles, and destinations you upload or configure remain yours. You
          give us the license needed to render, store, and serve them: that&apos;s
          all we do with them.
        </p>
      </LegalSection>

      <LegalSection id="honesty-about-availability" title="Honesty about availability">
        <p>
          Scan redirects are engineered to keep working even when our application or
          database is down: the redirect layer is independent and designed to fail
          toward serving your code. We target high availability but don&apos;t yet
          offer a contractual SLA. The service is provided &quot;as is&quot;; to the extent
          the law allows, our total liability is capped at what you&apos;ve paid us in
          the twelve months before a claim.
          {/* COUNSEL: warranty/liability phrasing per jurisdiction. */}
        </p>
      </LegalSection>

      <LegalSection id="ending-things" title="Ending things">
        <p>
          You can stop using QRCDN or delete your account at any time. We can
          suspend accounts that violate{" "}
          <a href="#acceptable-use" className="underline underline-offset-4">
            Acceptable use
          </a>
          ; for anything short of active harm we&apos;ll warn first.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          If these terms change materially, account holders get an email before the
          change takes effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          <a href="mailto:hello@qrcdn.com" className="underline underline-offset-4">
            hello@qrcdn.com
          </a>
          {/* COUNSEL: governing law + venue (entity pending); arbitration stance; entity name once formed. */}
        </p>
      </LegalSection>

      <LegalCrossLink href="/privacy" label="Read the Privacy Policy" />
    </LegalShell>
  );
}
