import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/marketing/section";
import type { BlogPost } from "@/lib/blog";

/**
 * Shared chrome for a single /blog/[slug] post (P9.5-T-R) — the blog's
 * equivalent of components/marketing/legal-shell.tsx's `LegalShell`, same
 * reasoning: a long-form page the visitor reads top to bottom, not a
 * scroll-triggered marketing sequence, so no `SectionHeading`/`Reveal`
 * machinery (that would gate the page's own LCP heading behind an
 * IntersectionObserver with nothing to wait for — the same fix already
 * applied to /changelog and /pricing per their own doc comments). `Section`
 * itself is reused only for its outer frame (fluid gutter/section padding,
 * `divider="none"`), not for anything scroll-triggered.
 *
 * `max-w-prose` (`--container-prose`, 65ch) is the token design-system.md
 * reserved specifically for "long-form article/blog body copy (future blog
 * unit)" at P9.5-T1b — this is that unit.
 */
export function BlogPostShell({ post, children }: { post: BlogPost; children: ReactNode }) {
  const formattedDate = new Date(`${post.date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Section rhythm="standard" divider="none">
      <div className="mx-auto flex max-w-prose flex-col">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-mono text-[11px] text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mt-4 font-display text-h1 font-semibold tracking-tight text-foreground">
          {post.title}
        </h1>
        <p className="mt-4 text-lede text-muted-foreground">{post.dek}</p>

        <div className="mt-6 flex items-center gap-3 border-y border-border/60 py-4 font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{post.byline}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formattedDate}</time>
        </div>

        <article className="mt-10 flex flex-col gap-6">{children}</article>

        <div className="mt-16 border-t border-border/60 pt-8">
          <Link
            href="/blog"
            className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            ← Back to the blog
          </Link>
        </div>
      </div>
    </Section>
  );
}

/** Body paragraph — the post's default register: readable prose at a
 *  comfortable size, full foreground (not muted: unlike LegalSection's
 *  fine-print treatment, a blog post's body IS the thing being read). */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-foreground/90">{children}</p>;
}

/** In-post subheading. `text-h3` (not `text-h2`): inside a 65ch column,
 *  `text-h2`'s fluid ceiling (44px) reads oversized next to body copy at
 *  this measure — `text-h3` (22-26px) keeps the same font-display/
 *  font-semibold register `SectionHeading` uses sitewide, just sized for a
 *  narrower column. */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-4 font-display text-h3 font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}

/**
 * Standalone [V] verbatim line (P9.5-T-R deck) — a pull-quote treatment:
 * left accent rule + larger, full-foreground type, visually distinct from
 * the surrounding `P` paragraphs so a reader's eye catches it as the one
 * sentence the piece wants remembered. `<strong>`'s semantic emphasis
 * would be wrong here (these aren't emphasized WORDS, they're standalone
 * sentences) — a `blockquote` is the correct element: an attributed,
 * quotable unit of text set apart from the flow.
 */
export function Pull({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 border-primary py-1 pl-6 text-lede text-foreground">
      {children}
    </blockquote>
  );
}
