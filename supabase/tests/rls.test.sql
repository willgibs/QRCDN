-- pgTAP RLS coverage (P3). Run with `supabase test db` (wraps pg_prove).
-- Source of truth for what's under test: supabase/migrations/*.sql
-- (20260721000001_initial_schema.sql, 20260721000002_rls_policies.sql).
--
-- Two fake auth.users simulate cross-tenant access: insert as the default
-- (superuser/table-owner) role, which bypasses RLS, then `set local role
-- authenticated` + `set local request.jwt.claims` to impersonate each user
-- for the actual assertions. Everything rolls back at the end — no fixture
-- data is left behind.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- ============================================================ fixtures
-- Two users; the on_auth_user_created trigger auto-creates their profiles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@rls-test.qrcdn.dev'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@rls-test.qrcdn.dev');

insert into public.brand_kits (id, owner_id, name, style) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kit A', '{"v":1}'::jsonb),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Kit B', '{"v":1}'::jsonb);

insert into public.qr_codes (id, owner_id, slug, kind, destination_url, style) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'QRTESTA1', 'dynamic', 'https://a.example.com', '{"v":1}'::jsonb),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'QRTESTB1', 'dynamic', 'https://b.example.com', '{"v":1}'::jsonb);

insert into public.api_keys (id, owner_id, name, key_prefix, key_hash) values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Key A', 'qrcdn_live_aaaa', decode('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex')),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Key B', 'qrcdn_live_bbbb', decode('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'hex'));

-- Seed a scan for code A directly (as the bypassing setup role) so the
-- read-only scan policies have a row to prove owner-scoped SELECT works.
insert into public.scan_events (code_id, country) values
  ('55555555-5555-5555-5555-555555555555', 'US');
insert into public.scan_daily (code_id, day, scans, uniques) values
  ('55555555-5555-5555-5555-555555555555', current_date, 5, 3);

-- ============================================================ act as user A
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- --- brand_kits ---
select results_eq(
  $$ select count(*) from public.brand_kits $$,
  ARRAY[1::bigint],
  'brand_kits: user A sees only their own kit'
);

select is_empty(
  $$ select * from public.brand_kits where id = '44444444-4444-4444-4444-444444444444' $$,
  'brand_kits: user A cannot select user B''s kit'
);

select results_eq(
  $$ update public.brand_kits set name = 'Hacked' where id = '44444444-4444-4444-4444-444444444444' returning 1 $$,
  $$ select 1 where false $$,
  'brand_kits: user A cannot update user B''s kit'
);

select results_eq(
  $$ delete from public.brand_kits where id = '44444444-4444-4444-4444-444444444444' returning 1 $$,
  $$ select 1 where false $$,
  'brand_kits: user A cannot delete user B''s kit'
);

-- --- qr_codes ---
select results_eq(
  $$ select count(*) from public.qr_codes $$,
  ARRAY[1::bigint],
  'qr_codes: user A sees only their own code'
);

select is_empty(
  $$ select * from public.qr_codes where id = '66666666-6666-6666-6666-666666666666' $$,
  'qr_codes: user A cannot select user B''s code'
);

select results_eq(
  $$ update public.qr_codes set status = 'paused' where id = '66666666-6666-6666-6666-666666666666' returning 1 $$,
  $$ select 1 where false $$,
  'qr_codes: user A cannot update user B''s code'
);

select results_eq(
  $$ delete from public.qr_codes where id = '66666666-6666-6666-6666-666666666666' returning 1 $$,
  $$ select 1 where false $$,
  'qr_codes: user A cannot delete user B''s code'
);

-- --- scan_events / scan_daily: no write policies at all for authenticated,
-- even on the caller's own code (hard rule: no per-scan writes, D8/D3 — the
-- redirect Worker writes via the secret-key client, which bypasses RLS). ---
select throws_ok(
  $$ insert into public.scan_events (code_id, country) values ('55555555-5555-5555-5555-555555555555', 'CA') $$,
  '42501',
  'new row violates row-level security policy for table "scan_events"',
  'scan_events: authenticated cannot INSERT, even into their own code''s events'
);

select throws_ok(
  $$ insert into public.scan_daily (code_id, day, scans) values ('55555555-5555-5555-5555-555555555555', current_date + 1, 1) $$,
  '42501',
  'new row violates row-level security policy for table "scan_daily"',
  'scan_daily: authenticated cannot INSERT, even a rollup for their own code'
);

select results_eq(
  $$ select count(*) from public.scan_events where code_id = '55555555-5555-5555-5555-555555555555' $$,
  ARRAY[1::bigint],
  'scan_events: user A can still read their own code''s events'
);

select results_eq(
  $$ select count(*) from public.scan_daily where code_id = '55555555-5555-5555-5555-555555555555' $$,
  ARRAY[1::bigint],
  'scan_daily: user A can still read their own code''s rollup'
);

-- --- profiles: plan is server-computed only — column-level grants (not
-- RLS) stop self-service escalation, even on the caller's own row. ---
select throws_ok(
  $$ update public.profiles set plan = 'pro' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  'permission denied for table profiles',
  'profiles: user A cannot escalate their own plan column'
);

select lives_ok(
  $$ update public.profiles set display_name = 'A' where id = '11111111-1111-1111-1111-111111111111' $$,
  'profiles: user A can still update their own display_name'
);

select is_empty(
  $$ select * from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'profiles: user A cannot select user B''s profile'
);

-- --- api_keys ---
select results_eq(
  $$ select count(*) from public.api_keys $$,
  ARRAY[1::bigint],
  'api_keys: user A sees only their own key'
);

select is_empty(
  $$ select * from public.api_keys where id = '88888888-8888-8888-8888-888888888888' $$,
  'api_keys: user A cannot select user B''s key'
);

select results_eq(
  $$ delete from public.api_keys where id = '88888888-8888-8888-8888-888888888888' returning 1 $$,
  $$ select 1 where false $$,
  'api_keys: user A cannot delete user B''s key'
);

select * from finish();

rollback;
