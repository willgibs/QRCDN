import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/app-nav";
import { StudioPublicNav } from "@/components/studio/studio-public-nav";

// The one route that serves BOTH auth states (P9.8-B4, board decision at the
// P9.7 close): signed in gets the normal app shell; signed out gets the
// public studio for static codes. Force-dynamic so the claims read runs
// fresh per request (D9) — this page is the "free qr generator" landing
// target and must never cache one visitor's shell for another.
export const dynamic = "force-dynamic";

/**
 * /studio lives OUTSIDE the (app) route group on purpose: that group's
 * layout redirects signed-out visitors to /login, which is exactly the
 * defense-in-depth /codes and /api-keys must keep and exactly what this
 * page must not do. Nothing here weakens the (app) guard — this layout
 * simply isn't under it, and every action the anonymous studio can trigger
 * is client-side (render + export; lib/export.ts has no auth or network).
 * Server actions (kits) all carry their own getClaims()/getUser() guards
 * regardless of which layout the caller rendered under.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const userEmail = signedIn && typeof data?.claims.email === "string" ? data.claims.email : "";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {signedIn ? <AppNav userEmail={userEmail} /> : <StudioPublicNav />}
      {children}
    </div>
  );
}
