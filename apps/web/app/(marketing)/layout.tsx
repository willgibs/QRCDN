import type { ReactNode } from "react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Marketing route-group shell (P9-U1) — mounts the shared chrome around
 * every `(marketing)` page. Server component: zero data fetching, zero
 * dynamic APIs, so every page under this group can render fully static
 * (`○ (Static)` in `next build` output).
 *
 * U1 deliberately creates no `app/(marketing)/page.tsx` — that would
 * collide with the scaffold `app/page.tsx` still serving `/` (duplicate
 * route = build error). Until P9-U2 adds the real landing page, this group
 * has no routable leaf; the new chrome is exercised via `app/not-found.tsx`
 * instead, which composes SiteNav/SiteFooter directly since route-group
 * layouts don't wrap the root 404.
 *
 * P9.9-C0.5 (board directive 2026-08-06): marketing is DARK-ONLY. The
 * `dark` class on this wrapper scopes the dark token set and every `dark:`
 * variant to the whole marketing tree regardless of the visitor's OS/site
 * theme — the site-wide next-themes toggle no longer exists on marketing
 * chrome (the app keeps it: AppNav). `data-force-dark` is the hook for the
 * `html:has(...)` rules in globals.css that carry the two things a wrapper
 * div cannot: the UA `color-scheme` (scrollbars/form controls) and the
 * `<body>` background behind overscroll. Body-level PORTALS also escape
 * this wrapper — any portal-rendering component used on marketing must
 * carry its own `dark` class on the portaled content (today: SiteNav's
 * Features dropdown, Playground's Download popover). Occasional hard-coded
 * light "reversed" sections remain a per-section design choice (the
 * paper-plate idea, design-system.md) — never a user toggle.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-force-dark className="dark flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
