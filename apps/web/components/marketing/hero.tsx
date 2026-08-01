import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { AccentText } from "@/components/brand/accent-text";
import { ScanNetwork } from "./scan-network";
import { PillarStrip } from "./pillar-strip";

/**
 * Landing hero (P9-U2, rebuilt v4 at P9.5-T3a) — the v4.2 hero bones
 * (docs/guides/design-system.md's codified quality floor), harvested-for-
 * pattern into the marketing tree. The inline nav row from
 * components/explore/hero.tsx is dropped entirely: `SiteNav` (mounted by
 * app/(marketing)/layout.tsx) replaces it, and the explore nav's links
 * were dead anyway.
 *
 * P9.5-T3a: copy is the board-locked v4 recipe (copy deck v3's HERO
 * block, round 3/final notes) — no eyebrow, "The modern" / "QR platform."
 * two-line H1 with `AccentText` on line two, and a rewritten sub. H1/sub
 * now render at the fluid `text-display`/`text-lede` scale (globals.css's
 * type-bump amendment) instead of static Tailwind breakpoint classes, so
 * `text-display`'s own paired line-height/letter-spacing supersede the
 * old hand-tuned `leading-[1.05] tracking-tighter`. The pillar strip
 * (`./pillar-strip.tsx`) closes the hero as a fourth staggered element.
 *
 * P9.5-T1a: the h1/sub/CTA row entrance moved off `Reveal` (motion/react
 * `whileInView`) onto the plain-CSS `hero-enter` utility (globals.css,
 * beside `qr-flow`). `Reveal`'s SSR markup ships `opacity:0` on whatever it
 * wraps — fine for below-the-fold sections that only need to look right
 * once an IntersectionObserver fires, wrong for the h1, which is the LCP
 * candidate: a slow or absent hydration left it invisible at first paint.
 * `hero-enter` is pure CSS (`animation-fill-mode: backwards` + staggered
 * `animation-delay` classes), so it runs the instant the stylesheet loads,
 * no JS required, and the served HTML never carries a static `opacity:0`
 * anywhere on or above the h1. `ScanNetwork` keeps its own (below-the-fold,
 * client-island) entrance untouched; `HeroBackdrop` is presentational and
 * renders straight from the server.
 *
 * Board round 5 (folded into P9.5-T3b): the accent line's trailing period
 * ("QR platform." → "QR platform") is dropped as a copy call, and the
 * pillar strip is hidden below `md` (it was pushing `ScanNetwork`/
 * `OrbitStage` down, and the board wants the orbit stage higher above the
 * fold on mobile) — unchanged at `md` and up. See `qr-tile.tsx` and
 * `destination-hues.ts` for this same round's other two fixes (QR fill
 * ratio; iOS Safari color-mix/SVG-paint hardening for the orbit's active
 * chip), both shared by every stage this component renders.
 */
export function Hero() {
  return (
    <header className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-16 text-center sm:pt-20 lg:pt-24">
        <h1 className="hero-enter hero-enter-1 font-display text-display font-semibold text-foreground text-balance">
          <span className="block">The modern</span>
          <span className="block">
            <AccentText>QR platform</AccentText>
          </span>
        </h1>

        <p className="hero-enter hero-enter-2 max-w-xl text-lede text-muted-foreground">
          The full stack behind a printed code: brand studio, links that
          never die, scan analytics, and an API. Open source, MIT.
        </p>

        <div className="hero-enter hero-enter-3 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="group h-12 gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-base shadow-lg shadow-primary/25"
          >
            <Link href="/login">
              Start building
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-200 ease-(--motion-ease-out) group-hover:translate-x-0.5">
                <ArrowRight className="size-4" />
              </span>
            </Link>
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

        {/* Board round 5: hidden below md — it was pushing the orbit stage
            down, and the board wants the orbit higher above the fold on
            mobile. Unchanged at md and up (own stagger step, same as
            before). */}
        <div className="hero-enter hero-enter-4 hidden w-full max-w-lg md:block">
          <PillarStrip />
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-8 sm:pt-10">
        <ScanNetwork />
      </div>
    </header>
  );
}
