-- Kit attachment + hard-sync propagation (P9.8-B1). Rationale:
-- docs/DECISIONS.md D5 as amended 2026-08-04 (board decision): a code
-- attached to a brand kit MIRRORS that kit's style, and kit edits propagate
-- to every attached code. This migration's header supersedes the
-- frozen-snapshot comment on qr_codes.style in
-- 20260721000001_initial_schema.sql:80-81 -- that file is never edited
-- (forward-only rule), so the correction lives here: the snapshot language
-- now applies ONLY to rows with brand_kit_id null (explicit-style API
-- creations and pre-P9.8 legacy rows), which stay frozen forever.
-- Forward-only: never edit this file after it lands (agent-playbook rule).
--
-- Two objects:
--
--   1. qr_codes_brand_kit_idx -- brand_kit_id has existed since the initial
--      schema but was never written by any application code (audited
--      2026-08-04) and never indexed; propagation and save-time counts
--      query by it. Partial: kit-less rows stay out of the index.
--
--   2. sync_kit_codes(uuid) -- the one atomic propagation call. PostgREST's
--      .update() cannot express style_version = style_version + 1, so the
--      fan-out lives in SQL: it re-reads the kit's style in-query (single
--      source at the moment of sync) and returns the touched count.
--      SECURITY INVOKER on purpose: RLS is the tenant boundary ("own brand
--      kits" select + "own qr codes" update,
--      20260721000002_rls_policies.sql) -- a cross-owner call sees no kit
--      row and updates zero rows. Worst-case fan-out is bounded by the Pro
--      dynamic-code cap (250, apps/web/lib/entitlements.ts), so a single
--      statement suffices; no queue.

-- ============================================================ index

create index qr_codes_brand_kit_idx
  on public.qr_codes (brand_kit_id)
  where brand_kit_id is not null;

-- ============================================================ sync function

create or replace function public.sync_kit_codes(p_kit_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with kit as (
    select style from public.brand_kits where id = p_kit_id
  ),
  touched as (
    update public.qr_codes
       set style = kit.style,
           style_version = qr_codes.style_version + 1
      from kit
     where qr_codes.brand_kit_id = p_kit_id
    returning qr_codes.id
  )
  select coalesce(count(*), 0)::integer from touched;
$$;

comment on function public.sync_kit_codes(uuid) is
  'Hard-sync propagation (P9.8-B1, D5 as amended): copies the kit''s current style onto every attached code and bumps style_version. Security invoker -- RLS scopes the kit read and the code updates to the caller''s own rows, so a cross-owner call touches nothing and returns 0.';

-- ============================================================ grants
-- Callable by signed-in users (the app invokes it from updateBrandKit under
-- the user's RLS-scoped client) and by service_role. Revoke-then-grant per
-- 20260721000004_explicit_grants.sql's convention.

revoke all on function public.sync_kit_codes(uuid) from public, anon;
grant execute on function public.sync_kit_codes(uuid) to authenticated, service_role;
