-- Scan aggregation RPCs (P9.6-U1). Design rationale: docs/DECISIONS.md D8.
-- Forward-only: never edit this file after it lands (agent-playbook rule).
--
-- Two real defects motivate this migration, both already documented at the
-- call sites that will adopt these functions in a later unit (U2 wires them
-- up; this migration lands alone, no new callers):
--
--   1. apps/web/lib/analytics.ts's `sumDailyAcrossCodes` doc comment: an
--      all-codes `scan_daily` query (no `code_id` filter, relying on RLS to
--      scope to "every one of the caller's codes") returns one row per
--      (code, day) pair. At Pro scale (250 codes x 365 days) that's 91,250
--      rows against PostgREST's `max_rows` cap of 1000 (supabase/config.toml)
--      -- truncated SILENTLY, no error, producing an undercounted chart with
--      no indication anything was dropped. That comment names the fix:
--      move the per-day sum into a database function so Postgres, not
--      PostgREST, returns one row per day.
--   2. The same shape breaks worse for a per-code sparkline (one small trend
--      chart per code in a list): naively selecting per (code, day) rows for
--      a sparkline truncates exactly like defect 1, and there is no
--      "collapse across codes" move available (unlike the totals case,
--      where summing across codes is the whole point) since each code needs
--      its OWN series.
--
-- ============================================================ security invoker, not definer
-- Both functions below are `security invoker`, a deliberate correction to
-- the analytics.ts comment's own suggestion ("security-definer RPC"). The
-- aggregation itself happens inside Postgres either way -- that's what
-- solves both defects above, since only the already-aggregated rows (one
-- per day, or one per code) ever cross PostgREST regardless of which
-- security mode is used. The difference is tenancy: a security definer
-- function runs as its owner and bypasses RLS, so it would have to
-- re-implement owner filtering by hand inside the function body (one more
-- place to get tenancy wrong, and a second implementation of the exact
-- ownership rule "read own scan daily" already encodes). `security invoker`
-- runs as the calling role instead, so the existing RLS policy --
-- "read own scan daily" (20260721000002_rls_policies.sql:50-55, an
-- owner-join through qr_codes: `exists (select 1 from qr_codes c where
-- c.id = code_id and c.owner_id = auth.uid())`) and "own qr codes"
-- (same file) -- keeps doing the one job it already does correctly, and
-- stays the ONLY tenant boundary either function relies on. This is the
-- opposite lockdown shape from every other function in this schema
-- (rollup_scan_daily, increment_api_usage, check_rate_limit are all
-- security definer, revoked from authenticated, callable only by pg_cron or
-- the app's service-role admin client) -- those exist to let a narrow,
-- trusted caller cross tenant boundaries deliberately (a bulk rollup, a
-- counter increment). These two exist for the OPPOSITE reason: a normal
-- authenticated user calling PostgREST's RPC surface directly, who must
-- never see past their own rows. Proven in supabase/tests/
-- scan_aggregation.test.sql's cross-tenant negatives -- if that test did not
-- exist, this security argument would be unproven.
--
-- `set search_path = ''` on both, matching every function in this schema:
-- pg_catalog is always implicitly searched regardless, so builtins
-- (generate_series, jsonb_agg, sum, coalesce) still resolve; every
-- user-schema reference below is fully qualified (`public.scan_daily`,
-- `public.qr_codes`) so nothing depends on the caller's own search_path.

-- ============================================================ scan_totals_by_day
-- Per-day totals summed across EVERY code the caller owns -- the RPC
-- replacement for defect 1's query (app/(app)/codes/page.tsx's global scan
-- chart). `[start_date, end_date)`, half-open exclusive end, matching
-- apps/web/lib/analytics.ts's `rangeWindowUtc` convention exactly (its own
-- doc comment: "end is today's UTC midnight, exclusive") -- callers pass
-- `rangeWindowUtc()`'s own output straight through with no translation.
--
-- Sparse output, deliberately: a day with zero scans across every one of the
-- caller's codes produces NO row, exactly like the raw per-(code,day) query
-- it replaces and exactly like `sumDailyAcrossCodes`'s existing output
-- shape. This is NOT a second zero-fill convention -- `toChartSeries`
-- (analytics.ts:103) already zero-fills sparse day-keyed rows for every
-- existing call site, and this function's `(day, scans, uniques)` row shape
-- is exactly `toChartSeries`'s expected input shape, so a future caller
-- swaps `sumDailyAcrossCodes(rawQuery)` for `scan_totals_by_day(start,end)`
-- feeding the SAME `toChartSeries` call, unchanged. Bounded at ~365 rows
-- (the longest plan window, Pro's analyticsRetentionDays) regardless of how
-- many codes the caller owns -- the entire point.
create or replace function public.scan_totals_by_day(start_date date, end_date date)
returns table (day date, scans bigint, uniques bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    sd.day,
    sum(sd.scans)    as scans,
    sum(sd.uniques)  as uniques
  from public.scan_daily sd
  where sd.day >= start_date
    and sd.day <  end_date
  group by sd.day
  order by sd.day;
$$;

-- ============================================================ scan_sparklines
-- One row PER CODE (never one row per (code, day) -- that shape is the
-- defect this function exists to avoid): `points` is a bare ordered jsonb
-- array of daily scan counts, one element per day in `[start_date,
-- end_date)`, ascending. Bare numbers, not `{day, scans}` objects -- smaller
-- over the wire at the shape this is built for (up to 250 codes x up to 365
-- points each), and the caller already has `start_date` (it supplied the
-- argument), so day `i` is trivially `start_date + i` with no per-point
-- label needed.
--
-- Zero-fill contract, stated once and unambiguously since this shape has no
-- existing convention to inherit (unlike scan_totals_by_day above, which
-- deliberately reuses toChartSeries's sparse-rows-then-client-zero-fills
-- convention): `points` is ALWAYS dense, exactly `end_date - start_date`
-- elements long, one per calendar day, zero for any day with no scan_daily
-- row. The function does the zero-filling; nothing about this shape would
-- even be interpretable if it didn't, since a sparse array has no room for
-- per-element day labels. Do not layer a second client-side zero-fill on
-- top of this one.
--
-- Driven from `qr_codes`, not from `scan_daily`: EVERY dynamic code the
-- caller owns gets exactly one row, all-zero `points` if it has no scan
-- activity at all in the window. A per-code sparkline list must not silently
-- omit a brand-new or quiet code -- that would look like a missing row, not
-- a zero value. `kind = 'dynamic'` excludes static codes on purpose: a
-- static code's payload is encoded directly into the printed QR and never
-- round-trips through qrcdn.com's redirect Worker (D1-D3), so it can never
-- have a scan_events/scan_daily row to begin with, and static codes are
-- unlimited even on free (D14) -- counting them would break the "max 250 on
-- Pro" row bound that only holds for the capped, dynamic-only count.
create or replace function public.scan_sparklines(start_date date, end_date date)
returns table (code_id uuid, points jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id as code_id,
    jsonb_agg(coalesce(sd.scans, 0) order by day_scaffold.day) as points
  from public.qr_codes c
  cross join generate_series(
    start_date::timestamp, (end_date - 1)::timestamp, interval '1 day'
  ) as day_scaffold(day)
  left join public.scan_daily sd
    on sd.code_id = c.id and sd.day = day_scaffold.day::date
  where c.kind = 'dynamic'
  group by c.id
  order by c.id;
$$;

-- ============================================================ supporting index
-- scan_daily's only existing index is its primary key, (code_id, day) --
-- perfect for "this code's rows" (scan_sparklines' join, one code at a
-- time) but useless for "every row in a day range across every code",
-- which both scan_totals_by_day above and the retention purge
-- (apps/web/lib/purge.ts's new purgeScanDailyRollups, this same unit) do.
-- (day, code_id) rather than (day) alone: code_id along for the ride costs
-- little and lets a day-range scan avoid a heap fetch to get it.
create index scan_daily_day_code_idx on public.scan_daily (day, code_id);

-- ============================================================ grants
-- Postgres grants EXECUTE to PUBLIC by default on function creation --
-- revoke first (matching every other function in this schema:
-- 20260721000003_lock_trigger_function.sql, 20260723000007_scan_rollup.sql,
-- 20260723000008_api_usage.sql, 20260730000009_rate_limits.sql) then grant
-- back explicitly, per 20260721000004_explicit_grants.sql's stated
-- convention. `authenticated` only -- unlike every prior RPC in this schema
-- (granted to service_role or nobody), these two are the first meant to be
-- called directly by an end user's own session, which is exactly why they
-- are `security invoker`: PostgREST executes an RPC call as the calling
-- role, so `authenticated` here is what puts the caller's own RLS-scoped
-- session behind the function body.
revoke execute on function public.scan_totals_by_day(date, date) from public, anon, authenticated;
grant execute on function public.scan_totals_by_day(date, date) to authenticated;

revoke execute on function public.scan_sparklines(date, date) from public, anon, authenticated;
grant execute on function public.scan_sparklines(date, date) to authenticated;
