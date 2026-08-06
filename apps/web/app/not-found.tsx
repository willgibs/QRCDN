import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Page not found",
};

// Root-level 404 (Next 16 file convention: app/not-found.tsx). Route-group
// layouts do NOT wrap this file, so the marketing chrome is composed
// directly here rather than inherited from app/(marketing)/layout.tsx.
//
// Next auto-injects a noindex response on 404s, so no `robots` override
// belongs in the metadata above — adding one would be redundant at best.
//
// P9.5-T4 realignment: display-scale "404" glyph (the h1 — text-display,
// the same poster scale /pricing's own h1 now uses) + one line of copy +
// two links (home, support). Zero client JS of its own: SiteNav/SiteFooter
// are pre-existing sitewide chrome (already client islands on every
// marketing page), not something this unit adds; Button/Link/the mailto
// anchor below are all plain server-rendered markup, no new interactivity.
// Design register otherwise matches app/u/[slug]/page.tsx (the "floor
// register"): HeroBackdrop atmosphere, glass gradient-border card, a mono
// sign-off. No data fetching, no dynamic APIs — this renders statically.

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
        <HeroBackdrop />

        <div className="relative flex w-full max-w-sm flex-col items-center">
          <div className="w-full rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 text-center backdrop-blur-xl sm:p-9">
              <h1 className="font-display text-display font-bold tracking-tight text-foreground">
                404
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                This page doesn&apos;t exist, or the link is broken.
              </p>

              <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href="/">Back home</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href="mailto:hello@qrcdn.com">Contact support</a>
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-8 font-mono text-xs text-muted-foreground">
            your code never dies
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
