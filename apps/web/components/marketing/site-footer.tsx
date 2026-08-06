import Link from "next/link";
import { ModuleMark } from "@/components/brand/magic";
import { ThemeToggle } from "@/components/marketing/theme-toggle";

// GitHub repo URL — the same literal open-source-section.tsx's own
// REPO_URL uses. Not imported from there: that component is landing-only
// (a Section), and this file is sitewide chrome that would otherwise pull
// in a whole marketing-section module for one string.
const REPO_URL = "https://github.com/willgibs/QRCDN";

/**
 * Full resource map (P9.5-T-R deck). "License" and "Security" have no
 * in-app page of their own — the honest, real link is the actual file in
 * the public repo (LICENSE, SECURITY.md, both present at the repo root),
 * not a fabricated internal route. Same "real hrefs only" rule SiteNav's
 * own doc comment states, applied to files instead of pages.
 */
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/features/dynamic-codes", label: "Dynamic codes" },
      { href: "/features/brand-studio", label: "Brand studio" },
      { href: "/features/analytics", label: "Analytics" },
      { href: "/features/access-controls", label: "Access controls" },
      { href: "/pricing", label: "Pricing" },
      { href: "/studio", label: "Studio" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/developers", label: "Docs" },
      { href: "/help", label: "Help" },
      { href: "/blog", label: "Blog" },
      { href: "/changelog", label: "Changelog" },
      { href: "https://status.qrcdn.com", label: "Status", external: true },
    ],
  },
  {
    heading: "Open source",
    links: [
      { href: REPO_URL, label: "GitHub", external: true },
      { href: `${REPO_URL}/blob/main/LICENSE`, label: "License", external: true },
      { href: `${REPO_URL}/blob/main/SECURITY.md`, label: "Security", external: true },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
] as const;

/**
 * Marketing site footer (P9-U1; full resource map at P9.5-T-R) —
 * product/resources/open-source/legal columns, mailto contact, wordmark +
 * tagline, the lowercase mono "your code never dies" sign-off, and the
 * theme toggle. Server component (no hooks of its own); `ThemeToggle` is
 * the one client island inside it.
 *
 * Real hrefs only, matching SiteNav: every link here resolves to a real
 * page or a real file in the public repo today — an `href="#"` placeholder
 * would be a defect.
 *
 * `link.external` (a per-link flag, not a column-level one — most links
 * stay internal `next/link`s) renders a plain `<a target="_blank"
 * rel="noopener noreferrer">` instead, the same distinction
 * `LearnMoreLink`'s own `external` prop already draws.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[1.1fr_repeat(4,1fr)]">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <Link
              href="/"
              className="flex w-fit items-center gap-2.5 font-display text-lg font-bold tracking-tight text-foreground"
            >
              <ModuleMark className="size-3.5 text-primary" />
              QRCDN
            </Link>
            <p className="max-w-[26ch] text-sm text-muted-foreground">
              QR infrastructure, engineered.
            </p>
            <a
              href="mailto:hello@qrcdn.com"
              className="w-fit text-sm text-muted-foreground underline-offset-4 transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground hover:underline"
            >
              hello@qrcdn.com
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-6 border-t border-border/60 pt-6 sm:flex-row">
          <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-4 sm:text-left">
            <p className="font-mono text-xs text-muted-foreground">your code never dies</p>
            <p className="text-xs text-muted-foreground">© 2026 QRCDN</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
