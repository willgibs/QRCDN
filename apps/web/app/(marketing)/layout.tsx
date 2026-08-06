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
 * Theme note: the whole product is dark-only via the STATIC `dark` class in
 * the root layout (P9.9-C0.6 board directive — it briefly lived here as a
 * marketing-scoped forced-dark wrapper at C0.5, superseded the same day).
 * This layout is plain composition again.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
