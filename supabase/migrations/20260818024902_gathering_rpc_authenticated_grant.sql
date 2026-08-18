-- Match admin_list_users / is_super_admin: the public wrapper is SECURITY
-- INVOKER and calls internal.admin_anonymous_gathering(). Authenticated
-- callers need EXECUTE on the internal function. The function still raises
-- unless internal.is_super_admin().

grant execute on function internal.admin_anonymous_gathering()
  to authenticated;
