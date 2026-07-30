import type { MetadataRoute } from "next";

// Allow-all crawl posture (P9-U5) with two narrow Disallows: /api/ (every
// API route — app/api/v1/*, app/api/cron/* — none of it is a page worth a
// search result) and /auth/ (Supabase's server-side callback/confirm
// redirect handlers, app/auth/callback, app/auth/confirm — never a page a
// crawler should land on).
//
// Deliberately NOT disallowed: /login, /u/{slug}, /p/{slug}. Each already
// carries page-level `robots: { index: false }` metadata (see their own
// page.tsx files) — and a noindex directive only works if the crawler is
// actually allowed to fetch the page and read that meta tag in the first
// place. Disallowing them here would block the crawl entirely, which
// paradoxically stops a search engine from ever learning they're noindex.
//
// This is the www host's robots.txt (this Next app). The bare apex
// qrcdn.com/robots.txt is a completely different host, owned by the
// redirect Worker (workers/redirect) — its Disallow-all posture there is
// unrelated and doesn't need to agree with this one.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/"],
    },
    sitemap: "https://www.qrcdn.com/sitemap.xml",
  };
}
