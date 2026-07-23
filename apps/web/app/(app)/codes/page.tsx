import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { rangeWindowUtc, resolveRangeDays } from "@/lib/analytics";
import { CodesTable } from "@/components/codes/codes-table";
import { CodesOverviewPanel } from "@/components/codes/codes-overview-panel";
import { Card, CardContent } from "@/components/ui/card";
import type { DynamicCodeSummary } from "@/app/(app)/studio/code-actions";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

function StatTile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {caption && <p className="font-mono text-[11px] text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * `/codes` — the dynamic-codes overview (P6-U3, chart added P6.5-U1). Same
 * guard pattern as studio/page.tsx, copied verbatim. `searchParams` is a
 * Promise in Next 16 — awaited below, same as codes/[slug]/page.tsx.
 */
export default async function CodesOverviewPage(props: PageProps<"/codes">) {
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

  const range = resolveRangeDays(
    Array.isArray(rangeParam) ? rangeParam[0] : rangeParam,
    plan,
  );
  const { startIso, endIso } = rangeWindowUtc(range);

  // The global scan-activity chart's source (P6.5-U1) — deliberately NO
  // `code_id` filter, unlike codes/[slug]/page.tsx's per-code query: RLS's
  // "own qr codes"-derived owner-join policy on scan_daily already scopes
  // this to every one of the caller's codes, and the panel needs all of
  // them summed. See lib/analytics.ts's `sumDailyAcrossCodes` doc comment
  // for the PostgREST max_rows=1000 caveat this shape carries at Pro scale.
  const { data: dailyRows } = await supabase
    .from("scan_daily")
    .select("day, scans, uniques")
    .gte("day", startIso)
    .lt("day", endIso)
    .order("day");

  // Newest-first, mirroring listDynamicCodes' own query (code-actions.ts) —
  // fetched directly here rather than by calling that server action, same
  // pattern studio/page.tsx already uses. No manual owner_id filter: the
  // "own qr codes" RLS policy already scopes this to the caller.
  const { data: codesData } = await supabase
    .from("qr_codes")
    .select("id, slug, name, destination_url, status, scan_count, created_at")
    .eq("kind", "dynamic")
    .order("created_at", { ascending: false });
  const codes = (codesData ?? []) as DynamicCodeSummary[];

  // Live "scans today" — raw scan_events, RLS-scoped, no manual owner
  // filter (same convention as code-actions.ts's queries: the "own qr
  // codes"-derived RLS policy on scan_events already restricts every select
  // to the caller's own rows). scan_daily's rollup lags up to an hour
  // behind (D8), so "today" always comes from the live table, never the
  // rollup — same reasoning as lib/analytics.ts's rangeWindowUtc doc
  // comment ("the live layer is responsible for 'today'").
  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const { count: scansToday } = await supabase
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .gte("ts", todayStartIso);

  const totalScans = codes.reduce((sum, code) => sum + code.scan_count, 0);
  const activeCodes = codes.filter((code) => code.status === "active").length;
  const codeLimit = PLAN_LIMITS[plan].dynamicCodes;

  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Codes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every dynamic code and its scan activity.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Total scans" value={totalScans.toLocaleString()} />
          <StatTile label="Scans today" value={(scansToday ?? 0).toLocaleString()} />
          <StatTile
            label="Active codes"
            value={activeCodes.toLocaleString()}
            caption={`of ${codeLimit}`}
          />
        </div>

        <CodesOverviewPanel plan={plan} range={range} dailyRows={dailyRows ?? []} />

        {codes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No dynamic codes yet —{" "}
            <Link href="/studio" className="text-primary underline-offset-4 hover:underline">
              create one in the studio
            </Link>
            .
          </p>
        ) : (
          <Card>
            <CardContent className="px-0">
              <CodesTable codes={codes} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
