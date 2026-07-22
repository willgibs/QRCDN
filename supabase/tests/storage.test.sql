-- pgTAP storage RLS coverage (P4-U1). Run with `supabase test db` (wraps
-- pg_prove). Source of truth for what's under test:
-- supabase/migrations/20260722000005_brand_logo_storage.sql.
--
-- Same two-fake-user pattern as supabase/tests/rls.test.sql: insert fixtures
-- as the default (superuser/table-owner) role, which bypasses RLS, then
-- `set local role` + `set local request.jwt.claims` to impersonate each
-- caller for the actual assertions. Everything rolls back at the end — no
-- fixture data or storage objects are left behind.

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- ============================================================ fixtures
-- Two users; the on_auth_user_created trigger auto-creates their profiles
-- (unused here, but kept for parity with rls.test.sql's fixture shape).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@rls-test.qrcdn.dev'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@rls-test.qrcdn.dev');

-- One pre-existing object per user, inserted as the bypassing setup role so
-- the SELECT assertions below have rows to prove owner-scoped access works.
insert into storage.objects (bucket_id, name) values
  ('brand-logos', '11111111-1111-1111-1111-111111111111/existing-kit.png'),
  ('brand-logos', '22222222-2222-2222-2222-222222222222/existing-kit.png');

-- ============================================================ act as user A
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select count(*) from storage.objects where bucket_id = 'brand-logos' $$,
  ARRAY[1::bigint],
  'brand-logos: user A sees only their own object'
);

select is_empty(
  $$ select * from storage.objects where bucket_id = 'brand-logos' and name = '22222222-2222-2222-2222-222222222222/existing-kit.png' $$,
  'brand-logos: user A cannot select user B''s object'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand-logos', '11111111-1111-1111-1111-111111111111/new-kit.png') $$,
  'brand-logos: user A can insert an object under their own uid folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand-logos', '22222222-2222-2222-2222-222222222222/hacked.png') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'brand-logos: user A cannot insert an object under user B''s uid folder'
);

-- ============================================================ act as anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand-logos', '11111111-1111-1111-1111-111111111111/anon.png') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'brand-logos: anon cannot insert an object, even under an existing uid folder'
);

select is_empty(
  $$ select * from storage.objects where bucket_id = 'brand-logos' $$,
  'brand-logos: anon cannot select any object'
);

select * from finish();

rollback;
