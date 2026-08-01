import type { ReactNode } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/magic";
import { Section } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

/**
 * Shared prose scaffolding for /terms and /privacy (P9-U4; realigned onto
 * the token system at P9.5-T4). `Section` supplies the outer frame (fluid
 * `px-gutter`/`py-section`, replacing the old static `px-6 py-16 sm:py-20`)
 * with a `max-w-prose` (65ch — the SAME reading column this file always
 * used, now the named `--container-prose` token instead of a raw
 * `max-w-[65ch]` arbitrary value) column nested inside it, the same
 * two-level "page frame > content column" nesting `/developers` already
 * established (`max-w-page` > `max-w-docs`). Mono uppercase section
 * headings now ride the shared `text-eyebrow` token (11px + its own
 * 0.2em tracking, bundled) instead of a hand-tuned `text-xs`/
 * `tracking-[0.12em]`/`tracking-[0.15em]` spread across four call sites —
 * `uppercase` stays a separate utility since the type-scale tokens only
 * bundle size/line-height/letter-spacing, never text-transform. The glass
 * gradient-border card already established by app/not-found.tsx /
 * app/u/[slug]/page.tsx is reused (not reinvented) for the two sections the
 * phase spec calls out for extra presence: privacy's "The short version"
 * and terms' "The promise, precisely".
 *
 * Deliberately NOT `SectionHeading`/`SectionBody`: this page's own doc
 * comment always said "no motion beyond the sitewide hover idiom" (no
 * entrance, no reveal), and both of those primitives wrap their children in
 * a scroll-triggered `Reveal` by default. `/developers` sets the same
 * precedent (`PageFrame` for the outer frame, a plain `<h1>`/`<p>` inside
 * it, no `SectionHeading`) — a static reference page's content renders
 * immediately, it doesn't wait for an IntersectionObserver.
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
    <Section rhythm="standard" divider="none">
      <div className="mx-auto max-w-prose">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-h1 font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="mt-10 flex flex-col gap-block">{children}</div>
      </div>
    </Section>
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
              className="font-mono text-eyebrow uppercase text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
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
    <section id={id} className={cn("scroll-mt-24", !lede && "border-t border-border/60 pt-block")}>
      <h2 className="font-mono text-eyebrow font-semibold uppercase text-foreground">
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
          <h2 className="font-mono text-eyebrow font-semibold uppercase text-primary">
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
 *  the mono-accent register matches across every long-form static page.
 *  `text-[0.85em]` stays a relative unit (unlike the fixed-size tokens
 *  above) on purpose — inline code needs to scale with whatever paragraph
 *  size surrounds it (`lede` vs. regular body), not sit at one fixed size
 *  regardless of context. */
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
        className="font-mono text-eyebrow uppercase text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
      >
        {label} →
      </Link>
    </div>
  );
}
