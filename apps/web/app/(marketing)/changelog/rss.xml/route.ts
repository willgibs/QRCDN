import { CHANGELOG_ENTRIES } from "@/lib/changelog";

// /changelog/rss.xml (P9.5-T6) — renders CHANGELOG_ENTRIES (lib/changelog.ts,
// the single typed source /changelog's own page reads from too) as a
// standard RSS 2.0 feed. `force-static`: a GET Route Handler defaults to
// dynamic rendering as of Next 15+ (bundled docs, 01-app/01-getting-started/
// 15-route-handlers.md's own Caching section), and this route reads nothing
// request-specific — every byte is derived from the static entries array,
// so it belongs in the same static-route set as the rest of the marketing
// surface (CLAUDE.md's Next 16 gotchas; this page's own e2e assertion).
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

/** RFC 822 date-time, the format RSS's pubDate requires — noon UTC rather
 *  than midnight so the date renders identically regardless of the reading
 *  client's own timezone offset (a midnight-UTC pubDate can display as "the
 *  day before" in a negative-offset timezone). */
function rfc822(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

export async function GET(): Promise<Response> {
  const items = CHANGELOG_ENTRIES.map((entry) => {
    const link = `${SITE_URL}/changelog#${entry.id}`;
    return `    <item>
      <title>${escapeXml(entry.summary)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(entry.date)}</pubDate>
      <description>${escapeXml(entry.summary)}</description>
    </item>`;
  }).join("\n");

  const mostRecent = CHANGELOG_ENTRIES[0];
  const lastBuildDate = mostRecent ? rfc822(mostRecent.date) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>QRCDN changelog</title>
    <link>${SITE_URL}/changelog</link>
    <description>What changed on QRCDN, and when. Real dates, real changes, written as they shipped.</description>
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
