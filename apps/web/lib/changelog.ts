// Single typed source of truth for /changelog and /changelog/rss.xml
// (P9.5-T6) — both read CHANGELOG_ENTRIES directly, never a second
// hand-copied list. Curated by hand from docs/STATUS.md's ledger + real git
// history (`git log --format='%ad|%s' --date=format:'%Y-%m-%d'`), day
// precision throughout.
//
// Deliberately public-safe, per the T6 spec's own rules:
//   - No internal phase/unit codes anywhere in a summary (P6, T3a, U4, ...
//     never appear) — lib/changelog.test.ts statically greps every summary
//     for that shape and fails the build if one ever sneaks in.
//   - No secrets, no account identifiers, no internal infra hostnames.
//   - Every sentence describes behavior a visitor can see on qrcdn.com or
//     verify by reading this repository — never a forward-looking or
//     backfilled marketing claim (the page's own lede says so).
//
// Ordered newest first — both the rendered page and the RSS feed read
// top-to-bottom as "most recent change first," the conventional order for
// each format.

export const CHANGELOG_TAGS = [
  "engine",
  "studio",
  "codes",
  "api",
  "analytics",
  "worker",
  "site",
  "security",
] as const;

export type ChangelogTag = (typeof CHANGELOG_TAGS)[number];

export interface ChangelogEntry {
  /** Stable slug — the page anchor and the RSS item guid. Never reused once
   *  published, even if an entry's wording later changes. */
  id: string;
  /** ISO 8601 date, day precision — the real git commit date this entry is
   *  curated from. */
  date: string;
  /** One concrete, user-verifiable sentence. */
  summary: string;
  tags: readonly ChangelogTag[];
}

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    id: "feature-pages",
    date: "2026-08-01",
    summary:
      "Feature pages publish for dynamic codes, analytics, the brand studio, and access controls, each with an honest plan comparison and FAQ.",
    tags: ["site"],
  },
  {
    id: "developer-docs",
    date: "2026-08-01",
    summary:
      "Developer docs gain a five-step quickstart and a comprehensive per-endpoint reference, with real parameter, response, and error tables.",
    tags: ["api", "site"],
  },
  {
    id: "marketing-site",
    date: "2026-07-30",
    summary:
      "The marketing site launches: pricing, legal pages, and a full storefront built on a real design system.",
    tags: ["site"],
  },
  {
    id: "hardening-pass",
    date: "2026-07-30",
    summary:
      "A hardening pass adds automated end-to-end tests over the money paths, an hourly uptime check on the redirect contract, and rate limiting on public write paths.",
    tags: ["security", "worker"],
  },
  {
    id: "access-controls",
    date: "2026-07-29",
    summary:
      "Access controls ship: expiring links, password-protected codes, custom vanity slugs, and bulk creation from a pasted batch.",
    tags: ["codes", "security"],
  },
  {
    id: "public-api",
    date: "2026-07-23",
    summary:
      "The public API ships: create, retarget, pause, and read analytics for your codes over one scoped, key-authenticated endpoint.",
    tags: ["api"],
  },
  {
    id: "scan-analytics",
    date: "2026-07-22",
    summary:
      "Scan analytics ship: hourly rollups power per-code dashboards without a database write on every scan.",
    tags: ["analytics"],
  },
  {
    id: "dynamic-codes",
    date: "2026-07-22",
    summary:
      "Dynamic codes go live: short links on qrcdn.com that redirect at the edge and repoint instantly when you change the destination.",
    tags: ["codes", "worker"],
  },
  {
    id: "brand-studio",
    date: "2026-07-22",
    summary:
      "The brand studio ships: live style editing with real-time scannability scoring, logo upload, and saved brand kits.",
    tags: ["studio"],
  },
  {
    id: "qr-engine",
    date: "2026-07-21",
    summary:
      "The QR rendering engine ships: deterministic SVG output with scannability guardrails tuned against real decode testing.",
    tags: ["engine"],
  },
] as const;
