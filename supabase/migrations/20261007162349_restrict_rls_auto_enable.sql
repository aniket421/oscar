-- Supabase's "enable RLS automatically" project option installs public.rls_auto_enable(), a
-- SECURITY DEFINER event-trigger function that every role could execute (advisor lints 0028 and
-- 0029). Event triggers call their function without checking EXECUTE, so revoking it from the API
-- roles leaves automatic RLS on new tables working. A no-op where the function does not exist
-- (projects created without that option, and the test database).
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
