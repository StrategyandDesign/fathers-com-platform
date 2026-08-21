-- Idempotent Returning Home NWA satellite seed for the Pilot project.
-- Organization locale is English. Hebrew Unit 8200 is not touched.
--
-- Logins (password 12345):
--   manager@nwa   Leader (Brenda)
--   reviewer@nwa  Reviewer (scoped via profiles.home_group_id)
--   father@nwa    Father
--   father2@nwa   Father
--
-- Auth users must already exist. This script only wires the organization.

do $$
declare
  v_org uuid;
  v_manager uuid;
  v_reviewer uuid;
  v_father1 uuid;
  v_father2 uuid;
begin
  select id into v_org
  from public.groups
  where code = 'NWA' or name = 'Returning Home NWA'
  limit 1;

  if v_org is null then
    raise exception 'Returning Home NWA is missing. Create the organization and four auth users first.';
  end if;

  update public.groups
  set name = 'Returning Home NWA',
      code = 'NWA',
      locale = 'en',
      invite_code = coalesce(nullif(invite_code, ''), 'nwa')
  where id = v_org;

  select u.id into v_manager from auth.users u where u.email = 'manager@nwa';
  select u.id into v_reviewer from auth.users u where u.email = 'reviewer@nwa';
  select u.id into v_father1 from auth.users u where u.email = 'father@nwa';
  select u.id into v_father2 from auth.users u where u.email = 'father2@nwa';

  if v_manager is null or v_reviewer is null or v_father1 is null or v_father2 is null then
    raise exception 'One or more Returning Home NWA logins are missing.';
  end if;

  update public.groups set manager_id = v_manager where id = v_org;

  update public.profiles
  set role = 'manager',
      full_name = coalesce(nullif(full_name, ''), 'Brenda'),
      locale = coalesce(locale, 'en'),
      home_group_id = v_org
  where id = v_manager;

  update public.profiles
  set role = 'reviewer',
      full_name = coalesce(nullif(full_name, ''), 'NWA Reviewer'),
      locale = coalesce(locale, 'en'),
      home_group_id = v_org
  where id = v_reviewer;

  update public.profiles
  set role = 'father',
      full_name = coalesce(nullif(full_name, ''), 'NWA Father'),
      locale = coalesce(locale, 'en'),
      home_group_id = v_org
  where id = v_father1;

  update public.profiles
  set role = 'father',
      full_name = coalesce(nullif(full_name, ''), 'NWA Father 2'),
      locale = coalesce(locale, 'en'),
      home_group_id = v_org
  where id = v_father2;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"manager"}'::jsonb
  where id = v_manager;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"reviewer"}'::jsonb
  where id = v_reviewer;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"father"}'::jsonb
  where id in (v_father1, v_father2);

  insert into public.group_members (group_id, father_id)
  values (v_org, v_father1), (v_org, v_father2)
  on conflict (group_id, father_id) do nothing;
end
$$;
