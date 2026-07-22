-- QRCDN initial schema (P3). Design rationale: docs/DECISIONS.md D5, D8, D11, D12.
-- Forward-only: never edit this file after it lands (agent-playbook rule).

-- ============================================================ profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================ brand_kits
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- Style JSON, version-tagged; validated by packages/shared zod schema at
  -- the app boundary. Additive-only evolution (D5).
  style jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index brand_kits_one_default
  on public.brand_kits (owner_id) where is_default;
create index brand_kits_owner_idx on public.brand_kits (owner_id);

create trigger brand_kits_updated_at
  before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ============================================================ qr_codes
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  -- Uppercase-only slugs: printed URLs use QR alphanumeric mode (D1/D12).
  slug text not null unique
    check (slug = upper(slug) and char_length(slug) between 4 and 30),
  kind text not null check (kind in ('static', 'dynamic')),
  -- dynamic: current 302 target (mirrored into Workers KV, D2)
  destination_url text
    check (kind <> 'dynamic' or destination_url is not null),
  -- static: the encoded payload itself
  payload text,
  brand_kit_id uuid references public.brand_kits on delete set null,
  -- Frozen style snapshot at creation — printed artifacts must re-render
  -- identically forever. Never mutated by kit edits (D5, hard rule).
  style jsonb not null,
  style_version integer not null default 1 check (style_version >= 1),
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  expires_at timestamptz,
  password_hash text,
  -- Denormalized total, written ONLY by the nightly rollup job (D8) —
  -- never per-scan (hard rule).
  scan_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index qr_codes_owner_created_idx
  on public.qr_codes (owner_id, created_at desc);

create trigger qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

-- ============================================================ scan_events
-- Append-only raw events. Inserted by the redirect Worker via secret-key
-- client (bypasses RLS). No raw IP is ever stored (D3).
create table public.scan_events (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes on delete cascade,
  ts timestamptz not null default now(),
  country text,
  region text,
  city text,
  device text,
  os text,
  browser text,
  ip_hash bytea,
  referer text
);

create index scan_events_code_ts_idx on public.scan_events (code_id, ts desc);
create index scan_events_ts_idx on public.scan_events (ts);

-- ============================================================ scan_daily
-- Pre-aggregated analytics the dashboard reads (D8). Upserted by pg_cron
-- rollup (P6); dashboards never scan raw events beyond the live-24h window.
create table public.scan_daily (
  code_id uuid not null references public.qr_codes on delete cascade,
  day date not null,
  scans integer not null default 0,
  uniques integer not null default 0,
  by_country jsonb not null default '{}',
  by_device jsonb not null default '{}',
  primary key (code_id, day)
);

-- ============================================================ api_keys
-- Format: qrcdn_live_ + 32 base62 + CRC tail. Stored as sha256 hash with a
-- display prefix; unique-index O(1) lookup (D11).
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  key_prefix text not null,
  key_hash bytea not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index api_keys_hash_idx on public.api_keys (key_hash);
create index api_keys_owner_idx on public.api_keys (owner_id);

-- ============================================================ billing
create table public.stripe_customers (
  profile_id uuid primary key references public.profiles on delete cascade,
  stripe_customer_id text not null unique
);

-- Mirrors Stripe state via syncStripeState upserts (D10) — never event deltas.
create table public.subscriptions (
  id text primary key,
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null,
  price_id text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index subscriptions_profile_idx on public.subscriptions (profile_id);
