"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { ModuleMark } from "@/components/brand/magic";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavAuthLink, NavAuthCta } from "@/components/marketing/nav-auth-slot";
import { cn } from "@/lib/utils";

// The 4 feature pages (P9.5-T-F1/T-F2), same set the landing's own doorway
// links and the footer's Product column point at — one array, no
// hand-copied second list.
const FEATURE_LINKS = [
  { href: "/features/dynamic-codes", label: "Dynamic codes" },
  { href: "/features/brand-studio", label: "Brand studio" },
  { href: "/features/analytics", label: "Analytics" },
  { href: "/features/access-controls", label: "Access controls" },
] as const;

// "API" renamed to "Docs" (P9.5-T-R deck) — same /developers destination,
// unchanged: the page itself is the API reference, "Docs" just reads more
// like a nav label a visitor recognizes on sight. "Blog" is new
// (P9.5-T-R); "Pricing" is unchanged.
const NAV_LINKS = [
  // P9.8-B4: the studio is public (anonymous static codes) — the tool
  // itself joins the nav, first, because it is the product's best pitch.
  { href: "/studio", label: "Studio" },
  { href: "/developers", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

/**
 * Marketing site header (P9-U1; nav evolution at P9.5-T-R) — sticky,
 * AppNav's proven idiom (components/app/app-nav.tsx: sticky top-0 z-40
 * border-b bg-background/85 backdrop-blur-md) but at the marketing measure
 * (max-w-6xl, not the app shell's max-w-[1600px]). Real hrefs only — every
 * link here, including all 4 Features items, points at a page that exists
 * today (an `href="#"` placeholder would be a defect, the standing
 * SiteNav/SiteFooter rule since P9-U1).
 *
 * "use client" for `usePathname` (active-link state) and the mobile
 * disclosure's local `open` state — same reasoning AppNav documents
 * (layouts don't re-render on client-side nav and have no pathname access).
 *
 * Desktop: Features is a dropdown (the vendored Radix `DropdownMenu`,
 * already used elsewhere in the app, e.g. studio/codes-list.tsx's row
 * actions menu) over the 4 feature pages; Docs/Pricing/Blog stay plain
 * links, same active-state treatment as before. Mobile: the disclosure
 * mirrors the exact same 7 items FLAT (deck's own instruction) — the 4
 * feature links first, a hairline, then Docs/Pricing/Blog — no nested
 * menu, since a submenu inside an already-open sheet is one interaction
 * layer too many on a touch device.
 *
 * Mobile: the wordmark and "Start free" CTA stay visible unconditionally —
 * the spec's "keep it simple and honest" mandate rules out drawer/overlay
 * menu machinery. Only the quiet text links collapse behind a disclosure,
 * reusing pricing-pair.tsx's `FaqItem` grid-rows technique (transitions.dev
 * "Accordion expand" pattern) rather than a new one: `grid-template-rows`
 * 0fr->1fr on token-driven duration/easing, with
 * `motion-reduce:transition-none`. The Menu/X icon itself swaps instantly
 * (no morph, no crossfade) — a rare, binary state change some people never
 * see, and animating a two-icon swap that runs at most once per visit adds
 * motion without a purpose the emil-design-eng framework would recognize.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const featuresActive = pathname.startsWith("/features/");

  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight"
        >
          <ModuleMark tone="brand" className="size-3.5" />
          QRCDN
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-current={featuresActive ? "page" : undefined}
                className={cn(linkClass(featuresActive), "flex items-center gap-1")}
              >
                Features
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {FEATURE_LINKS.map(({ href, label }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href}>{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {label}
              </Link>
            );
          })}
          <NavAuthLink className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground" />
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <NavAuthCta />
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
        // `inert` when closed (P9.5-T-R, React 19 supports it as a plain
        // DOM prop): the grid-rows collapse technique below needs this
        // wrapper's content to stay mounted at all times for the height
        // transition to animate, but "still in the DOM" is not the same as
        // "should be reachable." Without `inert`, a closed disclosure's
        // links stayed keyboard-tabbable (a real WAI-ARIA violation —
        // aria-hidden alone is documented as insufficient when a hidden
        // container has focusable descendants) AND stayed in the
        // accessibility tree Playwright's getByText/getByRole query,
        // which collided with same-named page content elsewhere ("Analytics"
        // as both a feature-nav label and a pricing-table column header,
        // caught by e2e). `inert` is the single browser-native primitive
        // that removes both problems at once: no accessibility-tree
        // presence, no focus, no pointer interaction, while leaving the
        // element fully mounted (and thus animatable) in the DOM.
        inert={!open}
        className="grid transition-[grid-template-rows] duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none sm:hidden"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <nav aria-label="Primary" className="flex flex-col border-t border-border/60 px-6 py-2">
            {FEATURE_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <div aria-hidden className="my-1.5 border-t border-border/60" />
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
            <NavAuthLink
              className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
              onNavigate={() => setOpen(false)}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
