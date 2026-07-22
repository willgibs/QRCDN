import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@qrcdn/shared";

/**
 * Refreshes the Supabase auth cookie on every matched request and forwards
 * it to both the Server Component tree (`request.cookies`) and the browser
 * (`response.cookies`).
 *
 * This is a token-refresh pass, not the app's authorization boundary —
 * Next.js's own guidance is that Proxy "should not be used as a full
 * session management or authorization solution." Every protected route
 * (e.g. `app/(app)/studio`) guards itself with its own `getClaims()` call,
 * and `(app)` routes are `force-dynamic` (D9) specifically so that guard
 * runs fresh on every request instead of riding a cached response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // With Fluid compute / serverless reuse, never hoist this client to
  // module scope — a fresh client is required per request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // @supabase/ssr >=0.10 pass-through: a token refresh carries
          // Cache-Control/Expires/Pragma headers that MUST reach the
          // response, or a CDN/reverse proxy in front of Vercel could
          // cache a session-bearing response and leak it cross-user.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims() — a stray
  // await here can desync the session and randomly log users out.
  //
  // getClaims() validates the JWT signature against the project's published
  // public keys on every call, unlike getSession() (never trust it
  // server-side — hard rule, CLAUDE.md).
  await supabase.auth.getClaims();

  // IMPORTANT: return supabaseResponse as-is (or copy its cookies onto a
  // replacement) — constructing a fresh NextResponse without doing so
  // desyncs the browser and server sessions.
  return supabaseResponse;
}
