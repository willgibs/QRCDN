import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Plan } from "@/lib/entitlements";
import { ApiKeysPanel } from "@/components/api-keys/api-keys-panel";
import { ApiKeysFreeShowcase } from "@/components/api-keys/api-keys-free-showcase";
import type { ApiKeySummary } from "@/lib/api-keys";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

/**
 * `/api-keys` — API key management (P7-U4). Same guard pattern as
 * codes/page.tsx, copied verbatim.
 *
 * The plan check below only decides which surface renders (the free-plan
 * showcase vs. the create + list panel) — it is NOT the enforcement
 * boundary. `createApiKeyAction` (app/(app)/api-keys/actions.ts) re-checks
 * `profiles.plan` server-side before minting anything, exactly like every
 * other plan-gated action in the app (createBrandKit, createDynamicCode).
 *
 * P9.5-T7: the free-plan branch renders `ApiKeysFreeShowcase` directly
 * rather than passing through `ApiKeysPanel` — see that component's own
 * doc comment for why (it needs no props the panel's Pro-only state owns,
 * and staying a Server Component keeps a free visit's client JS at zero
 * for this content).
 */
export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  const plan = (profile?.plan as Plan | undefined) ?? "free";

  // RLS-scoped ("own api keys" policy, 20260721000002_rls_policies.sql) — no
  // manual owner_id filter needed, same convention as codes/page.tsx's
  // qr_codes query on the cookie-authenticated path.
  const { data: keysData } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });
  const keys = (keysData ?? []) as ApiKeySummary[];

  // Current-UTC-month usage, one row per key (api_usage's primary key is
  // (key_id, month) — supabase/migrations/20260723000008_api_usage.sql).
  // RLS's "read own api usage" policy join-scopes this to the caller's own
  // keys already, so no manual filter beyond the month is needed. UTC month
  // start as a plain YYYY-MM-DD date string, matching how the
  // increment_api_usage RPC computes and stores `month`
  // (`date_trunc('month', now() at time zone 'utc')::date`).
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const { data: usageRows } = await supabase
    .from("api_usage")
    .select("key_id, count")
    .eq("month", monthStart);
  const usageByKeyId: Record<string, number> = Object.fromEntries(
    (usageRows ?? []).map((row) => [row.key_id, row.count]),
  );

  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            API keys
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mint and manage keys for the QRCDN API.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
        {plan === "pro" ? (
          <ApiKeysPanel keys={keys} usageByKeyId={usageByKeyId} />
        ) : (
          <ApiKeysFreeShowcase />
        )}
      </main>
    </div>
  );
}
