-- API usage quotas (P7-U1). Design rationale: docs/DECISIONS.md D11, D14
-- (Pro API 10k/mo, apps/web/lib/entitlements.ts's apiMonthlyRequests).
-- Forward-only: never edit this file after it lands (agent-playbook rule).
--
-- One row per (key, UTC calendar month), incremented once per accepted
-- request by the /api/v1 route handler (P7-U3, not this migration) via the
-- admin/secret-key client. Deliberately monthly-bucketed rather than a
-- single running counter per key: month rollover is then "a new row",
-- never a reset job, and historical months stay queryable for usage UI.

create table public.api_usage (
  key_id uuid not null references public.api_keys on delete cascade,
  month  date not null,
  count  integer not null default 0,
  primary key (key_id, month)
);

alter table public.api_usage enable row level security;

-- Table-level grant, mirroring 20260721000004_explicit_grants.sql's blanket
-- "grant ... on all tables in schema public to authenticated": that
-- statement only covers tables that existed AT THE TIME it ran (001-003's
-- tables) — Supabase cloud provisions ALTER DEFAULT PRIVILEGES so every
-- *new* table auto-grants to authenticated, but a from-scratch CI/local
-- stack (built from these migration files alone, no cloud provisioning)
-- does not have that. api_usage is the first wholly new table since 004, so
-- without this grant `authenticated` gets a privilege-denied error before
-- RLS is even evaluated — caught by scratch-Postgres hand-verification
-- while building this migration (all insert/update/delete verbs granted,
-- same blanket shape as scan_events/scan_daily, so an attempted write from
-- `authenticated` fails with RLS's "violates row-level security policy"
-- rather than a table-privilege error — the no-write-policies stance below
-- is what actually blocks it).
grant select, insert, update, delete on public.api_usage to authenticated;

-- Owner read-only, same join-through-ownership shape as scan_events/
-- scan_daily (20260721000002_rls_policies.sql) — a key's owner can see their
-- own usage, nobody else can see anyone's.
create policy "read own api usage" on public.api_usage
  for select to authenticated
  using (exists (
    select 1 from public.api_keys k
    where k.id = key_id and k.owner_id = (select auth.uid())
  ));

-- Deliberately NO insert/update/delete policies for authenticated/anon: the
-- only writer is increment_api_usage below, called by the app's admin
-- (secret-key) client from the /api/v1 route handler — never PostgREST
-- directly, never the user's own session. Mirrors scan_events/scan_daily's
-- "no write policies at all" stance (D3/D8, hard rule: no client-side writes
-- to server-computed counters).

-- ============================================================ increment_api_usage
-- WHY an RPC, not a plain upsert from the app: PostgREST's upsert
-- (`on_conflict` + Prefer: resolution=merge-duplicates) can only ever
-- overwrite a column with the value you send — it cannot express
-- `count = count + 1` server-side. Two concurrent requests against the same
-- key in the same month would race: both read count=N, both send N+1, one
-- write is silently lost. An atomic `insert ... on conflict do update set
-- count = count + 1` inside a single statement closes that race — hence a
-- function, not a table write. This is the app's FIRST `.rpc()` call
-- (everything through P6 has been direct table reads/writes or a Worker/
-- cron-triggered function); the definer-fn lockdown pattern (security
-- definer + explicit revoke) is 20260723000007_scan_rollup.sql's, applied
-- here for the same reason: this function must run with the privileges to
-- write api_usage (which has no write policies for anyone) while still being
-- narrow enough that a caller can only ever increment-and-read a counter,
-- never touch another key's row or any other table.
--
-- WHY `grant ... to service_role` (unlike 007's rollup, granted to nobody
-- because pg_cron calls it as the Postgres superuser): this function's only
-- legitimate caller is the app's admin client authenticating as
-- service_role from the /api/v1 route handler on every accepted request —
-- there's no cron job in the loop. Revoking from public/anon/authenticated
-- and granting only to service_role means neither an end user's session nor
-- an unauthenticated caller can invoke it via PostgREST, but the app's
-- server-side admin client can.
--
-- WHY UTC month: matches D3/D8's existing UTC-day convention for scan_daily
-- (`(e.ts at time zone 'utc')::date`) and workers/redirect/src/scan-hash.ts's
-- UTC-dated salt rotation — one timezone convention across the whole schema,
-- not a second one invented for billing-adjacent counters. Computed
-- server-side, fresh on every call (`date_trunc('month', now() at time zone
-- 'utc')`) rather than passed in by the caller, so a client can never claim
-- a different month than "now" for its own row.
create or replace function public.increment_api_usage(p_key_id uuid, p_cap int)
returns table (count int, over_cap boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'utc'))::date;
  v_count int;
begin
  insert into public.api_usage (key_id, month, count)
  values (p_key_id, v_month, 1)
  on conflict (key_id, month) do update
    set count = public.api_usage.count + 1
  returning public.api_usage.count into v_count;

  return query select v_count, v_count > p_cap;
end;
$$;

revoke execute on function public.increment_api_usage(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_api_usage(uuid, int) to service_role;
