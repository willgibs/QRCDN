-- Postgres-backed application-level rate limiting (P8-U4). Design rationale:
-- docs/DECISIONS.md D11's amendment records rate limiting as blocked on a
-- Vercel Pro upgrade -- but that entry is about `@vercel/firewall`'s
-- checkRateLimit() + WAF rule specifically, the BURST (per-second) layer
-- sitting in front of the whole app. It was never a blocker for an
-- application-level limiter backed by this project's own Postgres, which
-- was simply never built until now. This migration + apps/web/lib/
-- rate-limits.ts ship one with zero new dependencies and no plan change --
-- two call sites: the public /p/{slug} password-unlock action (per (hashed
-- ip, slug), checked ahead of the scrypt password-verify cost) and the
-- Studio's mutation actions (per user). /developers' "no burst-level
-- (per-second) rate limiting yet" line stays true and un-amended by this
-- unit: that page describes the public API's WAF-layer gap specifically,
-- which this unit does not touch.
--
-- Fixed-window, not sliding/token-bucket: a window is identified by its
-- start instant (`floor(epoch(now()) / window_seconds) * window_seconds`),
-- and every call inside that window increments ONE counter row via a
-- single atomic `insert ... on conflict do update set count = count + 1
-- returning count` -- the identical race-free upsert-increment shape as
-- 20260723000008_api_usage.sql's increment_api_usage, just keyed by a
-- caller-chosen subject + a computed window instead of (key_id, month).
-- Simple, genuinely atomic under concurrent callers, and adequate for this
-- table's actual job -- an abuse backstop, not a precise leaky-bucket: a
-- caller can burst up to ~2x the limit across a window boundary (one
-- attempt late in a window plus another right at the start of the next),
-- an accepted, standard fixed-window tradeoff.
--
-- Fail-open contract (enforced in apps/web/lib/rate-limits.ts's
-- checkRateLimit, not in this SQL): an RPC error must never itself block a
-- legitimate caller. checkRateLimit() returns {allowed:true,
-- failedOpen:true} on ANY failure calling this function (network blip,
-- unexpected shape, etc.) and never throws -- this function only ever gets
-- to say "over limit" when it actually proved it counted the call.
--
-- Unlike api_usage (naturally bounded -- one row per api_keys row per
-- calendar month, and both keys and months are small, slowly-growing sets),
-- this table has NO natural bound: `subject` is caller-constructed
-- (hashed-ip+slug, or a user id) and every fresh window_start is a fresh
-- row, so without pruning this table grows forever. Hence the pg_cron
-- cleanup job below -- there is no equivalent job for api_usage because it
-- doesn't need one.
--
-- Forward-only: never edit this file after it lands (agent-playbook rule).

create table public.rate_limits (
  subject      text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (subject, window_start)
);

alter table public.rate_limits enable row level security;

-- Zero policies below, deliberately -- no UI, no PostgREST caller of any
-- role ever reads or writes this table directly; the only access path is
-- check_rate_limit() below, called by the app's admin (service_role)
-- client, which bypasses RLS entirely. The table-level grant is still
-- required even though nothing above the RPC ever exercises it directly --
-- the same gap 20260723000008_api_usage.sql's header documents in detail:
-- 20260721000004_explicit_grants.sql's blanket "grant ... on all tables in
-- schema public to authenticated" only covers tables that existed AT THE
-- TIME it ran. Supabase CLOUD provisions ALTER DEFAULT PRIVILEGES so every
-- *new* table auto-grants to authenticated there, but a from-scratch/CI
-- Postgres built from these migration files alone does not have that --
-- without this grant, `authenticated` gets a privilege-denied error before
-- RLS is even evaluated, which would make the pgTAP suite below prove a
-- privilege gap instead of the RLS gap (zero policies -> empty reads,
-- denied writes) it's actually meant to test.
grant select, insert, update, delete on public.rate_limits to authenticated;

-- ============================================================ check_rate_limit
-- Atomically counts one call against a fixed window and reports whether the
-- caller is still within `p_limit`. security definer + search_path lockdown
-- mirrors every other RPC in this schema (increment_api_usage,
-- rollup_scan_daily) -- runs with the privileges to write a table that has
-- no write policies for anyone, while staying narrow enough that a caller
-- can only ever increment-and-read ITS OWN subject's counter, never touch
-- another subject's row or any other table.
create or replace function public.check_rate_limit(
  p_subject text,
  p_window_seconds int,
  p_limit int
)
returns table (count int, allowed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (subject, window_start, count)
  values (p_subject, v_window_start, 1)
  on conflict (subject, window_start) do update
    set count = public.rate_limits.count + 1
  returning public.rate_limits.count into v_count;

  return query select v_count, v_count <= p_limit;
end;
$$;

-- WHY `grant ... to service_role` only (same shape as increment_api_usage,
-- unlike rollup_scan_daily's "granted to nobody" -- pg_cron there calls as
-- the Postgres superuser, no service role in that loop): this function's
-- only legitimate callers are apps/web/lib/rate-limits.ts's
-- checkRateLimit(), invoked from server actions using the app's admin
-- client. Revoking from public/anon/authenticated means neither an end
-- user's session nor an unauthenticated caller can invoke it via
-- PostgREST, but the app's server-side admin client can.
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ============================================================ pg_cron cleanup
-- pg_cron is already installed (20260723000007_scan_rollup.sql created the
-- extension and granted schema usage to postgres; both are database-wide,
-- not per-migration, so nothing here needs to repeat that setup) -- this
-- just schedules a second job alongside rollup_scan_daily_hourly. :17 past
-- the hour, deliberately off both the top-of-hour herd and 007's own :05
-- slot. A full calendar day of headroom (vs. the 5-minute windows this
-- table's two callers actually use, apps/web/lib/rate-limits.ts's
-- P_UNLOCK_LIMIT/STUDIO_MUTATE_LIMIT) means a window row is never pruned
-- while a caller could still be inside it.
--
-- cron.schedule() is upsert-by-name (Supabase docs, guides/cron/quickstart
-- -- see 007's own comment for the exact citation) -- re-running this
-- migration is therefore safe with no cron.unschedule() guard needed. Do
-- NOT "fix" this by adding one; it would just be dead code.
select cron.schedule('cleanup_rate_limits', '17 * * * *', $$ delete from public.rate_limits where window_start < now() - interval '1 day'; $$);
