-- Brand-logo storage bucket (P4-U1). Design rationale: docs/guides/p4-studio.md
-- "Logo storage" — private bucket, path {owner_id}/{kit_id}, owner-scoped RLS.
-- Forward-only: never edit this file after it lands (agent-playbook rule).

-- ============================================================ bucket
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', false)
on conflict (id) do nothing;

-- File size/type limits on the bucket row. The engine only accepts raster
-- data URIs for embedded logos — svg+xml is rejected by design (D6 /
-- packages/qr-engine), so svg is deliberately excluded here too.
update storage.buckets
set
  file_size_limit = 2097152, -- 2 MB
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'brand-logos';

-- ============================================================ RLS
-- Owner-scoped access: object path is `{owner_id}/{kit_id}`, so the first
-- path segment must match the caller's uid. Mirrors the "own X" policy style
-- used for brand_kits/qr_codes/api_keys in 20260721000002_rls_policies.sql —
-- a single `for all` policy with an initplan-wrapped auth.uid() covers all
-- four verbs (select/insert/update/delete) for `authenticated`. No policy is
-- created for `anon`, so anonymous access is denied by RLS default-deny.
create policy "own brand logo objects" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'brand-logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'brand-logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
