-- Security-advisor fix: handle_new_user() is a SECURITY DEFINER trigger
-- function and must not be callable via the PostgREST RPC surface.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
