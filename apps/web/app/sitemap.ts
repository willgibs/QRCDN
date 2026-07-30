import type { MetadataRoute } from "next";

// The entire public, indexable surface (P9-U5) — five static marketing
// pages. Everything else is either auth-gated (the (app) routes), a
// deliberately noindex existence-probing surface (/login, /u/{slug},
// /p/{slug} — crawlable per app/robots.ts but left off this list on
// purpose, same reasoning as that file's own comment), or non-HTML
// (/api/*, /auth/*).
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
      url: `${BASE_URL}/developers`,
      changeFrequency: "monthly",
      priority: 0.7,
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
