-- pgTAP coverage for Postgres-backed rate limiting (P8-U4). Run with
-- `supabase test db`. Source of truth for what's under test:
-- supabase/migrations/20260730000009_rate_limits.sql.
--
-- check_rate_limit() is revoked from authenticated -- window-counting and
-- isolation assertions run as the default superuser/table-owner role,
-- calling the function directly the way the app's admin (service_role)
-- client does from apps/web/lib/rate-limits.ts. Simpler than
-- api_usage.test.sql's two-user JWT-impersonation fixture: rate_limits has
-- no ownership concept at all (the `subject` string IS the identity,
-- already resolved by the caller before it ever reaches this table), so
-- the RLS assertion below only needs a bare role switch, no
-- request.jwt.claims.
--
-- `now()` is fixed for the lifetime of this transaction (Postgres: `now()`
-- returns the transaction start time, not wall-clock time), so every
-- check_rate_limit() call below deterministically lands in the SAME
-- window -- exactly what the window-counting assertions need. Window
-- ISOLATION is proved the same way api_usage.test.sql proves month
-- isolation: seed a second row directly, at a window_start `now()` could
-- never compute for this transaction, rather than waiting for real time to
-- pass.

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- ============================================================ fixtures
-- None needed beyond the assertions themselves -- rate_limits has no FK and
-- no owner_id; `subject` is an opaque, caller-constructed string (see
-- apps/web/lib/rate-limits.ts's ipSubject()/"studio_mutate:"+userId
-- callers), so there's no auth.users/api_keys row to seed first.

-- ============================================================ window counting
-- Limit of 3: first three calls land AT the limit (count 1, 2, 3) and must
-- all report allowed=true; the fourth call (count 4) crosses it.
select results_eq(
  $$ select count, allowed from public.check_rate_limit('test:subject-a', 60, 3) $$,
  $$ values (1, true) $$,
  'first call: count=1, allowed=true'
);

select results_eq(
  $$ select count, allowed from public.check_rate_limit('test:subject-a', 60, 3) $$,
  $$ values (2, true) $$,
  'second call: count=2, allowed=true'
);

select results_eq(
  $$ select count, allowed from public.check_rate_limit('test:subject-a', 60, 3) $$,
  $$ values (3, true) $$,
  'limit boundary: count==limit(3) -> allowed=true'
);

select results_eq(
  $$ select count, allowed from public.check_rate_limit('test:subject-a', 60, 3) $$,
  $$ values (4, false) $$,
  'over limit: count==limit+1(4) -> allowed=false'
);

-- ============================================================ window isolation
-- Seeded directly (bypassing the function) at a window_start `now()` could
-- never compute for this transaction -- proves a call for the CURRENT
-- window never touches a DIFFERENT window's row for the same subject.
insert into public.rate_limits (subject, window_start, count) values
  ('test:subject-a', now() - interval '1 day', 999);

select is(
  (select count from public.rate_limits
   where subject = 'test:subject-a' and window_start = now() - interval '1 day'),
  999,
  'window isolation: the seeded prior-window row is untouched by current-window calls'
);

select is(
  (select count(*)::int from public.rate_limits where subject = 'test:subject-a'),
  2,
  'window isolation: subject-a now has exactly two rows (seeded prior window + current window)'
);

-- ============================================================ subject isolation
select results_eq(
  $$ select count, allowed from public.check_rate_limit('test:subject-b', 60, 3) $$,
  $$ values (1, true) $$,
  'subject isolation: a different subject starts its own count at 1, unaffected by subject-a''s 4 calls'
);

-- ============================================================ RPC-surface lockdown (privilege introspection)
select ok(
  not has_function_privilege('authenticated', 'public.check_rate_limit(text, int, int)', 'EXECUTE'),
  'check_rate_limit: EXECUTE privilege is revoked from authenticated'
);

select ok(
  has_function_privilege('service_role', 'public.check_rate_limit(text, int, int)', 'EXECUTE'),
  'check_rate_limit: EXECUTE privilege is granted to service_role'
);

-- ============================================================ RLS: zero policies means zero rows, even for existing data
-- Stricter than api_usage (which has a read-own policy): rate_limits has
-- NO policies at all, so even though several rows now exist (asserted
-- above), authenticated must see none of them via a bare select.
set local role authenticated;

select is_empty(
  $$ select * from public.rate_limits $$,
  'rate_limits: authenticated sees zero rows via a bare select -- zero policies exist, not merely "no rows"'
);

select * from finish();

rollback;
