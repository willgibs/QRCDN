import Link from "next/link";
import { ModuleMark } from "@/components/brand/magic";
import { ThemeToggle } from "@/components/marketing/theme-toggle";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/login", label: "Studio" },
    ],
  },
  {
    heading: "Developers",
    links: [{ href: "/developers", label: "API reference" }],
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
 * Marketing site footer (P9-U1) — product/developers/legal columns, mailto
 * contact, wordmark + tagline, the lowercase mono "your code never dies"
 * sign-off, and the theme toggle. Server component (no hooks of its own);
 * `ThemeToggle` is the one client island inside it.
 *
 * Real hrefs only, matching SiteNav: /pricing, /terms, /privacy don't exist
 * until P9-U3/U4 but are linked anyway per the spec's route architecture
 * note — an `href="#"` placeholder would be a defect.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
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
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
                    >
                      {link.label}
                    </Link>
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
