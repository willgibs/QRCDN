import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { LearnMoreLink } from "./learn-more-link";
import { parseQrStyle } from "@qrcdn/shared";
import { renderPreview } from "@/lib/preview";

/**
 * Landing hero, P9.10-D1 "the floating run" (board-picked V2 from the D1
 * R3 exploration, claude.ai/code/artifact/a68b2ad0-adb5-45d2-aebe-5f33dc0c70e9).
 * The v4 copy recipe stands untouched — "The modern" / "QR platform" over
 * the lede — but everything below it is new:
 *
 * - The CTA row is replaced by the page's highest-intent moment: a real
 *   URL form carrying the aurora edge (the marketing kiss; the hero is
 *   one of at most 1-in-3 sections that ever gets it). Submitting lands
 *   on /studio with the typed URL seeded into the payload field
 *   (app/studio/page.tsx reads ?url=), so the input does exactly what it
 *   says. "See the API"'s job moved to the quiet LearnMoreLink beneath.
 * - ScanNetwork/OrbitStage retire from this surface (feature heroes still
 *   compose them). The artwork is now three REAL engine renders — the
 *   same certified pairs the C2 instrument scored at 100 (espresso
 *   #131316, cobalt #1e3a8a, teal #0f766e on white) — dealt out as a fan
 *   of floating print mats over a steady aurora under-glow. QR solidity
 *   rule: no hand-authored patterns, ever; these are renderPreview()
 *   output, server-rendered, deterministic.
 * - The load is choreographed (globals.css hero-stage / hero-fan-out):
 *   a beat of dark field, claim, sub, input arriving unlit, the run
 *   rising as one stack and springing open, the beam igniting, the glow
 *   blooming last. Pure CSS mount animations in the hero-enter tradition:
 *   backwards fill only, so served markup never carries opacity:0 (the
 *   whole-document e2e sweep) and the h1 stays the honest LCP candidate.
 * - Hover breathes the outside mats out on the extracted card-stack
 *   spring pair; reduced motion gets a still, fully-visible hero.
 */

const HERO_PAYLOAD = "HTTPS://WWW.QRCDN.COM";

function matSvg(dot: "square" | "rounded" | "circle", sizeRatio: number, eyeFrame: string, eyePupil: string, ink: string): string {
  const style = parseQrStyle({
    v: 1,
    dots: { style: dot, sizeRatio },
    eyes: { frame: eyeFrame, pupil: eyePupil, color: null },
    fill: { type: "solid", color: ink },
    background: { transparent: false, color: "#ffffff" },
  });
  return renderPreview(HERO_PAYLOAD, style).svg;
}

const HERO_MATS = [
  { cls: "hero-mat-1", svg: matSvg("square", 1, "square", "square", "#1e3a8a") },
  { cls: "hero-mat-2", svg: matSvg("rounded", 0.88, "rounded", "rounded", "#131316") },
  { cls: "hero-mat-3", svg: matSvg("circle", 0.78, "circle", "dot", "#0f766e") },
] as const;

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-16 text-center sm:pt-20 lg:pt-24">
        <h1 className="hero-stage hero-stage-1 font-display text-display font-semibold text-foreground text-balance">
          <span className="block">The modern</span>
          <span className="block">QR platform</span>
        </h1>

        <p className="hero-stage hero-stage-2 max-w-xl text-lede text-muted-foreground">
          The full stack behind a printed code: brand studio, links that
          never die, scan analytics, and an API. Open source, MIT.
        </p>

        <div className="hero-stage hero-stage-3 flex w-full flex-col items-center gap-4">
          <form action="/studio" method="get" className="hero-input aurora-edge aurora-breathe">
            <span aria-hidden className="font-mono text-sm text-muted-foreground">
              @
            </span>
            <input
              type="url"
              name="url"
              placeholder="https://your-link.com"
              aria-label="Destination URL for your first code"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" size="sm" className="rounded-[9px] px-3.5">
              Make it
            </Button>
          </form>
          <LearnMoreLink href="/developers">Read the API docs</LearnMoreLink>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-12">
        <div aria-hidden className="hero-fan-zone">
          <div className="hero-fan">
            <div className="hero-glow" />
            {HERO_MATS.map((mat) => (
              <div key={mat.cls} className={`hero-mat ${mat.cls}`}>
                {/* deterministic server-rendered engine SVG, same pattern as
                    comparison-section's decor mats */}
                <div className="hero-paper" dangerouslySetInnerHTML={{ __html: mat.svg }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
