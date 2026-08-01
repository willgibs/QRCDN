import type { Metadata } from "next";
import {
  LegalCallout,
  LegalCrossLink,
  LegalSection,
  LegalShell,
  LegalToc,
} from "@/components/marketing/legal-shell";
import { PLAN_LIMITS } from "@/lib/entitlements";

// Title/description only — file-based opengraph-image.png (+ .alt.txt, the
// shared legal variant from scripts/generate-brand-images.ts) owns the
// imagery; Next's metadata merge is shallow, so a page-level `openGraph`
// key would replace the root layout's whole object rather than extend it.
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How QRCDN handles data: a one-way hash of your IP with a daily-rotating salt, never a raw IP, coarse edge-level geo, and a strict no-sale policy.",
};

// Content source: CEO draft, docs/guides/p9-marketing.md's U4 section.
// Substance, claims, and voice are verbatim; only typographic form
// (heading levels, list-vs-paragraph, internal cross-reference links) was
// adjusted. [COUNSEL: ...] markers from the draft are carried as adjacent
// JSX comments at the exact spot they annotate — they must never render;
// the served-HTML grep in this unit's verification pass confirms it.
// Retention windows render from entitlements.ts (hard rule) — never retyped.

const TOC_ITEMS = [
  { id: "who-this-covers", label: "Who this covers" },
  { id: "if-you-hold-an-account", label: "If you hold an account" },
  { id: "if-you-scan-a-code", label: "If you scan a code" },
  { id: "cookies", label: "Cookies" },
  { id: "who-processes-data-for-us", label: "Who processes data for us" },
  { id: "your-rights", label: "Your rights" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
] as const;

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy" lastUpdated="July 30, 2026">
      <LegalCallout id="the-short-version" title="The short version">
        <p>
          We designed QRCDN to know as little as possible. Scan analytics never
          store a raw IP address: we keep a one-way hash made with a salt that
          changes every day, so scans can&apos;t be traced to a person or even
          correlated across days. We can&apos;t sell what we don&apos;t have.
        </p>
      </LegalCallout>

      <LegalToc items={TOC_ITEMS} />

      <LegalSection id="who-this-covers" title="Who this covers">
        <p>
          Two kinds of people interact with QRCDN:{" "}
          <strong className="font-semibold text-foreground">account holders</strong>{" "}
          (you sign up and make QR codes) and{" "}
          <strong className="font-semibold text-foreground">scanners</strong> (you
          point a camera at a code someone printed). This policy covers both,
          separately, because we treat them differently.
        </p>
      </LegalSection>

      <LegalSection id="if-you-hold-an-account" title="If you hold an account">
        <p>We collect what the product needs to work:</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong className="font-semibold text-foreground">
              Your email address
            </strong>
            , to sign you in (magic link) and send you service email. If you sign
            in with Google, we receive your name and email from your Google
            profile. Nothing else.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              What you create
            </strong>
            : brand kits, styles, dynamic codes, their destinations, and any logo
            you upload.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Payment details never touch our servers.
            </strong>{" "}
            When paid billing opens, it will be handled by Stripe; we store only
            your subscription status.
          </li>
        </ul>
        <p>We never sell this data, and we never use it for advertising.</p>
      </LegalSection>

      <LegalSection id="if-you-scan-a-code" title="If you scan a code">
        <p>This is the part most QR platforms bury. Here is everything a scan records:</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>The code that was scanned, and when.</li>
          <li>
            Coarse location (country, region, and city) derived at the network
            edge. Never GPS, never precise.
          </li>
          <li>
            A device category (phone, tablet, desktop) parsed from your
            browser&apos;s user-agent string.
          </li>
          <li>The referring page, if your browser sent one.</li>
          <li>
            A one-way hash of your IP address, computed with a salt that rotates
            daily.{" "}
            <strong className="font-semibold text-foreground">
              Your raw IP address is never written to our database.
            </strong>{" "}
            The rotating salt means the same phone scanning on Tuesday and
            Wednesday produces two unrelated hashes: we can count unique
            visitors within a day, and nothing more.
          </li>
        </ul>
        <p>
          Raw scan events are kept for {PLAN_LIMITS.free.analyticsRetentionDays}{" "}
          days (codes owned by free accounts) or{" "}
          {PLAN_LIMITS.pro.analyticsRetentionDays}{" "}
          days (Pro), then deleted on a daily schedule. Aggregate daily counts
          (how many scans a code got, by country, by device type) persist so the
          code&apos;s owner keeps their totals.
        </p>
        <p>Scanning a code sets no cookie and requires no account.</p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <p>
          Signing in sets authentication cookies (via Supabase, our auth
          provider). That&apos;s what keeps you logged in. There are no
          advertising or cross-site tracking cookies anywhere on this site. Our
          visitor analytics (Vercel Web Analytics) is cookieless and identifies
          visits with a hash that resets daily.
        </p>
      </LegalSection>

      <LegalSection id="who-processes-data-for-us" title="Who processes data for us">
        <p>
          We run on a small set of infrastructure providers, each processing data
          only to provide the service:{" "}
          <strong className="font-semibold text-foreground">Vercel</strong>{" "}
          (application hosting, visitor analytics),{" "}
          <strong className="font-semibold text-foreground">Supabase</strong>{" "}
          (database and authentication),{" "}
          <strong className="font-semibold text-foreground">Cloudflare</strong>{" "}
          (network, scan redirects),{" "}
          <strong className="font-semibold text-foreground">Resend</strong>{" "}
          (transactional email), and, once billing opens,{" "}
          <strong className="font-semibold text-foreground">Stripe</strong>{" "}
          (payments). Application data is stored in the United States
          (us-east-1). Backups are encrypted.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          You can export what you&apos;ve made (your codes and styles are yours),
          and you can delete your account at any time from within the product or
          by{" "}
          <a href="mailto:hello@qrcdn.com" className="underline underline-offset-4">
            writing to us
          </a>
          . Deletion is immediate and cascades: your codes, kits, keys, and their
          scan history are permanently removed.
          {/* COUNSEL: GDPR/CCPA rights enumeration and lawful-basis mapping before launch; current text is accurate but not jurisdiction-complete. */}
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          QRCDN is not directed at children under 13, and we don&apos;t knowingly
          collect their data.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          If this policy changes in a way that matters, account holders get an
          email before it takes effect. The date at the top is always current.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          <a href="mailto:hello@qrcdn.com" className="underline underline-offset-4">
            hello@qrcdn.com
          </a>
          : a person reads it.
          {/* COUNSEL: entity name + registered address once formed; international transfer mechanism language for EU visitors. */}
        </p>
      </LegalSection>

      <LegalCrossLink href="/terms" label="Read the Terms of Service" />
    </LegalShell>
  );
}
