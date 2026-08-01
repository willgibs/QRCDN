import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { HELP_ARTICLES } from "@/lib/help";

// The entire public, indexable surface (P9-U5; +2 feature pages at
// P9.5-T-F1; +2 more at P9.5-T-F2; +/changelog at P9.5-T6; +/blog and
// /help at P9.5-T-R) — static marketing pages plus every real blog post
// and help article, the latter two derived from their own typed sources
// (lib/blog.ts, lib/help.ts) rather than hand-listed, so a post or article
// added later can't silently miss the sitemap.
// Everything else is either auth-gated (the (app) routes), a deliberately
// noindex existence-probing surface (/login, /u/{slug}, /p/{slug} —
// crawlable per app/robots.ts but left off this list on purpose, same
// reasoning as that file's own comment), or non-HTML (/api/*, /auth/*,
// /blog/rss.xml — a feed, not a page for a search result).
//
// lastModified is omitted: none of these pages has a real per-page
// "last edited" timestamp anywhere in the system (no CMS, no DB row), and
// a deploy-time Date.now() would be a fabricated signal rather than a
// truthful one — left for crawlers to infer from HTTP headers instead.
const BASE_URL = "https://www.qrcdn.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/features/dynamic-codes`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/features/analytics`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/features/brand-studio`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/features/access-controls`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/developers`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...BLOG_POSTS.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    {
      url: `${BASE_URL}/help`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...HELP_ARTICLES.map((article) => ({
      url: `${BASE_URL}/help/${article.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    {
      url: `${BASE_URL}/changelog`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
