import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * Shared hero for the /features/* pages (P9.5-T-F1). Deliberately NOT the
 * landing's own `Hero` (components/marketing/hero.tsx) — that component is
 * a bespoke top-of-funnel artifact (ScanNetwork/OrbitStage backdrop,
 * `hero-enter` CSS keyframes tied to its own specific headline, AccentText,
 * PillarStrip) and isn't in this unit's reuse list. A feature page's hero is
 * a plainer, `Section`-built page-title block instead: centered/air, the
 * same primitives every other section on the site composes from
 * (Section/SectionHeading/MonoStrip), reused true rather than forked from
 * Hero's much more specific machinery.
 *
 * `titleAs="h1"` — this IS the one true page-title context for these pages
 * (same reasoning /pricing's and /developers' own h1 already establish).
 * `reveal={false}` on the heading for the same LCP-class reason /pricing's
 * poster head and the landing's own hero h1 both needed it (P9.5-T1a/T5):
 * `SectionHeading` defaults to a scroll-triggered `Reveal`, which SSRs a
 * static `opacity:0` on whatever it wraps — fine below the fold, wrong for
 * an above-the-fold h1 that's very likely the page's LCP candidate.
 *
 * Both CTAs are real, already-shipped destinations (/login, /developers) —
 * no placeholder hrefs. Button copy/styling matches the site's other
 * "Start free" primary pills (ClosingSection, PricingTeaser) and the
 * landing hero's own "See the API" ghost secondary, not the landing hero's
 * special arrow-in-circle primary treatment (that flourish is reserved for
 * the one true top-of-funnel moment).
 */
export function FeatureHero({
  eyebrow,
  title,
  lede,
  mono,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  mono: string;
}) {
  return (
    <Section variant="centered" rhythm="air" divider="none">
      <SectionHeading eyebrow={eyebrow} titleAs="h1" title={title} lede={lede} reveal={false} />

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-center gap-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25"
          >
            <Link href="/login">Start free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-base text-muted-foreground hover:text-foreground"
          >
            <Link href="/developers">See the API</Link>
          </Button>
        </div>

        <MonoStrip icon={false}>{mono}</MonoStrip>
      </SectionBody>
    </Section>
  );
}
