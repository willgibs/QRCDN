-- pgTAP coverage for the scan aggregation RPCs (P9.6-U1). Run with
-- `supabase test db`. Source of truth for what's under test:
-- supabase/migrations/20260802000010_scan_aggregation.sql.
--
-- Both functions are `security invoker` — the FIRST functions in this
-- schema meant to be called directly by an authenticated user's own
-- PostgREST session rather than by pg_cron or the app's service-role admin
-- client. That means the "read own scan daily" / "own qr codes" RLS
-- policies are the ONLY thing standing between user A and user B's data —
-- unlike rollup.test.sql or api_usage.test.sql, which call security
-- DEFINER functions directly as the superuser/table-owner role and never
-- need to impersonate anyone. The cross-tenant negatives below are the
-- entire proof that choice is safe; mirrors rls.test.sql's two-user
-- impersonation pattern (`set local role authenticated` + `set local
-- request.jwt.claims`), not rollup.test.sql's.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- ============================================================ fixtures
-- User A: three dynamic codes. A1/A2 carry known scan_daily history across
-- three consecutive UTC days (today, yesterday, two days ago); A3 has NONE
-- at all, to prove scan_sparklines still emits a row for a never-scanned
-- code instead of silently omitting it. A1 also carries a FOURTH day one
-- day past the query window, to prove the window's end is exclusive.
-- User B: one dynamic code with a single, deliberately large/distinctive
-- scan count (999) inside the SAME window A queries — the cross-tenant
-- negatives assert user A never sees it and user B never sees A's rows.
-- User C: a real signed-up user who owns no codes at all, proving both
-- functions return empty (not an error) for a fresh account.
insert into auth.users (id, email) values
  ('a1a10001-0001-0001-0001-000000000001', 'agg-owner-a@agg-test.qrcdn.dev'),
  ('b1b10002-0002-0002-0002-000000000002', 'agg-owner-b@agg-test.qrcdn.dev'),
  ('c1c10003-0003-0003-0003-000000000003', 'agg-owner-c@agg-test.qrcdn.dev');

insert into public.qr_codes (id, owner_id, slug, kind, name, destination_url, style) values
  ('a1a10001-1111-1111-1111-000000000001', 'a1a10001-0001-0001-0001-000000000001', 'SPARKA1', 'dynamic', 'Agg fixture A1', 'https://a1.agg-test.example.com', '{"v":1}'::jsonb),
  ('a1a10001-2222-2222-2222-000000000002', 'a1a10001-0001-0001-0001-000000000001', 'SPARKA2', 'dynamic', 'Agg fixture A2', 'https://a2.agg-test.example.com', '{"v":1}'::jsonb),
  ('a1a10001-3333-3333-3333-000000000003', 'a1a10001-0001-0001-0001-000000000001', 'SPARKA3', 'dynamic', 'Agg fixture A3 (never scanned)', 'https://a3.agg-test.example.com', '{"v":1}'::jsonb),
  ('b1b10002-1111-1111-1111-000000000001', 'b1b10002-0002-0002-0002-000000000002', 'SPARKB1', 'dynamic', 'Agg fixture B1', 'https://b1.agg-test.example.com', '{"v":1}'::jsonb);

-- code A1: day-2 and day-0 present, day-1 deliberately MISSING (zero-fill
-- proof); day+1 present but outside the queried window (exclusive-end proof).
insert into public.scan_daily (code_id, day, scans, uniques) values
  ('a1a10001-1111-1111-1111-000000000001', current_date - 2, 5, 3),
  ('a1a10001-1111-1111-1111-000000000001', current_date,     7, 5),
  ('a1a10001-1111-1111-1111-000000000001', current_date + 1, 42, 42);

-- code A2: dense across all three queried days.
insert into public.scan_daily (code_id, day, scans, uniques) values
  ('a1a10001-2222-2222-2222-000000000002', current_date - 2, 2, 1),
  ('a1a10001-2222-2222-2222-000000000002', current_date - 1, 4, 2),
  ('a1a10001-2222-2222-2222-000000000002', current_date,     1, 1);

-- code A3: no scan_daily rows at all.

-- code B1: one large, distinctive day inside A's queried window.
insert into public.scan_daily (code_id, day, scans, uniques) values
  ('b1b10002-1111-1111-1111-000000000001', current_date - 1, 999, 999);

-- ============================================================ EXECUTE privilege (RPC-surface shape)
-- Both functions are meant to be called directly by an end user's session —
-- the opposite lockdown shape from every other RPC in this schema. Checked
-- as the default/superuser role since has_function_privilege introspects an
-- arbitrary named role regardless of who is currently executing.
select ok(
  has_function_privilege('authenticated', 'public.scan_totals_by_day(date, date)', 'EXECUTE'),
  'scan_totals_by_day: EXECUTE is granted to authenticated'
);

select ok(
  has_function_privilege('authenticated', 'public.scan_sparklines(date, date)', 'EXECUTE'),
  'scan_sparklines: EXECUTE is granted to authenticated'
);

