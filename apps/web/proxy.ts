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
     */
    "/((?!_next/static|_next/image|favicon\\.ico|explore|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
