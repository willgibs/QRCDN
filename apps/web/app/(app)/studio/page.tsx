import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Plan } from "@/lib/entitlements";
import { StudioShell } from "@/components/studio/studio-shell";
import type { BrandKit } from "@/lib/brand-kits";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Default-first, then oldest-first — the default kit (if any) is what the
  // shell loads into the working style on first paint.
  const { data: kits } = await supabase
    .from("brand_kits")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  // P9.8-B2: this profile/plan lookup stays even though the studio no
  // longer creates or lists codes — KitBar's kit-limit note (via TopBar)
  // still needs `plan` to gate its free-vs-pro copy correctly (the rider
  // this same unit fixed).
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const plan = (profile?.plan as Plan | undefined) ?? "free";

  return (
    <StudioShell
      initialKits={(kits ?? []) as BrandKit[]}
      plan={plan}
      userId={userId}
    />
  );
}
