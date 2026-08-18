-- Super-admin role label. Must commit before admin_platform uses it.
-- First admin is granted in SQL (see supabase/sql/promote_pilot_role.sql),
-- never via signup.

alter type public.user_role add value if not exists 'admin';
