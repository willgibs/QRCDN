-- Scan rollup (P6-U1). Design rationale: docs/DECISIONS.md D8.
-- Forward-only: never edit this file after it lands (agent-playbook rule).
--
-- D8: `scan_events` append-only -> pg_cron hourly upsert into `scan_daily`.
-- Amendment vs. the original D8 text ("nightly scan_count update"): the
-- scan_count maintenance folds into this same hourly function instead of a
-- separate nightly job — one less moving part, and codes light up their
-- scan_count within the hour instead of overnight. Retention purge is
-- deliberately NOT implemented here: it needs entitlement values (free 30d
-- vs. Pro 365d retention) which live in apps/web/lib/entitlements.ts only
-- (hard rule) — a DB function can't see that module, so purge runs app-side
-- on a schedule that calls into entitlements.

-- ============================================================ scan_daily: new dimensions
alter table public.scan_daily
  add column by_referer jsonb not null default '{}',
  add column by_city    jsonb not null default '{}';

-- ============================================================ _cap_top_n_jsonb
-- Keeps the top-`cap` keys of a {"key": count} tally object (ranked by count
-- desc) and sums every remaining key into an "other" bucket. Never drops
-- data — unbounded cardinality (referer/city especially) must not turn
-- scan_daily rows into unbounded-size jsonb blobs, but every scan still
-- counts somewhere. Empty input -> empty output.
create or replace function public._cap_top_n_jsonb(tally jsonb, cap int default 50)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(bucket, total), '{}'::jsonb)
  from (
    select case when rn <= cap then key else 'other' end as bucket,
           sum(v)::int as total
    from (
      select key, (value)::int as v,
             row_number() over (order by (value)::int desc) as rn
      from jsonb_each_text(tally)
    ) ranked
    group by bucket
  ) grouped;
$$;

