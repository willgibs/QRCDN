import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@qrcdn/shared";

/**
 * Browser-side Supabase client (Client Components only). Safe to call
 * repeatedly — `createBrowserClient` is a singleton internally.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
