import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listDynamicCodesCore } from "@/lib/codes-core";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { rangeWindowUtc, resolveRangeDays } from "@/lib/analytics";
import { parseSparklinePoints } from "@/lib/sparkline";
import { CodesTable } from "@/components/codes/codes-table";
import { CodesOverviewPanel } from "@/components/codes/codes-overview-panel";
import { StatTile } from "@/components/codes/stat-tile";
import { rangeLabel } from "@/components/codes/range-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

const STRIP_LABEL_CLASS = "font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground";
const STRIP_CELL_CLASS = "px-4 py-3 sm:px-5 sm:py-4";

/**
 * `/codes` — the dynamic-codes overview (P6-U3, chart added P6.5-U1,
 * rebuilt P9.6-U2 to the board's "codes first" portfolio layout: a compact
 * overview band up top answering "how is my account doing," the codes table
 * as the page's real content immediately below it, each row carrying its
 * own sparkline). Same guard pattern as studio/page.tsx, copied verbatim.
 * `searchParams` is a Promise in Next 16 — awaited below, same as
 * codes/[slug]/page.tsx.
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

  // "Scans today" always comes live from scan_events, never scan_daily's
  // rollup (it lags up to an hour behind, D8) — same reasoning
  // lib/analytics.ts's rangeWindowUtc doc comment gives ("the live layer is
  // responsible for 'today'").
  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  // P9.6-U2: these four reads depend only on userId/range (both already
  // resolved above), not on each other, so they run in parallel rather than
  // sequentially. `scan_totals_by_day`/`scan_sparklines` (P9.6-U1) replace
  // what used to be a single code-id-less `scan_daily` select here — one
  // row per (code, day) pair with no code_id filter, silently truncated
  // past PostgREST's 1000-row cap at Pro scale (up to 91,250 rows for 250
  // codes x 365 days; see that migration's own doc comment). Splitting into
  // two RPCs bounds the chart query at the range length (<=365 rows,
  // regardless of how many codes the caller owns) and makes the per-row
  // sparklines below possible in the first place — a naive per-code-per-day
  // query for sparklines would hit the same 1000-row wall even faster than
  // the chart query did, so this is new capability, not just a fix.
  const [totalsResult, sparklinesResult, codesResult, todayResult] = await Promise.all([
    supabase.rpc("scan_totals_by_day", { start_date: startIso, end_date: endIso }),
    supabase.rpc("scan_sparklines", { start_date: startIso, end_date: endIso }),
    listDynamicCodesCore({ db: supabase, ownerId: userId }),
    supabase
      .from("scan_events")
      .select("id", { count: "exact", head: true })
      .gte("ts", todayStartIso),
  ]);

  const dailyRows = totalsResult.data ?? [];
  const codes = codesResult.ok ? codesResult.data : [];
  const scansToday = todayResult.count ?? 0;

  const sparklines = new Map<string, number[]>(
    (sparklinesResult.data ?? []).map((row) => [row.code_id, parseSparklinePoints(row.points)]),
  );

  // All-time total: qr_codes.scan_count, a denormalized lifetime counter —
  // unaffected by the selected range, exactly as today.
  const totalScans = codes.reduce((sum, code) => sum + code.scan_count, 0);
  const rangeTotal = dailyRows.reduce((sum, row) => sum + row.scans, 0);
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
          {/* P9.5-T7: the studio IS the create flow (components/studio/
              create-code.tsx's CreateCodeControl lives inside it, wired to
              the live payload/style being edited there) — there is no
              separate create route to deep-link to, so "Create code" here
              is an honest plain link to /studio, not a shortcut around it. */}
          <Button asChild className="shrink-0 gap-1.5">
            <Link href="/studio">
              <Plus className="size-3.5" aria-hidden />
              Create code
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        {/* One compact stat strip (P9.6-U2), replacing the old page's three
            top-level tiles AND codes-overview-panel.tsx's own two tiles
            below the chart. Hand-rolled bordered/divided container rather
            than the Card+CardContent padding defaults (which apply padding
            on all sides via two different elements) — same "bordered strip
            of grouped cells" register range-selector.tsx's own pill already
            uses in this file family. */}
        <Card>
          <CardContent className="grid grid-cols-2 divide-x divide-y divide-border/60 p-0 sm:grid-cols-4 sm:divide-y-0">
            <div className={STRIP_CELL_CLASS}>
              <StatTile
                label="All time"
                value={totalScans.toLocaleString()}
                labelClassName={STRIP_LABEL_CLASS}
              />
            </div>
            <div className={STRIP_CELL_CLASS}>
              <StatTile
                label={`Last ${rangeLabel(range)}`}
                value={rangeTotal.toLocaleString()}
                labelClassName={STRIP_LABEL_CLASS}
              />
            </div>
            <div className={STRIP_CELL_CLASS}>
              <StatTile
                label="Today"
                value={scansToday.toLocaleString()}
                labelClassName={STRIP_LABEL_CLASS}
              />
            </div>
            <div className={STRIP_CELL_CLASS}>
              <StatTile
                label="Active codes"
                value={activeCodes.toLocaleString()}
                caption={`of ${codeLimit}`}
                labelClassName={STRIP_LABEL_CLASS}
              />
            </div>
          </CardContent>
        </Card>

        <CodesOverviewPanel plan={plan} range={range} dailyRows={dailyRows} />

        {codes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No dynamic codes yet.{" "}
            <Link href="/studio" className="text-primary underline-offset-4 hover:underline">
              Create one in the studio
            </Link>
            .
          </p>
        ) : (
          <CodesTable codes={codes} sparklines={sparklines} />
        )}
      </main>
    </div>
  );
}
