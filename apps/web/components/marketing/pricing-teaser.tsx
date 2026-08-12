import type { ComponentProps } from "react";
import Link from "next/link";
import {
  BarChart3,
  Code2,
  FileSignature,
  Infinity as InfinityIcon,
  Layers,
  Link2,
  Lock,
  MapPin,
  MessageSquare,
  Palette,
  Repeat,
  Server,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { ANNUAL_MONTHLY_EQUIV_USD, ANNUAL_SAVINGS_PCT, ANNUAL_USD } from "@/lib/pricing";

/**
 * 13 — Pricing (rebuilt at P9.10-D7 on the board's reference).
 *
 * WHAT IT REPLACED, and why. Measured on production at 1440 before the
 * round designed anything: the card grid was `max-w-3xl` inside a 1,088px
 * measure, leaving 352px of the section empty against the dead-measure
 * ban `section.tsx`'s own doc comment opens with; "Start free" appeared
 * three times in the page's last 1,366px; and the Pro card offered the
 * same words and the same href as the free card while its own footnote
 * said checkout was not open, so the column that looked premium was the
 * one nobody could buy. It also carried the landing's last violet-era
 * chrome: `from-primary/45` and `shadow-primary/15`, both authored when
 * --primary was violet and both rendering WHITE since the D13 monochrome
 * amendment.
 *
 * THE SHAPE is the board's pick at the D7 R2 review: three columns with
 * the recommended plan featured, then a full-length row beneath. Free,
 * Pro, Enterprise. Ordinals and the heading ladder still come from
 * `page.tsx` (P9.7-V1 / P9.9-C0).
 *
 * THREE DISTINCT ACTIONS, which is the part that fixes the old defect
 * rather than restyling it. Free starts free. Pro cannot be bought today,
 * so its featured button goes to the full comparison instead of
 * pretending to sell — and the card says plainly that starting free now
 * carries over. Enterprise opens a conversation. The page's ending now
 * carries exactly one "Start free" outside the closing.
 *
 * Every number is read from `entitlements.ts` / `pricing.ts` (CLAUDE.md
 * hard rule); nothing below is a retyped literal.
 */

type Feature = { icon: LucideIcon; label: string; note?: string };

const FREE_FEATURES: Feature[] = [
  { icon: InfinityIcon, label: "Unlimited static codes" },
  { icon: Repeat, label: `${PLAN_LIMITS.free.dynamicCodes} dynamic codes, retarget any time` },
  { icon: Palette, label: `${PLAN_LIMITS.free.brandKits} brand kits` },
  { icon: BarChart3, label: `${PLAN_LIMITS.free.analyticsRetentionDays}-day scan analytics` },
];

const PRO_FEATURES: Feature[] = [
  {
    icon: Layers,
    label: `${PLAN_LIMITS.pro.dynamicCodes.toLocaleString("en-US")} dynamic codes`,
  },
  { icon: Sparkles, label: "Unlimited brand kits" },
  {
    icon: MapPin,
    label: `${PLAN_LIMITS.pro.analyticsRetentionDays}-day analytics, city-level geo`,
  },
  {
    icon: Code2,
    label: `API access, ${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString("en-US")} calls a month`,
  },
  { icon: Link2, label: "Vanity short links and bulk generation" },
  { icon: Lock, label: "Expiry and password protection" },
];

/**
 * Enterprise is a CONVERSATION, not a plan, and the list says only things
 * we can actually do today. There is no SSO, no SLA, no dedicated support
 * engineer and no SOC 2, so none of them appear: inventing an enterprise
 * feature list is exactly what the honesty lock exists to stop, and
 * "enterprise security" reads as a compliance claim whether or not it is
 * meant as one.
 *
 * What survives is true. Volume past the cap is a negotiation we would
 * genuinely have. Self-hosting the redirect Worker is real and already
 * claimed in section 11 (MIT, the whole redirect path is in the public
 * repo). Custom terms "on request" describes a discussion rather than
 * promising an outcome. And a direct line is simply what a team this size
 * is: /pricing already tells readers that hello@qrcdn.com "reaches a
 * person, not a form."
 */
const ENTERPRISE_FEATURES: Feature[] = [
  { icon: TrendingUp, label: "Volume past the Pro cap" },
  { icon: Server, label: "Self-host the redirect worker, MIT" },
  { icon: FileSignature, label: "Custom terms on request" },
  { icon: MessageSquare, label: "A direct line to the people who built it" },
];

function FeatureList({ features, inherits }: { features: Feature[]; inherits?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      {inherits && <p className="text-sm text-muted-foreground">{inherits}</p>}
      {features.map(({ icon: Icon, label }) => (
        <p key={label} className="flex items-start gap-3 text-sm">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{label}</span>
        </p>
      ))}
    </div>
  );
}

export function PricingTeaser({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section divider="none">
      <SectionHeading
        eyebrow="Pricing"
        index={index}
        title="Start free, pay when you print at scale"
        lede={`$0 gets ${PLAN_LIMITS.free.dynamicCodes} dynamic codes that never stop redirecting. Nothing here expires and nothing switches off.`}
        titleSize={titleSize}
        className="mb-12"
      />

      {/* Equal-height columns: every card is a flex column whose feature
          list flexes, so the three CTAs land on one line however uneven
          the lists are. */}
      <SectionBody className="grid items-stretch gap-6 lg:grid-cols-3">
        {/* ── Free ───────────────────────────────────────────────────── */}
        <div className="lit-stroke flex flex-col gap-6 rounded-2xl bg-card/40 p-7">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-2xl font-semibold">Free</h3>
                <p className="text-sm text-muted-foreground">Your first printed codes</p>
              </div>
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                forever
              </span>
            </div>
            <div className="border-t border-border/60 pt-5">
              <p className="font-display text-3xl font-bold">
                $0<span className="text-sm font-normal text-muted-foreground"> per month</span>
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 border-t border-border/60 pt-6">
            <FeatureList features={FREE_FEATURES} />
            <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-full">
              <Link href="/login">Start free</Link>
            </Button>
          </div>
        </div>

        {/* ── Pro, the featured plate ─────────────────────────────────
            `.aurora-plate` is the aurora family's still frame: two soft
            pockets of tint in the ground and a hairline sweeping four of
            the five hues. Static on purpose — a kiss is a moment, not a
            texture, and the animated one belongs to the closing's ask a
            few hundred pixels below. It replaces `from-primary/45`, which
            had quietly become a white gradient the day --primary stopped
            being violet. */}
        <div className="aurora-plate flex flex-col gap-6 rounded-2xl p-7">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-2xl font-semibold">Pro</h3>
                <p className="text-sm text-muted-foreground">Print runs that grow</p>
              </div>
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                annual
              </span>
            </div>
            <div className="border-t border-white/12 pt-5">
              <p className="font-display text-3xl font-bold">
                ${ANNUAL_MONTHLY_EQUIV_USD}
                <span className="text-sm font-normal text-muted-foreground"> per month</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                billed annually ${ANNUAL_USD}/yr · save {ANNUAL_SAVINGS_PCT}%
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 border-t border-white/12 pt-6">
            <FeatureList features={PRO_FEATURES} inherits="Everything in Free, plus:" />
            <div className="flex flex-col gap-2.5">
              <Button asChild size="lg" className="h-11 w-full rounded-full">
                <Link href="/pricing">See everything in Pro</Link>
              </Button>
              <p className="text-center font-mono text-[11px] text-muted-foreground">
                checkout opens at launch, start free today
              </p>
            </div>
          </div>
        </div>

        {/* ── Enterprise ─────────────────────────────────────────────── */}
        <div className="lit-stroke flex flex-col gap-6 rounded-2xl bg-card/40 p-7">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-2xl font-semibold">Enterprise</h3>
                <p className="text-sm text-muted-foreground">Print at institutional scale</p>
              </div>
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                custom
              </span>
            </div>
            {/* No number, and no fake one. The price line holds the same
                slot the other two cards use so the three tops align, and
                the sub-line does the work Pro's billing line does. */}
            <div className="border-t border-border/60 pt-5">
              <p className="font-display text-3xl font-bold">Let&apos;s talk</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                priced to what you print
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 border-t border-border/60 pt-6">
            <FeatureList features={ENTERPRISE_FEATURES} inherits="Everything in Pro, plus:" />
            <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-full">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </SectionBody>

      {/* The full-length row under the cards: the reference's shape, used
          here for the question the three columns cannot answer between
          them. Real destination — /contact exists (built in this same
          round), no placeholder href, matching the "real hrefs only" rule
          SiteNav and SiteFooter already hold. */}
      <div className="lit-stroke mt-6 flex flex-col gap-5 rounded-2xl bg-card/40 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Not sure which plan fits?</span> Tell us
          what you are printing and how many people will scan it, and we will tell you which one
          you actually need.
        </p>
        <Button asChild variant="secondary" className="h-9 shrink-0 rounded-full px-5">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </Section>
  );
}
