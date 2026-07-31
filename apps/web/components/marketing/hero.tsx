import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { AccentText } from "@/components/brand/accent-text";
import { ScanNetwork } from "./scan-network";

/**
 * Landing hero (P9-U2) — the v4.2 hero bones (docs/guides/design-system.md's
 * codified quality floor), harvested-for-pattern into the marketing tree.
 * The inline nav row from components/explore/hero.tsx is dropped entirely:
 * `SiteNav` (mounted by app/(marketing)/layout.tsx) replaces it, and the
 * explore nav's links were dead anyway.
 *
 * Headline/sub/CTA copy is the locked v4.2 canon (docs/guides/p9-landing
 * copy deck) rendered verbatim — not read from lib/explore.ts's brandCopy,
 * which is superseded by this hardcoded copy and slated for deletion at
 * P9-U5. `AccentText` (built for P9, previously unused) goes on "Every
 * destination" per the copy deck; the trailing period is folded into the
 * gradient span rather than kept as a separate solid-`text-primary` glyph
 * (the v4.2 original's treatment) so the accent reads as one smooth ramp
 * with no color seam at the very end.
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
 */
export function Hero() {
  return (
    <header className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-16 text-center sm:pt-20 lg:pt-24">
        <h1 className="hero-enter hero-enter-1 font-display text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-6xl lg:text-7xl">
          <span className="block">One code.</span>
          <span className="block">
            <AccentText>Every destination.</AccentText>
          </span>
        </h1>

        <p className="hero-enter hero-enter-2 max-w-xl text-base text-muted-foreground sm:text-lg">
          Set your brand&apos;s QR identity once. Every code inherits it —
          served from the edge, retargetable forever, measured to the scan.
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
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-8 sm:pt-10">
        <ScanNetwork />
      </div>
    </header>
  );
}
