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
     * - /explore (public marketing canvas — no auth cookie needed)
     * - /u/{slug} (public fallback for paused/unknown codes, P6.5-U2 — an
     *   anonymous, no-lookup page with no auth cookie work to do). Matched
     *   precisely as `u/[^/]+` (exactly one slug segment) rather than a
     *   bare `u`, which would also swallow unrelated future routes like
     *   /upgrade or /unsubscribe.
     * - /api/v1 (P7-U3 public API — its own bearer-token auth pipeline,
     *   lib/api-auth.ts; no Supabase cookie session exists on these
     *   requests, so running updateSession here would be dead work at
     *   best and couldn't authenticate an API-key caller regardless).
     * - /developers (P7-U5 public API reference page — static, no auth
     *   cookie work to do, same reasoning as /explore).
     */
    "/((?!_next/static|_next/image|favicon\\.ico|explore|developers|u/[^/]+|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
