import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioShell } from "@/components/studio/studio-shell";
import type { BrandKit } from "./actions";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  // Default-first, then oldest-first — the default kit (if any) is what the
  // shell loads into the working style on first paint.
  const { data: kits } = await supabase
    .from("brand_kits")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const userEmail = typeof data.claims.email === "string" ? data.claims.email : "";

  return <StudioShell initialKits={(kits ?? []) as BrandKit[]} userEmail={userEmail} />;
}
