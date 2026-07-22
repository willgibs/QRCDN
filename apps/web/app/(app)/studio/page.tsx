import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioShell } from "@/components/studio/studio-shell";
import type { BrandKit } from "./actions";
import type { DynamicCodeSummary } from "./code-actions";

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

  // Newest-first, mirroring listDynamicCodes' own query (code-actions.ts) —
  // fetched directly here rather than by calling that server action, same
  // pattern the brand-kit fetch above already uses (a plain Supabase query,
  // not a call through actions.ts). No manual owner_id filter: the "own qr
  // codes" RLS policy already scopes this to the caller. The frozen `style`
  // snapshot is deliberately excluded — see DynamicCodeSummary's own doc
  // comment in code-actions.ts.
  const { data: codes } = await supabase
    .from("qr_codes")
    .select("id, slug, name, destination_url, status, scan_count, created_at")
    .eq("kind", "dynamic")
    .order("created_at", { ascending: false });

  const userEmail = typeof data.claims.email === "string" ? data.claims.email : "";

  return (
    <StudioShell
      initialKits={(kits ?? []) as BrandKit[]}
      initialCodes={(codes ?? []) as DynamicCodeSummary[]}
      userId={data.claims.sub}
      userEmail={userEmail}
    />
  );
}
