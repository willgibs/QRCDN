-- Local/CI stacks build the DB from these migrations alone, so the table
-- privileges Supabase cloud granted via default privileges must be explicit
-- here — otherwise `supabase test db` runs against tables `authenticated`
-- cannot even SELECT (found by the first CI run of the rls job).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Re-assert lockdowns that must survive the broad grant above:
-- profiles: display_name is the only client-writable column (no inserts/deletes).
revoke insert, update, delete on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;
