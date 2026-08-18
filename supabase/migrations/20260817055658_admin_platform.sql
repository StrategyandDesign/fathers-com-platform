-- Super-admin helpers, catalog publish flag, and additive RLS.
-- Existing manager/father policies stay. Admin access is OR is_super_admin().
-- Role checks read public.profiles, never user_metadata.

-- ---------- columns ----------
alter table public.trainings
  add column if not exists published boolean not null default true;

comment on column public.trainings.published is
  'When false, hidden from new catalog/assignment. Existing assignments and progress stay reachable.';

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

comment on column public.profiles.deactivated_at is
  'When set, the user cannot sign in or use the app. Not a delete.';

-- ---------- helpers ----------
create or replace function internal.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
      and deactivated_at is null
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.is_super_admin();
$$;

create or replace function internal.is_manager_of_group(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups
    join public.profiles on profiles.id = groups.manager_id
    where groups.id = $1
      and groups.manager_id = (select auth.uid())
      and profiles.role = 'manager'::public.user_role
      and profiles.deactivated_at is null
  );
$$;

create or replace function internal.manages_father(father_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    join public.groups on groups.id = group_members.group_id
    join public.profiles as manager on manager.id = groups.manager_id
    where group_members.father_id = $1
      and groups.manager_id = (select auth.uid())
      and manager.role = 'manager'::public.user_role
      and manager.deactivated_at is null
  );
$$;

-- Stamp app_metadata.role on new users so routing matches profiles.
-- Does not replace handle_new_user (other migrations may also touch it).
create or replace function internal.stamp_new_user_app_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') not in (
    'father',
    'manager',
    'reviewer',
    'admin'
  ) then
    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"father"}'::jsonb
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_app_role on auth.users;
create trigger on_auth_user_created_app_role
  after insert on auth.users
  for each row
  execute function internal.stamp_new_user_app_role();

