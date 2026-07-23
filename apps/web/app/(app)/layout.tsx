import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/app-nav";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

/**
 * (app) route-group shell (P6.5-U1) — mounts the persistent `AppNav` above
 * every authenticated route (`/studio`, `/codes`, `/codes/[slug]`) so the
 * product finally has one consistent way to move between them (board note:
 * "unclear how the main tool gets to /codes").
 *
 * The `getClaims()` guard below is DEFENSE IN DEPTH ONLY — it is NOT the
 * authorization boundary. Next.js layouts do not re-run on client-side
 * navigation (bundled docs, node_modules/next/dist/docs/.../layout.md,
 * "Request Object"/"Pathname" caveats: layouts are cached and reused across
 * navigations within the same root layout), so a user who lands on
 * `/studio` once and then soft-navigates to `/codes` never re-triggers this
 * layout's own auth check. Each page under this group therefore keeps its
 * own unmodified `getClaims()` guard (studio/page.tsx, codes/page.tsx,
 * codes/[slug]/page.tsx) — do not remove or weaken those on the theory that
 * this layout now covers it; it doesn't, reliably, on soft navigation.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userEmail = typeof data.claims.email === "string" ? data.claims.email : "";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppNav userEmail={userEmail} />
      {children}
    </div>
  );
}
