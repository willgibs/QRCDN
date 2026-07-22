import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@qrcdn/shared";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Request APIs are async-only in Next.js 16 — `cookies()`
 * must be awaited.
 *
 * Guardrail (D9 / CLAUDE.md hard rule): use `getClaims()` for page guards
 * and `getUser()` before destructive/billing actions — never trust
 * `getSession()` server-side.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component — safe to ignore
            // because `proxy.ts` refreshes the session on every request.
          }
        },
      },
    },
  );
}