update auth.users
set raw_app_meta_data =
  coalesce(auth.users.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', profiles.role::text)
from public.profiles
where profiles.id = auth.users.id
  and coalesce(auth.users.raw_app_meta_data ->> 'role', '') not in (
    'father',
    'manager',
    'reviewer',
    'admin'
  );

-- ---------- admin RPCs (emails + role/app_metadata, last-admin guards) ----------
create or replace function internal.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role public.user_role,
  email text,
  deactivated_at timestamptz,
  created_at timestamptz,
  organization text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.role,
    u.email::text,
    p.deactivated_at,
    p.created_at,
    nullif(
      trim(both ', ' from concat_ws(
        ', ',
        (
          select string_agg(g.name, ', ' order by g.name)
          from public.groups g
          where g.manager_id = p.id
        ),
        (
          select string_agg(g.name, ', ' order by g.name)
          from public.group_members gm
          join public.groups g on g.id = gm.group_id
          where gm.father_id = p.id
            and g.manager_id is distinct from p.id
        )
      )),
      ''
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role public.user_role,
  email text,
  deactivated_at timestamptz,
  created_at timestamptz,
  organization text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from internal.admin_list_users();
$$;

create or replace function internal.admin_set_user_role(
  target_id uuid,
  new_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role public.user_role;
  active_admins integer;
begin
  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  if target_id is null then
    raise exception 'Choose a user';
  end if;

  select profiles.role
    into current_role
  from public.profiles
  where profiles.id = target_id;

  if not found then
    raise exception 'User not found';
  end if;

  if current_role is not distinct from new_role then
    return;
  end if;

  if current_role = 'admin'::public.user_role
     and new_role is distinct from 'admin'::public.user_role then
    select count(*)
      into active_admins
    from public.profiles
    where role = 'admin'::public.user_role
      and deactivated_at is null
      and id is distinct from target_id;

    if coalesce(active_admins, 0) < 1 then
      raise exception 'Cannot remove the last super-admin';
    end if;
  end if;

  if new_role is distinct from 'manager'::public.user_role
     and exists (
       select 1
       from public.groups
       where groups.manager_id = target_id
     ) then
    raise exception 'Reassign their organizations first';
  end if;

  update public.profiles
  set role = new_role
  where id = target_id;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', new_role::text)
  where id = target_id;

  delete from auth.sessions
  where user_id = target_id;
end;
$$;

create or replace function public.admin_set_user_role(
  target_id uuid,
  new_role public.user_role
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select internal.admin_set_user_role($1, $2);
$$;

create or replace function internal.admin_set_user_deactivated(
  target_id uuid,
  deactivated boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role public.user_role;
  already_deactivated timestamptz;
  active_admins integer;
begin
  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  if target_id is null then
    raise exception 'Choose a user';
  end if;

  select profiles.role, profiles.deactivated_at
    into current_role, already_deactivated
  from public.profiles
  where profiles.id = target_id;

  if not found then
    raise exception 'User not found';
  end if;

  if deactivated then
    if target_id = (select auth.uid()) then
      raise exception 'You cannot deactivate your own account';
    end if;

    if current_role = 'admin'::public.user_role then
      select count(*)
        into active_admins
      from public.profiles
      where role = 'admin'::public.user_role
        and deactivated_at is null
        and id is distinct from target_id;

      if coalesce(active_admins, 0) < 1 then
        raise exception 'Cannot deactivate the last super-admin';
      end if;
    end if;

    if already_deactivated is null then
      update public.profiles
      set deactivated_at = now()
      where id = target_id;
    end if;

    delete from auth.sessions
    where user_id = target_id;
  else
    update public.profiles
    set deactivated_at = null
    where id = target_id;
  end if;
end;
$$;

create or replace function public.admin_set_user_deactivated(
  target_id uuid,
  deactivated boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select internal.admin_set_user_deactivated($1, $2);
$$;

-- ---------- catalog / delete guards ----------
create or replace function internal.protect_seeded_training()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.slug = 'fundamentals' then
    raise exception 'Fathering Fundamentals cannot be deleted';
  end if;

  if exists (
    select 1
    from public.training_assignments
    where training_assignments.training_id = old.id
  ) or exists (
    select 1
    from public.certificates
    where certificates.training_id = old.id
  ) or exists (
    select 1
    from public.session_progress
    join public.sessions on sessions.id = session_progress.session_id
    where sessions.training_id = old.id
  ) then
    raise exception 'Cannot delete a training that has assignments or progress';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_seeded_training on public.trainings;
create trigger protect_seeded_training
  before delete on public.trainings
  for each row
  execute function internal.protect_seeded_training();

create or replace function internal.protect_session_with_progress()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.session_progress
    where session_progress.session_id = old.id
  ) then
    raise exception 'Cannot delete a session that has progress';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_session_with_progress on public.sessions;
create trigger protect_session_with_progress
  before delete on public.sessions
  for each row
  execute function internal.protect_session_with_progress();

create or replace function internal.enforce_published_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.trainings
    where trainings.id = new.training_id
      and trainings.published is distinct from true
  ) then
    raise exception 'That training is not published';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_published_assignment on public.training_assignments;
create trigger enforce_published_assignment
  before insert on public.training_assignments
  for each row
  execute function internal.enforce_published_assignment();

-- ---------- grants ----------
revoke all on function internal.is_super_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function internal.stamp_new_user_app_role() from public, anon, authenticated;
revoke all on function internal.admin_list_users() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function internal.admin_set_user_role(uuid, public.user_role) from public, anon;
revoke all on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
revoke all on function internal.admin_set_user_deactivated(uuid, boolean) from public, anon;
revoke all on function public.admin_set_user_deactivated(uuid, boolean) from public, anon;
revoke all on function internal.protect_seeded_training() from public, anon, authenticated;
revoke all on function internal.protect_session_with_progress() from public, anon, authenticated;
revoke all on function internal.enforce_published_assignment() from public, anon, authenticated;

grant execute on function internal.is_super_admin() to authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function internal.stamp_new_user_app_role() to service_role;
grant execute on function internal.admin_list_users() to authenticated, service_role;
grant execute on function public.admin_list_users() to authenticated, service_role;
grant execute on function internal.admin_set_user_role(uuid, public.user_role) to authenticated, service_role;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated, service_role;
grant execute on function internal.admin_set_user_deactivated(uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_set_user_deactivated(uuid, boolean) to authenticated, service_role;
grant execute on function internal.protect_seeded_training() to service_role;
grant execute on function internal.protect_session_with_progress() to service_role;
grant execute on function internal.enforce_published_assignment() to service_role;

-- ---------- additive RLS ----------
create policy profiles_select_admin
on public.profiles
for select
to authenticated
using ((select public.is_super_admin()));

create policy groups_admin_all
on public.groups
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy group_members_select_admin
on public.group_members
for select
to authenticated
using ((select public.is_super_admin()));

create policy trainings_admin_all
on public.trainings
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy sessions_admin_all
on public.sessions
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy training_assignments_select_admin
on public.training_assignments
for select
to authenticated
using ((select public.is_super_admin()));

create policy session_progress_select_admin
on public.session_progress
for select
to authenticated
using ((select public.is_super_admin()));

create policy certificates_select_admin
on public.certificates
for select
to authenticated
using ((select public.is_super_admin()));
