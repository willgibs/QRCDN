-- pgTAP coverage for API usage quotas (P7-U1). Run with `supabase test db`.
-- Source of truth for what's under test: supabase/migrations/20260723000008_api_usage.sql.
--
-- increment_api_usage() is revoked from authenticated — count/cap-boundary/
-- month-isolation assertions run as the default superuser/table-owner role,
-- calling the function directly the way the /api/v1 route's admin
-- (service_role) client does. RLS + EXECUTE-lockdown assertions switch role
-- to authenticated + impersonate a JWT, mirroring rls.test.sql's two-user
-- pattern.

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- ============================================================ fixtures
-- Two users, one api_key each — same shape as rls.test.sql's fixture A/B.
insert into auth.users (id, email) values
  ('aaaa0001-0001-0001-0001-000000000001', 'usage-owner-a@usage-test.qrcdn.dev'),
  ('bbbb0002-0002-0002-0002-000000000002', 'usage-owner-b@usage-test.qrcdn.dev');

insert into public.api_keys (id, owner_id, name, key_prefix, key_hash) values
  ('aaaa0003-0003-0003-0003-000000000003', 'aaaa0001-0001-0001-0001-000000000001', 'Key A', 'qrcdn_live_aaaa', decode('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex')),
  ('bbbb0004-0004-0004-0004-000000000004', 'bbbb0002-0002-0002-0002-000000000002', 'Key B', 'qrcdn_live_bbbb', decode('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'hex'));

-- A row seeded directly (bypassing the function, as the setup role) for a
-- PAST UTC month on key A — proves current-month increments never touch a
-- different month's row.
insert into public.api_usage (key_id, month, count) values
  ('aaaa0003-0003-0003-0003-000000000003',
   (date_trunc('month', now() at time zone 'utc') - interval '1 month')::date,
   999);

-- ============================================================ increment + cap boundary
-- Cap of 3: first three calls land AT the cap (count 1, 2, 3) and must all
-- report over_cap=false; the fourth call (count 4) crosses it.
select results_eq(
  $$ select count, over_cap from public.increment_api_usage('aaaa0003-0003-0003-0003-000000000003'::uuid, 3) $$,
  $$ values (1, false) $$,
  'first increment: count=1, over_cap=false'
);

select results_eq(
  $$ select count, over_cap from public.increment_api_usage('aaaa0003-0003-0003-0003-000000000003'::uuid, 3) $$,
  $$ values (2, false) $$,
  'second increment: count=2, over_cap=false'
);

select results_eq(
  $$ select count, over_cap from public.increment_api_usage('aaaa0003-0003-0003-0003-000000000003'::uuid, 3) $$,
  $$ values (3, false) $$,
  'cap boundary: count==cap(3) -> over_cap=false'
);

select results_eq(
  $$ select count, over_cap from public.increment_api_usage('aaaa0003-0003-0003-0003-000000000003'::uuid, 3) $$,
  $$ values (4, true) $$,
  'cap boundary: count==cap+1(4) -> over_cap=true'
);

-- ============================================================ month isolation
select is(
  (select count from public.api_usage
   where key_id = 'aaaa0003-0003-0003-0003-000000000003'::uuid
     and month = (date_trunc('month', now() at time zone 'utc') - interval '1 month')::date),
  999,
  'month isolation: the seeded prior-month row is untouched by current-month increments'
);

select is(
  (select count(*)::int from public.api_usage where key_id = 'aaaa0003-0003-0003-0003-000000000003'::uuid),
  2,
  'month isolation: key A now has exactly two rows (seeded past month + current month)'
);

-- ============================================================ key isolation
select is(
  (select count(*)::int from public.api_usage where key_id = 'bbbb0004-0004-0004-0004-000000000004'::uuid),
  0,
  'key isolation: key B has no usage rows -- key A''s increments never touched it'
);

-- ============================================================ RPC-surface lockdown (privilege introspection)
select ok(
  not has_function_privilege('authenticated', 'public.increment_api_usage(uuid, int)', 'EXECUTE'),
  'increment_api_usage: EXECUTE privilege is revoked from authenticated'
);

select ok(
  has_function_privilege('service_role', 'public.increment_api_usage(uuid, int)', 'EXECUTE'),
  'increment_api_usage: EXECUTE privilege is granted to service_role'
);

-- ============================================================ act as user A
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaa0001-0001-0001-0001-000000000001","role":"authenticated"}';

select results_eq(
  $$ select count(*) from public.api_usage where key_id = 'aaaa0003-0003-0003-0003-000000000003'::uuid $$,
  ARRAY[2::bigint],
  'api_usage: user A can read their own key''s usage rows'
);

select is_empty(
  $$ select * from public.api_usage where key_id = 'bbbb0004-0004-0004-0004-000000000004'::uuid $$,
  'api_usage: user A cannot read user B''s key usage (cross-tenant SELECT empty)'
);

select throws_ok(
  $$ insert into public.api_usage (key_id, month, count) values ('aaaa0003-0003-0003-0003-000000000003'::uuid, current_date, 1) $$,
  '42501',
  'new row violates row-level security policy for table "api_usage"',
  'api_usage: authenticated cannot INSERT, even for their own key (no write policy exists)'
);

select throws_ok(
  $$ select public.increment_api_usage('aaaa0003-0003-0003-0003-000000000003'::uuid, 3) $$,
  '42501',
  'permission denied for function increment_api_usage',
  'increment_api_usage: authenticated cannot EXECUTE (RPC surface locked down, only service_role may call it)'
);

select * from finish();

rollback;
