import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 proxy convention (renamed from `middleware.ts` — same file
// slot, same execution model). D9: proxy.ts runs updateSession.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except:
     * - _next/static (static build assets)
     * - _next/image (image optimization)
     * - favicon.ico and other public static files (svg/png/jpg/etc.)
     * - icon|apple-icon|opengraph-image (P9-U1) — Next's file-convention
     *   metadata images (app/icon.svg, app/apple-icon.png,
     *   app/(marketing)/opengraph-image.png) are served at these
     *   extensionless paths (/icon, /apple-icon, /opengraph-image), so the
     *   `.(?:svg|png|...)$` file-extension alternative at the end of this
     *   pattern doesn't catch them — they need their own names here.
     * - sitemap\.xml|robots\.txt (P9-U1) — land at P9-U5, excluded now so
     *   that unit doesn't have to touch this file again; public,
     *   unauthenticated, no session work to do, same reasoning as /explore.
     * - /explore (public marketing canvas — no auth cookie needed)
     * - /developers (P7-U5 public API reference page — static, no auth
     *   cookie work to do, same reasoning as /explore).
     * - /u/{slug} (public fallback for paused/unknown codes, P6.5-U2 — an
     *   anonymous, no-lookup page with no auth cookie work to do). Matched
     *   precisely as `u/[^/]+` (exactly one slug segment) rather than a
     *   bare `u`, which would also swallow unrelated future routes like
     *   /upgrade or /unsubscribe.
     * - /p/{slug} (public password-wall unlock page, P7.5-U2 — same
     *   anonymous shape as /u/{slug} above, but NOT no-lookup: page.tsx
     *   does its own createAdminClient() lookup rather than relying on any
     *   session, so there is never a Supabase cookie identity on this
     *   route either way, only a different (admin-client, RLS-bypassing)
     *   read path than the cookie-authenticated (app) routes this proxy
     *   guards. Matched the same `p/[^/]+` shape as u/[^/]+ for the same
     *   reason (exactly one slug segment, not a bare `p`).
     * - /api/v1 (P7-U3 public API — its own bearer-token auth pipeline,
     *   lib/api-auth.ts; no Supabase cookie session exists on these
     *   requests, so running updateSession here would be dead work at
     *   best and couldn't authenticate an API-key caller regardless).
     * - pricing|terms|privacy (P9-U1) — new static marketing pages,
     *   landing at P9-U3 (/pricing) and P9-U4 (/terms, /privacy); excluded
     *   now for the same reason as sitemap/robots above. Public, no auth
     *   cookie work to do, same reasoning as /explore.
     * - the bare `$` alternative (P9-U1) — a zero-width end-of-string
     *   assertion, i.e. this excludes `/` itself. It has to be zero-width:
     *   after the matcher's leading slash is stripped there's nothing left
     *   for `/` to match against, so no literal word or character class
     *   can ever match an empty remainder — only `$` can. Added ahead of
     *   P9-U2's marketing landing page, which — like /explore — is public
     *   and needs no auth cookie work.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|sitemap\\.xml|robots\\.txt|explore|developers|u/[^/]+|p/[^/]+|api/v1|pricing|terms|privacy|$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
