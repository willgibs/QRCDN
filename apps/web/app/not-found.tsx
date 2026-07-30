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
// Design register matches app/u/[slug]/page.tsx (the "floor register"):
// HeroBackdrop atmosphere, glass gradient-border card, a mono receipt line,
// a single CTA home. No data fetching, no dynamic APIs — this renders
// statically.

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
        <HeroBackdrop />

        <div className="relative flex w-full max-w-sm flex-col items-center">
          <div className="w-full rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 text-center backdrop-blur-xl sm:p-9">
              <div className="mb-6 flex flex-col gap-1.5">
                <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  This page doesn&apos;t exist.
                </h1>
                <p className="text-sm text-muted-foreground">
                  The link may be broken, or the page has moved.
                </p>
              </div>

              <p className="mb-6 font-mono text-[11px] text-muted-foreground/70">
                404 — not found
              </p>

              <Button asChild className="w-full">
                <Link href="/">Back to QRCDN</Link>
              </Button>
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