select ok(
  not has_function_privilege('anon', 'public.scan_totals_by_day(date, date)', 'EXECUTE'),
  'scan_totals_by_day: EXECUTE is revoked from anon'
);

select ok(
  not has_function_privilege('anon', 'public.scan_sparklines(date, date)', 'EXECUTE'),
  'scan_sparklines: EXECUTE is revoked from anon'
);

-- ============================================================ act as user A
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1a10001-0001-0001-0001-000000000001","role":"authenticated"}';

-- --- scan_totals_by_day: correctness (summed across A1+A2+A3, A3 contributes
-- zero to every day; day+1 excluded by the half-open window). ---
select results_eq(
  $$ select day, scans, uniques from public.scan_totals_by_day(current_date - 2, current_date + 1) order by day $$,
  $$ values
      (current_date - 2, 7::bigint, 4::bigint),
      (current_date - 1, 4::bigint, 2::bigint),
      (current_date,     8::bigint, 6::bigint)
  $$,
  'scan_totals_by_day: user A gets exact per-day sums across A1+A2+A3 (A3 contributes nothing), day+1 excluded'
);

select is_empty(
  $$ select * from public.scan_totals_by_day(current_date - 2, current_date + 1) where scans = 999 or uniques = 999 $$,
  'scan_totals_by_day CROSS-TENANT NEGATIVE: user A never sees any trace of user B''s 999-scan day'
);

-- --- scan_sparklines: one row per owned dynamic code, zero-filled. ---
select results_eq(
  $$ select count(*) from public.scan_sparklines(current_date - 2, current_date + 1) $$,
  ARRAY[3::bigint],
  'scan_sparklines: user A gets exactly 3 rows, one per owned dynamic code (including the never-scanned one)'
);

select is(
  (select points from public.scan_sparklines(current_date - 2, current_date + 1) where code_id = 'a1a10001-1111-1111-1111-000000000001'),
  '[5, 0, 7]'::jsonb,
  'scan_sparklines: code A1 points are zero-filled for the missing middle day, day+1 excluded from the 3-element series'
);

select is(
  (select points from public.scan_sparklines(current_date - 2, current_date + 1) where code_id = 'a1a10001-2222-2222-2222-000000000002'),
  '[2, 4, 1]'::jsonb,
  'scan_sparklines: code A2 points match its dense 3-day scan history exactly, in day order'
);

select is(
  (select points from public.scan_sparklines(current_date - 2, current_date + 1) where code_id = 'a1a10001-3333-3333-3333-000000000003'),
  '[0, 0, 0]'::jsonb,
  'scan_sparklines: code A3 (never scanned) still appears with an all-zero series, not silently omitted'
);

select is_empty(
  $$ select * from public.scan_sparklines(current_date - 2, current_date + 1) where code_id = 'b1b10002-1111-1111-1111-000000000001' $$,
  'scan_sparklines CROSS-TENANT NEGATIVE: user A never sees user B''s code row'
);

-- ============================================================ act as user B
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1b10002-0002-0002-0002-000000000002","role":"authenticated"}';

select results_eq(
  $$ select day, scans, uniques from public.scan_totals_by_day(current_date - 2, current_date + 1) $$,
  $$ values (current_date - 1, 999::bigint, 999::bigint) $$,
  'scan_totals_by_day: user B sees only their own single day, exact values'
);

select is_empty(
  $$ select * from public.scan_totals_by_day(current_date - 2, current_date + 1) where scans in (7, 4, 8) $$,
  'scan_totals_by_day CROSS-TENANT NEGATIVE: user B never sees any of user A''s per-day totals'
);

select results_eq(
  $$ select count(*) from public.scan_sparklines(current_date - 2, current_date + 1) $$,
  ARRAY[1::bigint],
  'scan_sparklines: user B gets exactly 1 row (their own code only)'
);

select is(
  (select points from public.scan_sparklines(current_date - 2, current_date + 1) where code_id = 'b1b10002-1111-1111-1111-000000000001'),
  '[0, 999, 0]'::jsonb,
  'scan_sparklines: code B1''s 999-scan day lands at the correct (middle) position'
);

select is_empty(
  $$ select * from public.scan_sparklines(current_date - 2, current_date + 1)
     where code_id in (
       'a1a10001-1111-1111-1111-000000000001',
       'a1a10001-2222-2222-2222-000000000002',
       'a1a10001-3333-3333-3333-000000000003'
     ) $$,
  'scan_sparklines CROSS-TENANT NEGATIVE: user B never sees any of user A''s three code rows'
);

-- ============================================================ act as user C (zero codes)
set local role authenticated;
set local request.jwt.claims to '{"sub":"c1c10003-0003-0003-0003-000000000003","role":"authenticated"}';

select is_empty(
  $$ select * from public.scan_totals_by_day(current_date - 2, current_date + 1) $$,
  'scan_totals_by_day: a user who owns zero codes gets an empty result, not an error'
);

select is_empty(
  $$ select * from public.scan_sparklines(current_date - 2, current_date + 1) $$,
  'scan_sparklines: a user who owns zero codes gets an empty result, not an error'
);

select * from finish();

rollback;
