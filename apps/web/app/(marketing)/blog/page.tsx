import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog";

// /blog (P9.5-T-R) — a simple, dated list: date, title, dek, tag chips.
// Poster head + reveal={false}, same reasoning /changelog and /pricing's
// own doc comments already established: titleAs="h1" is this page's one
// true title context, and SectionHeading's default scroll-triggered Reveal
// would otherwise SSR the h1 at opacity:0, gating the page's own LCP
// candidate behind an IntersectionObserver with nothing below the fold to
// wait for.
export const metadata: Metadata = {
  title: "Blog",
  description:
    "How QRCDN actually works, in public: what makes a QR code scan, how redirects survive a bad day, how scans get counted without tracking anyone, and why the whole thing is open source.",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function BlogRow({ post }: { post: BlogPost }) {
  return (
    <li className="border-t border-border/60 py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <time
          dateTime={post.date}
          className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground"
        >
          {formatDate(post.date)}
        </time>
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-mono text-[11px] text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <h2 className="mt-3">
        <Link
          href={`/blog/${post.slug}`}
          className="font-display text-h3 font-semibold tracking-tight text-foreground underline-offset-4 hover:underline"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{post.dek}</p>
    </li>
  );
}

export default function BlogIndexPage() {
  return (
    <Section divider="none">
      <SectionHeading
        eyebrow="Blog"
        titleAs="h1"
        title="How this actually works."
        lede="Engineering write-ups, not press releases. Every claim traces to the source it came from."
        reveal={false}
        aside={
          <Link
            href="/blog/rss.xml"
            className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground hover:underline"
          >
            RSS feed
          </Link>
        }
      />

      <SectionBody reveal={false} className="mt-10 max-w-3xl">
        <ol>
          {BLOG_POSTS.map((post) => (
            <BlogRow key={post.slug} post={post} />
          ))}
        </ol>
      </SectionBody>
    </Section>
  );
}
