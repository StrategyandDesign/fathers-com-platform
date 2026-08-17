-- Pilot role promotion. Run in the Pilot project's SQL editor.
--
-- Routing reads auth app_metadata.role.
-- RLS reads public.profiles.role.
-- Both must match. Sign out and sign in after you run this so the JWT refreshes.
--
-- First Manager: create the user in Authentication → Users → Add user
-- (email + password). Do not use /signup — that form requires an invite code.
-- Then replace the email below and run the Manager block.

-- ---------- Manager ----------
do $$
declare
  uid uuid;
  code text;
begin
  select id into uid
  from auth.users
  where email = 'manager@example.com'; -- <-- replace

  if uid is null then
    raise exception 'No auth user with that email. Add the user in Authentication first.';
  end if;

  update public.profiles
  set role = 'manager'
  where id = uid;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"manager"}'::jsonb
  where id = uid;

  if not exists (select 1 from public.groups where manager_id = uid) then
    insert into public.groups (name, manager_id)
    values ('Pilot Group', uid);
  end if;

  select invite_code into code
  from public.groups
  where manager_id = uid
  order by created_at
  limit 1;

  raise notice 'Manager ready. Invite code: %', code;
end
$$;

-- Show every manager invite code
select
  groups.name,
  groups.invite_code,
  profiles.full_name,
  (select email from auth.users where id = groups.manager_id) as manager_email
from public.groups
join public.profiles on profiles.id = groups.manager_id
where profiles.role = 'manager'
order by groups.created_at;

-- ---------- Reviewer (optional) ----------
-- do $$
-- declare
--   uid uuid;
-- begin
--   select id into uid from auth.users where email = 'reviewer@example.com'; -- <-- replace
--   if uid is null then
--     raise exception 'No auth user with that email.';
--   end if;
--
--   update public.profiles set role = 'reviewer' where id = uid;
--
--   update auth.users
--   set raw_app_meta_data =
--     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"reviewer"}'::jsonb
--   where id = uid;
-- end
-- $$;
