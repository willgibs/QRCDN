-- Row-level security (P3). Owner-only access via initplan-wrapped auth.uid();
-- every policy column is indexed (Supabase perf guidance). Scan tables are
-- read-only through the ownership join — the redirect Worker and Stripe
-- webhook write via the secret-key client, which bypasses RLS by design.

alter table public.profiles         enable row level security;
alter table public.brand_kits       enable row level security;
alter table public.qr_codes         enable row level security;
alter table public.scan_events      enable row level security;
alter table public.scan_daily       enable row level security;
alter table public.api_keys         enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions    enable row level security;

-- profiles: select/update own row only. Inserts come from the auth trigger;
-- deletes cascade from auth.users. plan is server-computed only: column-level
-- grants stop self-service plan escalation at the privilege layer, below RLS.
revoke insert, update, delete on table public.profiles from authenticated, anon;
grant update (display_name) on table public.profiles to authenticated;

create policy "select own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- brand_kits: full owner CRUD.
create policy "own brand kits" on public.brand_kits
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- qr_codes: full owner CRUD.
create policy "own qr codes" on public.qr_codes
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- scan_events / scan_daily: owner read-only, no write policies at all.
create policy "read own scan events" on public.scan_events
  for select to authenticated
  using (exists (
    select 1 from public.qr_codes c
    where c.id = code_id and c.owner_id = (select auth.uid())
  ));

create policy "read own scan daily" on public.scan_daily
  for select to authenticated
  using (exists (
    select 1 from public.qr_codes c
    where c.id = code_id and c.owner_id = (select auth.uid())
  ));

-- api_keys: owner CRUD (key_hash is already non-reversible sha256).
create policy "own api keys" on public.api_keys
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- billing: owner read-only; all writes via secret-key server client.
create policy "read own stripe customer" on public.stripe_customers
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "read own subscriptions" on public.subscriptions
  for select to authenticated
  using (profile_id = (select auth.uid()));
