import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { type Plan } from "@/lib/entitlements";
import { StudioShell } from "@/components/studio/studio-shell";
import type { BrandKit } from "@/lib/brand-kits";

// Force-dynamic (D9): the claims read below branches the whole page.
export const dynamic = "force-dynamic";

// P9.8-B4: /studio is public and indexable — the direct landing target for
// "free qr code generator" intent (board's brief: the tool reachable from
// the homepage or a search, no account, then subtle incentives to create
// one). The no-watermark promise moved here from the landing playground's
// lede; this description is now its canonical home.
export const metadata: Metadata = {
  title: "Free QR code generator",
  description:
    "Design a styled QR code and download it as SVG or PNG, free. No account, no watermark. A free account adds brand kits, dynamic codes you can retarget after printing, and scan analytics.",
};

export default async function StudioPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // Signed out: the real studio in anonymous static mode. Everything the
  // anonymous rail can do (design controls, payload, SVG/PNG export) runs
  // client-side against the same engine — no persistence, nothing to guard.
  if (!data?.claims) {
    return <StudioShell initialKits={[]} plan="free" userId={null} anonymous />;
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
  // still needs `plan` to gate its free-vs-pro copy correctly.
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const plan = (profile?.plan as Plan | undefined) ?? "free";

  return <StudioShell initialKits={(kits ?? []) as BrandKit[]} plan={plan} userId={userId} />;
}
