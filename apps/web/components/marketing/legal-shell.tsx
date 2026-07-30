import type { ReactNode } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/magic";
import { cn } from "@/lib/utils";

/**
 * Shared prose scaffolding for /terms and /privacy (P9-U4) — the "floor
 * register" long-form pages. A measured ~65ch reading column, mono
 * uppercase section headings that double as the linkable anchors
 * (e.g. /privacy#if-you-scan-a-code), and the glass gradient-border card
 * already established by app/not-found.tsx / app/u/[slug]/page.tsx, reused
 * here (not reinvented) for the two sections the phase spec calls out for
 * extra presence: privacy's "The short version" and terms' "The promise,
 * precisely".
 *
 * No motion beyond the sitewide plain color-transition hover idiom already
 * used by SiteNav/SiteFooter links (`transition-colors duration-(--duration-fast)
 * ease-(--motion-ease-out)`) — nothing here is an entrance, a reveal, or a
 * JS-driven interaction, so the review-animations gate does not apply.
 */

export function LegalShell({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[65ch] px-6 py-16 sm:py-20">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 font-mono text-xs text-muted-foreground">Last updated: {lastUpdated}</p>

      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </div>
  );
}

/** Slim wayfinding strip — a single thin bordered row of wrapped mono
 *  links, not a boxed sidebar nav. Earns its place at this page length
 *  (9-10 sections) but stays deliberately quiet: small type, muted color,
 *  no active-section tracking or scroll-spy JS. */
export function LegalToc({ items }: { items: readonly { id: string; label: string }[] }) {
  return (
    <nav aria-label="Sections" className="border-y border-border/60 py-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Standard clause section: a mono uppercase heading (the "eyebrow style"
 *  anchor the spec calls for) that IS the h2, id-addressable, separated
 *  from the previous section by a hairline rule. `lede` drops the rule/
 *  padding and steps the body copy up to lede size — used once per page,
 *  for the opening "short version" paragraph that isn't promoted to a full
 *  LegalCallout. */
export function LegalSection({
  id,
  title,
  lede = false,
  children,
}: {
  id: string;
  title: string;
  lede?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", !lede && "border-t border-border/60 pt-10")}>
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
        {title}
      </h2>
      <div
        className={cn(
          "mt-4 flex flex-col gap-4 leading-relaxed",
          lede ? "text-base text-foreground sm:text-lg" : "text-[15px] text-muted-foreground",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** The register's glass gradient-border card (app/not-found.tsx,
 *  app/u/[slug]/page.tsx), reused for the one section per page the spec
 *  singles out for extra care — presence without carnival, not a new
 *  visual language. No top rule: the card frames itself. */
export function LegalCallout({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/10">
        <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {title}
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/85">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Inline technical accent — qrcdn.com/YOURCODE, etc. Mirrors
 *  app/developers/page.tsx's local InlineCode exactly (same classes) so
 *  the mono-accent register matches across every long-form static page. */
export function LegalInlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

/** Bottom-of-document cross-link to the sibling legal page. */
export function LegalCrossLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="border-t border-border/60 pt-8">
      <Link
        href={href}
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
      >
        {label} →
      </Link>
    </div>
  );
}
