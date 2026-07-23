"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModuleMark } from "@/components/brand/magic";
import { signOutAction } from "@/app/(app)/studio/actions";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/codes", label: "Codes" },
  { href: "/api-keys", label: "API" },
] as const;

/**
 * Persistent app-shell nav (P6.5-U1) — board note: "unclear how the main
 * tool gets to /codes." Mounted once by app/(app)/layout.tsx above every
 * authenticated route; the SOLE sticky bar in the (app) shell now (see
 * studio-shell.tsx's PreviewStage sticky-offset comment for the derivation
 * that depends on this bar's own height). Carries what used to live inline
 * in studio's TopBar (components/studio/top-bar.tsx, now trimmed to just
 * its KitBar row): wordmark, primary nav, account cluster, sign-out.
 *
 * "use client" for `usePathname` (active-link state). This can't move up
 * into the layout itself — layouts don't re-render on client-side
 * navigation and have no access to the current pathname (Next 16 docs,
 * bundled locally at node_modules/next/dist/docs/.../layout.md, "Pathname"
 * caveat) — so the nav has to be its own client component even though the
 * server-component layout that mounts it isn't.
 */
export function AppNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight"
          >
            <ModuleMark className="size-3.5 text-primary" />
            QRCDN
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              // /codes/[slug] should light up "Codes" too, not just the
              // exact /codes match — same startsWith-a-trailing-slash
              // convention app-wide breadcrumbs would use.
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {userEmail && (
            <span
              className="hidden max-w-[180px] truncate font-mono text-xs text-muted-foreground sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
