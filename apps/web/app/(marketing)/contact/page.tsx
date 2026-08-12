import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { CONTACT_EMAIL, contactMailto } from "@/lib/contact";

// Declared locally, matching site-footer.tsx / open-source-section.tsx /
// developers/page.tsx rather than importing a shared constant: the footer
// records the reason (those components are page-scoped and the URL is a
// one-line literal), and this page follows the established pattern instead
// of introducing a fourth convention for it.
const REPO_URL = "https://github.com/willgibs/QRCDN";

/**
 * /contact (P9.10-D7). Built because section 13's Enterprise column and
 * its full-length row both needed a real destination, and the site's
 * standing rule is real hrefs only: every link in SiteNav and SiteFooter
 * resolves to a page that exists or a file in the public repo, never an
 * `href="#"` placeholder.
 *
 * IT IS NOT A FORM, and that is a decision rather than a shortcut. A form
 * needs an endpoint, somewhere for the messages to land, and bot
 * protection on a public marketing page; none of those exist today, and a
 * form that silently drops mail is worse than an address that works.
 * /pricing already tells readers `hello@qrcdn.com` "reaches a person, not
 * a form" — this page makes that the whole design instead of a footnote.
 *
 * The routes below are one address with four subject lines, stated
 * honestly as such. Pre-filling `?subject=` is the only routing we have,
 * so the page says what each is for rather than implying separate desks
 * or separate teams.
 *
 * NO RESPONSE-TIME PROMISE anywhere on this page. We have no support SLA
 * to point at and no measured first-reply time to quote, so the honest
 * version is what the page says: a small team, a real inbox, and the
 * status page for anything that looks like an outage.
 */
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach a person, not a form. One address for questions about plans, printing at scale, security disclosure, and anything that looks broken.",
};

const ROUTES = [
  {
    subject: "Plans and pricing",
    body: `Which plan fits what you are printing, what happens past the ${PLAN_LIMITS.pro.dynamicCodes.toLocaleString("en-US")}-code Pro cap, and anything about billing.`,
  },
  {
    subject: "Printing at scale",
    body: "Volume past the Pro cap, self-hosting the redirect worker, or terms of your own. Tell us what you are printing and how many people will scan it.",
  },
  {
    subject: "Security disclosure",
    body: "Found something? Write to us before you publish it. The same address section 11 lists, and the repo's SECURITY.md has the details.",
  },
  {
    subject: "Something looks broken",
    body: "A code that will not scan, a redirect that misbehaves, an export that came out wrong. Include the short URL if you have one.",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <Section variant="centered" rhythm="air" divider="none">
        <SectionHeading
          eyebrow="Contact"
          titleAs="h1"
          // Short on purpose. The longer version of this line ("Reaches a
          // person, not a form", /pricing's own phrasing) wrapped at the
          // display scale and left "a form" alone on its own line.
          title="A person, not a form"
          lede="We are a small team and this is a real inbox. Say what you are printing and we can usually tell you exactly which plan you need."
          reveal={false}
        />

        <SectionBody delay={0.15} className="mt-9 flex flex-col items-center gap-4">
          <Button asChild size="lg" className="h-12 rounded-full px-7 text-base">
            <a href={contactMailto("Hello")}>{CONTACT_EMAIL}</a>
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            or just reply to any mail we have sent you
          </p>
        </SectionBody>
      </Section>

      <Section surface="tint" divider="none">
        <SectionHeading
          eyebrow="What to write about"
          title="One address, four subject lines"
          lede="There is no ticket queue behind this and no separate desks. Picking a subject just gets your mail read in the right frame of mind."
        />

        <SectionBody delay={0.1} className="mt-10 grid gap-5 sm:grid-cols-2">
          {ROUTES.map((route) => (
            <a
              key={route.subject}
              href={contactMailto(route.subject)}
              className="lit-stroke group/route flex flex-col gap-2 rounded-2xl bg-card/40 p-6 transition-colors hover:bg-card/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <p className="font-display text-base font-semibold">{route.subject}</p>
              <p className="text-sm text-muted-foreground">{route.body}</p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground group-hover/route:text-foreground">
                {CONTACT_EMAIL} →
              </p>
            </a>
          ))}
        </SectionBody>
      </Section>

      <Section divider="none" rhythm="air">
        <SectionHeading
          eyebrow="Before you write"
          title="Some answers are already published"
          lede="Not to deflect you. These are just faster than waiting for us."
        />

        <SectionBody delay={0.1} className="mt-10 flex flex-col gap-8">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="font-display text-base font-semibold">Every plan number</p>
              <p className="text-sm text-muted-foreground">
                The full comparison sheet, with each limit spelled out.
              </p>
              <Link
                href="/pricing"
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                See pricing
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-display text-base font-semibold">How the redirect works</p>
              <p className="text-sm text-muted-foreground">
                The worker, the schema and the engine are all in the open.
              </p>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                Read the source
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-display text-base font-semibold">Whether it is just you</p>
              <p className="text-sm text-muted-foreground">
                Live status for the redirect path and the app.
              </p>
              <a
                href="https://status.qrcdn.com"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                Check status
              </a>
            </div>
          </div>

          <MonoStrip>
            <span className="text-foreground">your code never dies</span>: scan redirects run on
            Cloudflare, independent of this site. If the app is down, printed codes keep
            redirecting.
          </MonoStrip>
        </SectionBody>
      </Section>
    </>
  );
}