-- ============================================================ rollup_scan_daily
-- Full-day recompute (idempotent) of UTC day buckets, forward from
-- `window_days` ago through now. Re-running for the same window always
-- reproduces the same scan_daily rows — this is what makes the hourly
-- schedule safe to also use as a manual backfill lever (see the window_days
-- argument; pgTAP exercises this in rollup.test.sql).
--
-- security definer: reads raw scan_events (RLS-protected, owner-only select)
-- and writes scan_daily/qr_codes on behalf of every owner in one pass — a
-- bulk rollup write, never a per-scan write (hard rule). Must NOT be
-- reachable via PostgREST (see revokes below) — an authenticated caller
-- invoking this at will would be a free-standing DoS lever (forces a full
-- table scan over scan_events) even though it can't read other owners' data
-- through it directly.
create or replace function public.rollup_scan_daily(window_days int default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched_codes uuid[];
begin
  with window_events as (
    select
      e.code_id,
      (e.ts at time zone 'utc')::date as day,
      e.ip_hash,
      coalesce(e.country, 'unknown') as country,
      coalesce(e.device, 'unknown')  as device,
      coalesce(e.referer, 'direct')  as referer,
      coalesce(e.city, 'unknown')    as city
    from public.scan_events e
    where e.ts >= (
      date_trunc('day', now() at time zone 'utc') - make_interval(days => window_days)
    ) at time zone 'utc'
  ),
  base_stats as (
    select
      code_id,
      day,
      count(*) as scans,
      -- ip_hash is nullable (e.g. hashing failed upstream); a null ip_hash
      -- never counts as a "unique" visitor. count(distinct ..) already
      -- ignores nulls, the filter just makes that explicit.
      count(distinct ip_hash) filter (where ip_hash is not null) as uniques
    from window_events
    group by code_id, day
  ),
  country_tally as (
    select code_id, day, jsonb_object_agg(country, n) as tally
    from (
      select code_id, day, country, count(*) as n
      from window_events
      group by code_id, day, country
    ) c
    group by code_id, day
  ),
  device_tally as (
    select code_id, day, jsonb_object_agg(device, n) as tally
    from (
      select code_id, day, device, count(*) as n
      from window_events
      group by code_id, day, device
    ) d
    group by code_id, day
  ),
  referer_tally as (
    select code_id, day, jsonb_object_agg(referer, n) as tally
    from (
      select code_id, day, referer, count(*) as n
      from window_events
      group by code_id, day, referer
    ) r
    group by code_id, day
  ),
  city_tally as (
    select code_id, day, jsonb_object_agg(city, n) as tally
    from (
      select code_id, day, city, count(*) as n
      from window_events
      group by code_id, day, city
    ) ci
    group by code_id, day
  ),
  upserted as (
    insert into public.scan_daily (
      code_id, day, scans, uniques, by_country, by_device, by_referer, by_city
    )
    select
      b.code_id,
      b.day,
      b.scans,
      b.uniques,
      public._cap_top_n_jsonb(coalesce(ct.tally, '{}'::jsonb), 50),
      public._cap_top_n_jsonb(coalesce(dt.tally, '{}'::jsonb), 50),
      public._cap_top_n_jsonb(coalesce(rt.tally, '{}'::jsonb), 50),
      public._cap_top_n_jsonb(coalesce(cy.tally, '{}'::jsonb), 50)
    from base_stats b
    left join country_tally ct on ct.code_id = b.code_id and ct.day = b.day
    left join device_tally  dt on dt.code_id = b.code_id and dt.day = b.day
    left join referer_tally rt on rt.code_id = b.code_id and rt.day = b.day
    left join city_tally    cy on cy.code_id = b.code_id and cy.day = b.day
    on conflict (code_id, day) do update set
      scans      = excluded.scans,
      uniques    = excluded.uniques,
      by_country = excluded.by_country,
      by_device  = excluded.by_device,
      by_referer = excluded.by_referer,
      by_city    = excluded.by_city
    returning code_id
  )
  select array_agg(distinct code_id) into touched_codes from upserted;

  -- Lifetime scan_count, resummed over ALL of the code's scan_daily rows
  -- (not just this window) — scoped to codes touched by this run only, so
  -- a narrow backfill (window_days=7 to patch a gap) never has to rewrite
  -- every code's counter to recompute a handful.
  --
  -- Deliberately a SEPARATE statement from the insert above, not one more
  -- link in the same WITH chain: Postgres evaluates every branch of a WITH
  -- clause against the snapshot from the *start* of that statement, so a
  -- sibling subquery re-reading scan_daily inside the same statement as the
  -- `upserted` insert would still see the PRE-insert rows — silently
  -- undercounting scan_count on every single call (caught by rollup.test.sql
  -- while building this migration; verified against a scratch Postgres
  -- since `pg_cron`/Docker weren't available locally to run the real pgTAP
  -- suite). Two statements in the same transaction give the second one a
  -- fresh snapshot that includes what the first just wrote.
  if touched_codes is not null then
    update public.qr_codes qc
    set scan_count = (
      select coalesce(sum(sd.scans), 0)
      from public.scan_daily sd
      where sd.code_id = qc.id
    )
    where qc.id = any(touched_codes);
  end if;
end;
$$;

-- ============================================================ hardening
-- Mirrors 20260721000003_lock_trigger_function.sql: rollup_scan_daily is a
-- SECURITY DEFINER function that bypasses RLS by design (it reads across
-- every owner's scan_events in one pass) and must never be callable via the
-- PostgREST RPC surface. _cap_top_n_jsonb has no privilege escalation risk
-- on its own but is an internal helper, not a public API — same lockdown.
revoke execute on function public.rollup_scan_daily(int) from public, anon, authenticated;
revoke execute on function public._cap_top_n_jsonb(jsonb, int) from public, anon, authenticated;

-- ============================================================ pg_cron schedule
-- `create extension pg_cron with schema pg_catalog` + the `cron` schema
-- grants below are the form Supabase's own docs prescribe
-- (supabase.com/docs/guides/cron/install) — verified rather than guessed.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    create extension pg_cron with schema pg_catalog;
  end if;
end $$;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- :05 past the hour, deliberately off the top-of-hour herd every other cron
-- job on the host tends to pile onto.
--
-- cron.schedule() is upsert-by-name (Supabase docs, guides/cron/quickstart:
-- "It is also possible to modify a job by using the cron.schedule() function
-- by inputting the same job name. This will replace the existing job via
-- upsert.") — re-running this migration is therefore safe with no
-- cron.unschedule() guard needed. Do NOT "fix" this by adding one; it would
-- just be dead code.
select cron.schedule('rollup_scan_daily_hourly', '5 * * * *', $$select public.rollup_scan_daily();$$);
