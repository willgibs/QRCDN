-- pgTAP pin for the tightened slug CHECK (P9.8-B3, migration
-- 20260804000012): 17 in, 18 out. Run with `supabase test db`.
-- Fixture idiom mirrors rls.test.sql; everything rolls back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@slugcap-test.qrcdn.dev');

select lives_ok(
  $$ insert into public.qr_codes (owner_id, slug, kind, name, destination_url, style)
     values ('11111111-1111-1111-1111-111111111111', 'ABCDEFGHJKMNPQRST', 'dynamic', 'Seventeen', 'https://a.example.com', '{"v":1}'::jsonb) $$,
  'slug check: a 17-character slug inserts (the new maximum)'
);

select throws_ok(
  $$ insert into public.qr_codes (owner_id, slug, kind, name, destination_url, style)
     values ('11111111-1111-1111-1111-111111111111', 'ABCDEFGHJKMNPQRSTV', 'dynamic', 'Eighteen', 'https://a.example.com', '{"v":1}'::jsonb) $$,
  '23514',
  'new row for relation "qr_codes" violates check constraint "qr_codes_slug_check"',
  'slug check: an 18-character slug is rejected by the tightened constraint'
);

select * from finish();

rollback;
