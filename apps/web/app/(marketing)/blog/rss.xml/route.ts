import { BLOG_POSTS } from "@/lib/blog";

// /blog/rss.xml (P9.5-T-R) — mirrors /changelog/rss.xml's own route
// handler almost exactly (same escaping, same RFC-822 noon-UTC pubDate
// convention so the date renders identically regardless of the reading
// client's timezone offset), reading BLOG_POSTS (lib/blog.ts, the same
// typed source /blog's own page reads) rather than a second hand-copied
// list. `force-static`: a GET Route Handler defaults to dynamic rendering
// as of Next 15+ (bundled docs, 01-app/01-getting-started/
// 15-route-handlers.md's own Caching section) and this route reads nothing
// request-specific.
export const dynamic = "force-static";

const SITE_URL = "https://www.qrcdn.com";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

export async function GET(): Promise<Response> {
  const items = BLOG_POSTS.map((post) => {
    const link = `${SITE_URL}/blog/${post.slug}`;
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${escapeXml(post.dek)}</description>
    </item>`;
  }).join("\n");

  const mostRecent = BLOG_POSTS[0];
  const lastBuildDate = mostRecent ? rfc822(mostRecent.date) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>QRCDN blog</title>
    <link>${SITE_URL}/blog</link>
    <description>How QRCDN actually works, in public.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
