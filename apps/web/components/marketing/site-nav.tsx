"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ModuleMark } from "@/components/brand/magic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/developers", label: "API" },
] as const;

/**
 * Marketing site header (P9-U1) — sticky, AppNav's proven idiom
 * (components/app/app-nav.tsx: sticky top-0 z-40 border-b bg-background/85
 * backdrop-blur-md) but at the marketing measure (max-w-6xl, not the app
 * shell's max-w-[1600px]). Real hrefs only — /pricing doesn't exist until
 * P9-U3 but links to it anyway per the spec (docs/guides/p9-marketing.md's
 * route architecture note); an `href="#"` placeholder would be a defect.
 *
 * "use client" for `usePathname` (active-link state) and the mobile
 * disclosure's local `open` state — same reasoning AppNav documents
 * (layouts don't re-render on client-side nav and have no pathname access).
 *
 * Mobile: the wordmark and "Start free" CTA stay visible unconditionally —
 * the spec's "keep it simple and honest" mandate rules out drawer/overlay
 * menu machinery. Only the quiet text links (Pricing/API/Sign in) collapse
 * behind a disclosure, reusing pricing-pair.tsx's `FaqItem` grid-rows
 * technique (transitions.dev "Accordion expand" pattern) rather than a new
 * one: `grid-template-rows` 0fr->1fr on token-driven duration/easing, with
 * `motion-reduce:transition-none`. The Menu/X icon itself swaps instantly
 * (no morph, no crossfade) — a rare, binary state change some people never
 * see, and animating a two-icon swap that runs at most once per visit adds
 * motion without a purpose the emil-design-eng framework would recognize.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight"
        >
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            Sign in
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm">
            <Link href="/login">Start free</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            aria-expanded={open}
            aria-controls="site-nav-disclosure"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      <div
        id="site-nav-disclosure"
        className="grid transition-[grid-template-rows] duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none sm:hidden"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <nav aria-label="Primary" className="flex flex-col border-t border-border/60 px-6 py-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
