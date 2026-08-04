-- pgTAP coverage for kit attachment + hard-sync propagation (P9.8-B1).
-- Run with `supabase test db` (wraps pg_prove). Under test:
-- supabase/migrations/20260804000011_kit_sync.sql on top of the initial
-- schema + RLS policies.
--
-- Fixture idiom mirrors rls.test.sql: insert as the bypassing setup role,
-- then impersonate via `set local role authenticated` + jwt claims.
-- Everything rolls back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- ============================================================ fixtures
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@kitsync-test.qrcdn.dev'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@kitsync-test.qrcdn.dev');

insert into public.brand_kits (id, owner_id, name, style) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kit A', '{"v":1,"old":true}'::jsonb),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Kit B', '{"v":1}'::jsonb);

-- A1 + A2 attached to Kit A; A3 kit-less (frozen); B1 attached to Kit B.
insert into public.qr_codes (id, owner_id, slug, kind, name, destination_url, style, brand_kit_id) values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'KITSYNA1', 'dynamic', 'A1', 'https://a.example.com', '{"v":1,"old":true}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'KITSYNA2', 'dynamic', 'A2', 'https://a.example.com', '{"v":1,"old":true}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'KITSYNA3', 'dynamic', 'A3', 'https://a.example.com', '{"v":1,"frozen":true}'::jsonb, null),
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222222', 'KITSYNB1', 'dynamic', 'B1', 'https://b.example.com', '{"v":1}'::jsonb, '44444444-4444-4444-4444-444444444444');

-- ============================================================ structure
select has_index(
  'public', 'qr_codes', 'qr_codes_brand_kit_idx',
  'qr_codes_brand_kit_idx exists (partial, brand_kit_id not null)'
);

select has_function(
  'public', 'sync_kit_codes', array['uuid'],
  'sync_kit_codes(uuid) exists'
);

select ok(
  has_function_privilege('authenticated', 'public.sync_kit_codes(uuid)', 'execute'),
  'sync_kit_codes: authenticated can execute'
);

select ok(
  not has_function_privilege('anon', 'public.sync_kit_codes(uuid)', 'execute'),
  'sync_kit_codes: anon cannot execute'
);

-- ============================================================ act as user A
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- The real flow: the kit's style changes first (updateBrandKit's UPDATE),
-- then the sync call fans it out.
update public.brand_kits
   set style = '{"v":1,"fresh":true}'::jsonb
 where id = '33333333-3333-3333-3333-333333333333';

select results_eq(
  $$ select public.sync_kit_codes('33333333-3333-3333-3333-333333333333') $$,
  ARRAY[2],
  'sync_kit_codes: returns the count of attached codes it touched (2)'
);

select results_eq(
  $$ select count(*) from public.qr_codes
      where brand_kit_id = '33333333-3333-3333-3333-333333333333'
        and style = '{"v":1,"fresh":true}'::jsonb
        and style_version = 2 $$,
  ARRAY[2::bigint],
  'sync_kit_codes: both attached codes carry the kit''s new style at style_version 2'
);

select results_eq(
  $$ select count(*) from public.qr_codes
      where id = '55555555-5555-5555-5555-555555555553'
        and style = '{"v":1,"frozen":true}'::jsonb
        and style_version = 1 $$,
  ARRAY[1::bigint],
  'sync_kit_codes: the kit-less code stays frozen (style and version untouched)'
);

-- Cross-owner: RLS shows user A no Kit B row and no B codes -- the call is
-- a harmless no-op, not an error.
select results_eq(
  $$ select public.sync_kit_codes('44444444-4444-4444-4444-444444444444') $$,
  ARRAY[0],
  'sync_kit_codes: cross-owner call touches zero rows'
);

-- ============================================================ act as user B
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select count(*) from public.qr_codes
      where id = '66666666-6666-6666-6666-666666666661'
        and style = '{"v":1}'::jsonb
        and style_version = 1 $$,
  ARRAY[1::bigint],
  'sync_kit_codes: user B''s attached code was untouched by A''s cross-owner attempt'
);

select results_eq(
  $$ select public.sync_kit_codes('44444444-4444-4444-4444-444444444444') $$,
  ARRAY[1],
  'sync_kit_codes: user B syncing their own kit touches exactly their one attached code'
);

select * from finish();

rollback;
