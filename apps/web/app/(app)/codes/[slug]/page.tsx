import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCodeBySlugCore } from "@/lib/codes-core";
import { type Plan } from "@/lib/entitlements";
import { rangeWindowUtc, resolveRangeDays } from "@/lib/analytics";
import { CodeAnalyticsPanel } from "@/components/codes/code-analytics-panel";
import { StatusPill } from "@/components/codes/codes-table";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

/**
 * `/codes/[slug]` — per-code analytics (P6-U3). Same guard pattern as
 * studio/page.tsx, copied verbatim. `params`/`searchParams` are Promises in
 * Next 16 — both are awaited below.
 */
export default async function CodeAnalyticsPage(props: PageProps<"/codes/[slug]">) {
  const { slug } = await props.params;
  const { range: rangeParam } = await props.searchParams;

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

  // P7.5-U2: routed through getCodeBySlugCore rather than a raw qr_codes
  // select (same switch as studio/page.tsx and codes/page.tsx) —
  // codes-core.ts's toSummary() is the one place DynamicCodeSummary's
  // derived expiresAt/passwordProtected mapping is defined. RLS-scoped (own
  // qr codes) under this request-scoped client — the owner_id filter
  // getCodeBySlugCore always applies is redundant defense-in-depth here,
  // same stance as every other cookie-authenticated caller of these cores.
  // "not_found" covers both "wrong slug" and "someone else's code" — RLS
  // makes the two indistinguishable from here regardless.
  const codeResult = await getCodeBySlugCore({ db: supabase, ownerId: userId }, slug);
  if (!codeResult.ok) {
    notFound();
  }
  const code = codeResult.data;

  const range = resolveRangeDays(
    Array.isArray(rangeParam) ? rangeParam[0] : rangeParam,
    plan,
  );
  const { startIso, endIso } = rangeWindowUtc(range);

  const { data: dailyRows } = await supabase
    .from("scan_daily")
    .select("day, scans, uniques, by_country, by_device, by_referer, by_city")
    .eq("code_id", code.id)
    .gte("day", startIso)
    .lt("day", endIso)
    .order("day");

  // Live layer (raw scan_events, RLS-scoped, .eq("code_id", ...)) — today's
  // partial day never comes from scan_daily (it lags up to an hour behind,
  // D8), and "10 most recent events" has no rollup equivalent at all.
  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const { count: scansToday } = await supabase
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("code_id", code.id)
    .gte("ts", todayStartIso);

  const { data: recentEvents } = await supabase
    .from("scan_events")
    .select("ts, country, region, city, device, referer")
    .eq("code_id", code.id)
    .order("ts", { ascending: false })
    .limit(10);

  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {code.name}
            </h1>
            <span className="font-mono text-sm text-muted-foreground">/{code.slug}</span>
            <StatusPill status={code.status} expiresAt={code.expiresAt} />
          </div>

          <p className="truncate text-sm text-muted-foreground">
            → {code.destination_url}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
        <CodeAnalyticsPanel
          plan={plan}
          range={range}
          dailyRows={dailyRows ?? []}
          scansToday={scansToday ?? 0}
          recentEvents={recentEvents ?? []}
        />
      </main>
    </div>
  );
}
