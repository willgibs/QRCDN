import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listDynamicCodesCore } from "@/lib/codes-core";
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

  // P7.5-U2: the access-controls dialog needs the caller's plan for its
  // Pro-lock affordance — same profile lookup codes/page.tsx and
  // codes/[slug]/page.tsx already run.
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const plan = (profile?.plan as Plan | undefined) ?? "free";

  // P7.5-U2: routed through listDynamicCodesCore rather than a raw
  // qr_codes select — required (not just deduped) now that
  // DynamicCodeSummary carries the derived expiresAt/passwordProtected
  // fields: codes-core.ts's toSummary() is the one place that mapping (and
  // its password_hash-stripping invariant) is defined, so every summary-
  // shaped query in the app, including this one, goes through it rather
  // than re-deriving the shape inline. No manual owner_id filter needed
  // under RLS here, but listDynamicCodesCore always applies one anyway
  // (harmless defense-in-depth — see that file's header comment).
  const codesResult = await listDynamicCodesCore({ db: supabase, ownerId: userId });
  const codes = codesResult.ok ? codesResult.data : [];

  return (
    <StudioShell
      initialKits={(kits ?? []) as BrandKit[]}
      initialCodes={codes}
      plan={plan}
      userId={userId}
    />
  );
}
