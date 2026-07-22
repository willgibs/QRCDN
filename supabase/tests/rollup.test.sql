-- pgTAP coverage for the scan rollup (P6-U1). Run with `supabase test db`.
-- Source of truth for what's under test: supabase/migrations/20260723000007_scan_rollup.sql.
--
-- rollup_scan_daily() is revoked from authenticated (RPC-surface lockdown is
-- proven in rls.test.sql's style, not duplicated here) — every assertion
-- below runs as the default superuser/table-owner role, calling the
-- function directly the way pg_cron does.

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- ============================================================ _cap_top_n_jsonb

select is(
  public._cap_top_n_jsonb('{"a":1,"b":2}'::jsonb, 50),
  '{"a":1,"b":2}'::jsonb,
  '_cap_top_n_jsonb: under-cap tally passes through unchanged'
);

select is(
  public._cap_top_n_jsonb('{"a":10,"b":8,"c":5,"d":3}'::jsonb, 2),
  '{"a":10,"b":8,"other":8}'::jsonb,
  '_cap_top_n_jsonb: over-cap keeps top-N and sums the tail into "other"'
);

select is(
  public._cap_top_n_jsonb('{}'::jsonb, 50),
  '{}'::jsonb,
  '_cap_top_n_jsonb: empty tally stays empty'
);

-- ============================================================ fixtures
-- One owner, two codes: A accrues scan_events across today/yesterday/3-days-
-- ago; B gets none, and starts with a nonzero scan_count set directly
-- (bypassing rollup) to prove the final qr_codes update stays scoped to
-- codes actually touched by the run, per the migration's own comment.
insert into auth.users (id, email) values
  ('99990001-0001-0001-0001-000000000001', 'rollup-owner@rollup-test.qrcdn.dev');

insert into public.qr_codes (id, owner_id, slug, kind, name, destination_url, style) values
  ('99990002-0002-0002-0002-000000000002', '99990001-0001-0001-0001-000000000001', 'QRROLLUPA', 'dynamic', 'Rollup fixture A', 'https://a.rollup-test.example.com', '{"v":1}'::jsonb),
  ('99990003-0003-0003-0003-000000000003', '99990001-0001-0001-0001-000000000001', 'QRROLLUPB', 'dynamic', 'Rollup fixture B', 'https://b.rollup-test.example.com', '{"v":1}'::jsonb);

update public.qr_codes set scan_count = 42 where id = '99990003-0003-0003-0003-000000000003';

-- Today: 3 events, 2 distinct ip_hash (uniques < scans), one row with null
-- referer + null city to prove direct/unknown coalescing.
insert into public.scan_events (code_id, ts, country, city, device, referer, ip_hash) values
  ('99990002-0002-0002-0002-000000000002', now(), 'US', 'New York', 'mobile',  'https://google.com',  '\x01'::bytea),
  ('99990002-0002-0002-0002-000000000002', now(), 'US', null,       'desktop', null,                   '\x01'::bytea),
  ('99990002-0002-0002-0002-000000000002', now(), 'CA', 'Toronto',  'mobile',  'https://twitter.com', '\x02'::bytea);

-- Yesterday: 2 identical events, same ip_hash (uniques=1, scans=2).
insert into public.scan_events (code_id, ts, country, city, device, referer, ip_hash) values
  ('99990002-0002-0002-0002-000000000002', now() - interval '1 day', 'GB', 'London', 'mobile', 'https://bing.com', '\x03'::bytea),
  ('99990002-0002-0002-0002-000000000002', now() - interval '1 day', 'GB', 'London', 'mobile', 'https://bing.com', '\x03'::bytea);

-- 3 days ago: outside the default 1-day window, in scope for a 7-day backfill.
insert into public.scan_events (code_id, ts, country, city, device, referer, ip_hash) values
  ('99990002-0002-0002-0002-000000000002', now() - interval '3 days', 'FR', 'Paris', 'desktop', 'https://example.com', '\x04'::bytea);

-- ============================================================ default-window rollup
select public.rollup_scan_daily();

select results_eq(
  $$ select scans, uniques from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date $$,
  $$ values (3, 2) $$,
  'today: scans=3, uniques=2 (repeated ip_hash deduped)'
);

select is(
  (select by_country from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date),
  '{"US":2,"CA":1}'::jsonb,
  'today: by_country tally'
);

select is(
  (select by_device from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date),
  '{"mobile":2,"desktop":1}'::jsonb,
  'today: by_device tally'
);

select is(
  (select by_referer from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date),
  '{"https://google.com":1,"direct":1,"https://twitter.com":1}'::jsonb,
  'today: by_referer tally, null referer coalesced to "direct"'
);

select is(
  (select by_city from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date),
  '{"New York":1,"unknown":1,"Toronto":1}'::jsonb,
  'today: by_city tally, null city coalesced to "unknown"'
);

select results_eq(
  $$ select scans, uniques from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = ((now() - interval '1 day') at time zone 'utc')::date $$,
  $$ values (2, 1) $$,
  'yesterday: scans=2, uniques=1 (identical repeated event)'
);

select is(
  (select by_country from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = ((now() - interval '1 day') at time zone 'utc')::date),
  '{"GB":2}'::jsonb,
  'yesterday: by_country tally'
);

select is(
  (select scan_count from public.qr_codes where id = '99990002-0002-0002-0002-000000000002'),
  5::bigint,
  'qr_codes.scan_count: code A sums today(3) + yesterday(2) = 5'
);

select is(
  (select scan_count from public.qr_codes where id = '99990003-0003-0003-0003-000000000003'),
  42::bigint,
  'qr_codes.scan_count: untouched code B is left alone (scoped update, not a global rewrite)'
);

select is_empty(
  $$ select 1 from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = ((now() - interval '3 days') at time zone 'utc')::date $$,
  'default 1-day window: the 3-days-ago event has no scan_daily row yet'
);

-- ============================================================ idempotency
-- No new events between calls; re-running must reproduce the same numbers,
-- never double-count (the upsert is a full recompute, not an increment).
select public.rollup_scan_daily();

select results_eq(
  $$ select scans, uniques from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = (now() at time zone 'utc')::date $$,
  $$ values (3, 2) $$,
  'idempotency: re-running with no new events reproduces the same today row'
);

-- ============================================================ backfill window
select public.rollup_scan_daily(7);

select results_eq(
  $$ select scans, uniques from public.scan_daily where code_id = '99990002-0002-0002-0002-000000000002' and day = ((now() - interval '3 days') at time zone 'utc')::date $$,
  $$ values (1, 1) $$,
  'window_days=7: the 3-days-ago event now has a scan_daily row'
);

select is(
  (select scan_count from public.qr_codes where id = '99990002-0002-0002-0002-000000000002'),
  6::bigint,
  'qr_codes.scan_count: grows to 6 once the widened window picks up the 3-days-ago event'
);

select * from finish();

rollback;
