import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModuleMark } from "@/components/brand/magic";

/**
 * The signed-out studio's top bar (P9.8-B4). Shell classes are copied from
 * AppNav VERBATIM (components/app/app-nav.tsx) — not shared, copied — so the
 * bar renders at AppNav's exact measured height (57px), which
 * preview-stage.tsx's sticky `top-[89px]` offset is numerically pinned to.
 * If AppNav's shell padding ever changes, change this in the same commit or
 * the anonymous studio's sticky preview drifts.
 *
 * Deliberately minimal: a wordmark home link and the two auth affordances.
 * The marketing SiteNav (features dropdown, blog, pricing) would be wrong
 * here — a person who searched "free qr generator" landed on a tool, not a
 * brochure, and the tool is the pitch.
 */
export function StudioPublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight"
        >
          <ModuleMark tone="brand" className="size-3.5" />
          QRCDN
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
