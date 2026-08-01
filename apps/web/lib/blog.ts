// Single typed source of truth for /blog, /blog/[slug], and /blog/rss.xml
// (P9.5-T-R) — metadata only (title/dek/date/byline/tags); post BODIES live
// as TSX components under components/marketing/blog/posts/, one file per
// post, looked up by slug from components/marketing/blog/post-registry.tsx.
// Mirrors lib/changelog.ts's own split (a plain-data lib file the page, the
// feed, and a vitest suite all read identically) as closely as a
// long-form article can: the difference is body length and richness
// (CodeBlock samples, pull-quotes) push post bodies into components/
// rather than a hand-escaped string field here.
//
// MDX-vs-TSX decision (P9.5-T-R): @next/mdx was tried directly (installed,
// wired into next.config.ts, a throwaway .mdx page built and compiled clean
// under Turbopack in a real `pnpm build` — it is NOT a Turbopack
// incompatibility). Reverted anyway: this repo has no `@tailwindcss/
// typography` and no prior MDX element-style mapping, so raw markdown
// output (h1-h6/p/ul/blockquote) would render fully unstyled without a new
// mdx-components.tsx style layer that duplicates what the existing
// Section/CodeBlock/type-scale primitives already give TSX for free. Every
// [V] line in this unit ships as a literal string in source, which is
// easier to keep byte-exact (and to grep-verify, see blog.test.ts's
// companion source-scan) than text passing through a markdown compiler.
// Full writeup: the implementer's final report.

export const BLOG_TAGS = ["engine", "infrastructure", "privacy", "open-source"] as const;

export type BlogTag = (typeof BLOG_TAGS)[number];

export interface BlogPost {
  /** Stable slug — the route segment and the RSS item guid. Never reused. */
  slug: string;
  title: string;
  dek: string;
  /** ISO 8601 date, day precision. Every launch post ships 2026-08-01 per
   *  the deck's own instruction (a coordinated launch set, not four posts
   *  written on four different days). */
  date: string;
  byline: string;
  tags: readonly BlogTag[];
}

// Launch order (deck order 1-4) doubles as display order: every post
// shares one date, so array order is the real tiebreak, not an incidental
// one — kept exactly as the deck sequenced the launch set.
export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: "what-actually-scans",
    title: "We measured what actually scans",
    dek: "160+ style combinations, two adversarial decode campaigns, and the two numbers that now guard every export.",
    date: "2026-08-01",
    byline: "Will Gibson",
    tags: ["engine"],
  },
  {
    slug: "redirects-that-outlive-us",
    title: "Redirects that outlive us",
    dek: "The never-dies architecture: why scans hit an edge worker with a five-minute memory instead of our database.",
    date: "2026-08-01",
    byline: "Will Gibson",
    tags: ["infrastructure"],
  },
  {
    slug: "counting-without-tracking",
    title: "Counting scans without tracking people",
    dek: "Scan analytics with no cookies, no fingerprints, and no raw IP anywhere.",
    date: "2026-08-01",
    byline: "Will Gibson",
    tags: ["privacy"],
  },
  {
    slug: "why-open-source",
    title: "Why QRCDN is open source",
    dek: "A printed promise deserves a public escape hatch.",
    date: "2026-08-01",
    byline: "Will Gibson",
    tags: ["open-source"],
  },
] as const;

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
