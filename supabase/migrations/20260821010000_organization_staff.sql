-- Multiple org leaders and org reviewers on one group.
-- Shared desk: staff membership, append-only activity, stacked leader notes.
-- groups.manager_id stays as the listed owner. Staff is the permission source.
-- Down path: select internal.rollback_organization_staff();

-- ---------- staff role ----------
do $$
begin
  create type public.organization_staff_role as enum ('manager', 'reviewer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.organization_staff (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  staff_role public.organization_staff_role not null,
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

comment on table public.organization_staff is
  'Org leaders and org reviewers for a group. Peer managers share the same desk.';

create index if not exists organization_staff_profile_idx
  on public.organization_staff (profile_id, staff_role);
create index if not exists organization_staff_group_role_idx
  on public.organization_staff (group_id, staff_role);

insert into public.organization_staff (group_id, profile_id, staff_role, added_at)
select groups.id, groups.manager_id, 'manager'::public.organization_staff_role, groups.created_at
from public.groups
where groups.manager_id is not null
on conflict (group_id, profile_id) do nothing;

insert into public.organization_staff (group_id, profile_id, staff_role)
select profiles.home_group_id, profiles.id, 'reviewer'::public.organization_staff_role
from public.profiles
where profiles.role = 'reviewer'::public.user_role
  and profiles.home_group_id is not null
on conflict (group_id, profile_id) do nothing;

-- ---------- activity (append-only) ----------
create table if not exists public.organization_activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_activity_kind_check
    check (char_length(kind) >= 2 and char_length(kind) <= 40)
);

comment on table public.organization_activity is
  'Append-only record of leader actions on a shared org desk. Managers and reviewers of the org can read it.';

create index if not exists organization_activity_group_created_idx
  on public.organization_activity (group_id, created_at desc);
create index if not exists organization_activity_actor_idx
  on public.organization_activity (actor_id, created_at desc);

-- ---------- helpers ----------
create or replace function internal.is_manager_of_group(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.organization_staff as staff
      join public.profiles on profiles.id = staff.profile_id
      where staff.group_id = $1
        and staff.profile_id = (select auth.uid())
        and staff.staff_role = 'manager'::public.organization_staff_role
        and profiles.role = 'manager'::public.user_role
        and profiles.deactivated_at is null
    )
    or exists (
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
  select
    exists (
      select 1
      from public.group_members
      join public.organization_staff as staff
        on staff.group_id = group_members.group_id
      join public.profiles as manager
        on manager.id = staff.profile_id
      where group_members.father_id = $1
        and staff.profile_id = (select auth.uid())
        and staff.staff_role = 'manager'::public.organization_staff_role
        and manager.role = 'manager'::public.user_role
        and manager.deactivated_at is null
    )
    or exists (
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

create or replace function internal.is_reviewer_of_group(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.organization_staff as staff
      join public.profiles on profiles.id = staff.profile_id
      where staff.group_id = $1
        and staff.profile_id = (select auth.uid())
        and staff.staff_role = 'reviewer'::public.organization_staff_role
        and profiles.role = 'reviewer'::public.user_role
        and profiles.deactivated_at is null
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'reviewer'::public.user_role
        and profiles.deactivated_at is null
        and profiles.home_group_id = $1
    );
$$;

create or replace function public.is_reviewer_of_group(group_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.is_reviewer_of_group($1);
$$;

create or replace function internal.reviewer_scoped_group_ids()
returns table (group_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select staff.group_id
  from public.organization_staff as staff
  join public.profiles on profiles.id = staff.profile_id
  where staff.profile_id = (select auth.uid())
    and staff.staff_role = 'reviewer'::public.organization_staff_role
    and profiles.role = 'reviewer'::public.user_role
  union
  select profiles.home_group_id
  from public.profiles
  where profiles.id = (select auth.uid())
    and profiles.role = 'reviewer'::public.user_role
    and profiles.home_group_id is not null;
$$;

create or replace function public.reviewer_scoped_group_ids()
returns table (group_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.reviewer_scoped_group_ids();
$$;

create or replace function internal.record_organization_activity(
  p_group_id uuid,
  p_actor_id uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_group_id is null or p_actor_id is null or coalesce(trim(p_kind), '') = '' then
    return null;
  end if;
  insert into public.organization_activity (group_id, actor_id, kind, payload)
  values (p_group_id, p_actor_id, trim(p_kind), coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- staff guards ----------
create or replace function internal.organization_staff_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_other uuid;
  v_manager_count integer;
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    select profiles.role
      into v_role
    from public.profiles
    where profiles.id = new.profile_id;

    if v_role is null then
      raise exception 'That person is not on the platform';
    end if;
    if new.staff_role = 'manager'::public.organization_staff_role
       and v_role is distinct from 'manager'::public.user_role then
      raise exception 'Only a Leader account can be an org leader';
    end if;
    if new.staff_role = 'reviewer'::public.organization_staff_role
       and v_role is distinct from 'reviewer'::public.user_role then
      raise exception 'Only a Reviewer account can be an org reviewer';
    end if;
  end if;

  if tg_op = 'DELETE' then
    if old.staff_role = 'manager'::public.organization_staff_role then
      select count(*)
        into v_manager_count
      from public.organization_staff
      where organization_staff.group_id = old.group_id
        and organization_staff.staff_role = 'manager'::public.organization_staff_role
        and organization_staff.profile_id is distinct from old.profile_id;

      if coalesce(v_manager_count, 0) < 1 then
        raise exception 'Keep at least one leader on the organization';
      end if;

      if exists (
        select 1
        from public.groups
        where groups.id = old.group_id
          and groups.manager_id = old.profile_id
      ) then
        select organization_staff.profile_id
          into v_other
        from public.organization_staff
        where organization_staff.group_id = old.group_id
          and organization_staff.staff_role = 'manager'::public.organization_staff_role
          and organization_staff.profile_id is distinct from old.profile_id
        order by organization_staff.added_at
        limit 1;

        if v_other is not null then
          update public.groups
          set manager_id = v_other
          where groups.id = old.group_id;
        end if;
      end if;
    end if;
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_staff_guard
  on public.organization_staff;
create trigger organization_staff_guard
  before insert or update or delete
  on public.organization_staff
  for each row
  execute function internal.organization_staff_guard();

create or replace function internal.organization_staff_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform internal.record_organization_activity(
      new.group_id,
      coalesce(new.added_by, new.profile_id),
      'staff_added',
      jsonb_build_object(
        'profileId', new.profile_id,
        'staffRole', new.staff_role::text
      )
    );
    return new;
  end if;
  if tg_op = 'DELETE' then
    perform internal.record_organization_activity(
      old.group_id,
      coalesce((select auth.uid()), old.profile_id),
      'staff_removed',
      jsonb_build_object(
        'profileId', old.profile_id,
        'staffRole', old.staff_role::text
      )
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists organization_staff_activity
  on public.organization_staff;
create trigger organization_staff_activity
  after insert or delete
  on public.organization_staff
  for each row
  execute function internal.organization_staff_activity();

create or replace function internal.sync_listed_owner_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.manager_id is not null then
    insert into public.organization_staff (group_id, profile_id, staff_role, added_by)
    values (
      new.id,
      new.manager_id,
      'manager'::public.organization_staff_role,
      coalesce((select auth.uid()), new.manager_id)
    )
    on conflict (group_id, profile_id) do update
      set staff_role = 'manager'::public.organization_staff_role;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_sync_listed_owner_staff
  on public.groups;
create trigger groups_sync_listed_owner_staff
  after insert or update of manager_id
  on public.groups
  for each row
  execute function internal.sync_listed_owner_staff();

-- ---------- notify every org leader ----------
create or replace function internal.fanout_manager_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.group_id is null then
    return new;
  end if;

  insert into public.manager_notifications (
    manager_id, group_id, training_id, kind, title, body, href, assessment_key
  )
  select
    staff.profile_id,
    new.group_id,
    new.training_id,
    new.kind,
    new.title,
    new.body,
    new.href,
    new.assessment_key
  from public.organization_staff as staff
  join public.profiles on profiles.id = staff.profile_id
  left join public.notification_preferences as prefs
    on prefs.user_id = staff.profile_id
  where staff.group_id = new.group_id
    and staff.staff_role = 'manager'::public.organization_staff_role
    and staff.profile_id is distinct from new.manager_id
    and profiles.role = 'manager'::public.user_role
    and profiles.deactivated_at is null
    and coalesce(
      case new.kind
        when 'training_release' then prefs.training_releases
        when 'assessment_release' then prefs.assessment_releases
        else true
      end,
      true
    )
    and not exists (
      select 1
      from public.manager_notifications as existing
      where existing.manager_id = staff.profile_id
        and existing.group_id is not distinct from new.group_id
        and existing.kind is not distinct from new.kind
        and existing.training_id is not distinct from new.training_id
        and existing.assessment_key is not distinct from new.assessment_key
        and existing.created_at > now() - interval '2 minutes'
    );

  return new;
end;
$$;

drop trigger if exists manager_notifications_fanout
  on public.manager_notifications;
create trigger manager_notifications_fanout
  after insert
  on public.manager_notifications
  for each row
  execute function internal.fanout_manager_notification();

-- ---------- stacked cohort notes ----------
alter table public.organization_cohort_notes
  add column if not exists id uuid;
alter table public.organization_cohort_notes
  add column if not exists author_id uuid;

update public.organization_cohort_notes
set
  id = coalesce(id, gen_random_uuid()),
  author_id = coalesce(
    author_id,
    updated_by,
    (
      select groups.manager_id
      from public.groups
      where groups.id = organization_cohort_notes.group_id
    )
  )
where id is null or author_id is null;

delete from public.organization_cohort_notes
where author_id is null;

alter table public.organization_cohort_notes
  alter column id set default gen_random_uuid();
alter table public.organization_cohort_notes
  alter column id set not null;
alter table public.organization_cohort_notes
  alter column author_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_cohort_notes'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) ilike '%(id)%'
  ) then
    alter table public.organization_cohort_notes
      drop constraint if exists organization_cohort_notes_pkey;
    alter table public.organization_cohort_notes
      add primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_cohort_notes_group_author_key'
  ) then
    alter table public.organization_cohort_notes
      add constraint organization_cohort_notes_group_author_key
      unique (group_id, author_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_cohort_notes_author_fk'
  ) then
    alter table public.organization_cohort_notes
      add constraint organization_cohort_notes_author_fk
      foreign key (author_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

comment on table public.organization_cohort_notes is
  'One active short note per leader per organization. Fathers see a stack and dismiss each note.';

alter table public.organization_cohort_note_dismissals
  add column if not exists note_id uuid;

update public.organization_cohort_note_dismissals as dismissals
set note_id = notes.id
from public.organization_cohort_notes as notes
where notes.group_id = dismissals.group_id
  and dismissals.note_id is null;

delete from public.organization_cohort_note_dismissals
where note_id is null;

alter table public.organization_cohort_note_dismissals
  alter column note_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_cohort_note_dismissals'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) ilike '%note_id%'
  ) then
    alter table public.organization_cohort_note_dismissals
      drop constraint if exists organization_cohort_note_dismissals_pkey;
    alter table public.organization_cohort_note_dismissals
      add primary key (note_id, father_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_cohort_note_dismissals_note_fk'
  ) then
    alter table public.organization_cohort_note_dismissals
      add constraint organization_cohort_note_dismissals_note_fk
      foreign key (note_id) references public.organization_cohort_notes (id) on delete cascade;
  end if;
end $$;

comment on table public.organization_cohort_note_dismissals is
  'Per-father dismiss of one leader note. A newer note.updated_at shows that note again.';

drop policy if exists organization_cohort_notes_write
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_notes_update
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_notes_delete
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_note_dismissals_select
  on public.organization_cohort_note_dismissals;
drop policy if exists organization_cohort_note_dismissals_write
  on public.organization_cohort_note_dismissals;
drop policy if exists organization_cohort_note_dismissals_update
  on public.organization_cohort_note_dismissals;

create policy organization_cohort_notes_write
on public.organization_cohort_notes
for insert
to authenticated
with check (
  (select public.is_manager_of_group(group_id))
  and author_id = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy organization_cohort_notes_update
on public.organization_cohort_notes
for update
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  and author_id = (select auth.uid())
)
with check (
  (select public.is_manager_of_group(group_id))
  and author_id = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy organization_cohort_notes_delete
on public.organization_cohort_notes
for delete
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  and author_id = (select auth.uid())
);

create policy organization_cohort_note_dismissals_select
on public.organization_cohort_note_dismissals
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select public.is_manager_of_group(group_id))
);

create policy organization_cohort_note_dismissals_write
on public.organization_cohort_note_dismissals
for insert
to authenticated
with check (
  father_id = (select auth.uid())
  and (select public.is_member_of_group(group_id))
);

create policy organization_cohort_note_dismissals_update
on public.organization_cohort_note_dismissals
for update
to authenticated
using (
  father_id = (select auth.uid())
  and (select public.is_member_of_group(group_id))
)
with check (
  father_id = (select auth.uid())
  and (select public.is_member_of_group(group_id))
);

create or replace function internal.organization_cohort_note_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform internal.record_organization_activity(
      old.group_id,
      coalesce(old.author_id, (select auth.uid())),
      'note_cleared',
      '{}'::jsonb
    );
    return old;
  end if;
  perform internal.record_organization_activity(
    new.group_id,
    coalesce(new.author_id, new.updated_by, (select auth.uid())),
    'note_posted',
    '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists organization_cohort_notes_activity
  on public.organization_cohort_notes;
create trigger organization_cohort_notes_activity
  after insert or update of body or delete
  on public.organization_cohort_notes
  for each row
  execute function internal.organization_cohort_note_activity();

-- ---------- leader identities ----------
create or replace function internal.father_leader_identities()
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (leader.id)
    leader.id, leader.full_name, leader.avatar_url
  from public.group_members as membership
  join public.organization_staff as staff
    on staff.group_id = membership.group_id
   and staff.staff_role = 'manager'::public.organization_staff_role
  join public.profiles as leader
    on leader.id = staff.profile_id
  where membership.father_id = (select auth.uid())
    and leader.role = 'manager'::public.user_role
  order by leader.id, membership.joined_at;
$$;

create or replace function public.father_leader_identities()
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from internal.father_leader_identities();
$$;

create or replace function internal.father_leader_identity()
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select identities.id, identities.full_name, identities.avatar_url
  from internal.father_leader_identities() as identities
  limit 1;
$$;

-- ---------- avatar: any org leader folder ----------
drop policy if exists avatars_objects_select_own_leader on storage.objects;
create policy avatars_objects_select_own_leader
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.group_members as membership
    join public.organization_staff as staff
      on staff.group_id = membership.group_id
     and staff.staff_role = 'manager'::public.organization_staff_role
    where membership.father_id = (select auth.uid())
      and staff.profile_id = public.storage_folder_uuid(name)
  )
);

-- ---------- role change: staff as well as listed owner ----------
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
     and (
       exists (select 1 from public.groups where groups.manager_id = target_id)
       or exists (
         select 1
         from public.organization_staff
         where organization_staff.profile_id = target_id
           and organization_staff.staff_role = 'manager'::public.organization_staff_role
       )
     ) then
    raise exception 'Reassign their organizations first';
  end if;

  if new_role is distinct from 'reviewer'::public.user_role
     and exists (
       select 1
       from public.organization_staff
       where organization_staff.profile_id = target_id
         and organization_staff.staff_role = 'reviewer'::public.organization_staff_role
     ) then
    raise exception 'Remove them from reviewer seats first';
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

-- ---------- RLS ----------
alter table public.organization_staff enable row level security;
alter table public.organization_staff force row level security;
alter table public.organization_activity enable row level security;
alter table public.organization_activity force row level security;

grant select, insert, delete on public.organization_staff
  to authenticated, service_role;
grant select, insert on public.organization_activity
  to authenticated, service_role;
revoke update, truncate on public.organization_staff from anon, authenticated;
revoke update, delete, truncate on public.organization_activity from anon, authenticated;

drop policy if exists organization_staff_select on public.organization_staff;
drop policy if exists organization_staff_write on public.organization_staff;
drop policy if exists organization_staff_delete on public.organization_staff;
drop policy if exists organization_staff_admin_all on public.organization_staff;
drop policy if exists organization_activity_select on public.organization_activity;
drop policy if exists organization_activity_insert on public.organization_activity;
drop policy if exists organization_activity_admin_all on public.organization_activity;

create policy organization_staff_select
on public.organization_staff
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select public.is_manager_of_group(group_id))
  or (select public.is_reviewer_of_group(group_id))
  or (select public.is_member_of_group(group_id))
  or (select public.is_super_admin())
);

create policy organization_staff_write
on public.organization_staff
for insert
to authenticated
with check (
  (select public.is_manager_of_group(group_id))
  or (select public.is_super_admin())
);

create policy organization_staff_delete
on public.organization_staff
for delete
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_super_admin())
);

create policy organization_activity_select
on public.organization_activity
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_reviewer_of_group(group_id))
  or (select public.is_super_admin())
);

create policy organization_activity_insert
on public.organization_activity
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and (
    (select public.is_manager_of_group(group_id))
    or (select public.is_super_admin())
  )
);

create policy organization_activity_admin_all
on public.organization_activity
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

-- ---------- grants ----------
revoke all on function internal.is_reviewer_of_group(uuid) from public, anon;
revoke all on function public.is_reviewer_of_group(uuid) from public, anon;
revoke all on function internal.reviewer_scoped_group_ids() from public, anon;
revoke all on function public.reviewer_scoped_group_ids() from public, anon;
revoke all on function internal.record_organization_activity(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function internal.father_leader_identities() from public, anon;
revoke all on function public.father_leader_identities() from public, anon;
revoke all on function internal.organization_staff_guard() from public, anon, authenticated;
revoke all on function internal.organization_staff_activity() from public, anon, authenticated;
revoke all on function internal.sync_listed_owner_staff() from public, anon, authenticated;
revoke all on function internal.fanout_manager_notification() from public, anon, authenticated;
revoke all on function internal.organization_cohort_note_activity() from public, anon, authenticated;

grant execute on function internal.is_reviewer_of_group(uuid) to authenticated, service_role;
grant execute on function public.is_reviewer_of_group(uuid) to authenticated, service_role;
grant execute on function internal.reviewer_scoped_group_ids() to authenticated, service_role;
grant execute on function public.reviewer_scoped_group_ids() to authenticated, service_role;
grant execute on function internal.record_organization_activity(uuid, uuid, text, jsonb) to service_role;
grant execute on function internal.father_leader_identities() to authenticated, service_role;
grant execute on function public.father_leader_identities() to authenticated, service_role;
grant execute on function internal.organization_staff_guard() to service_role;
grant execute on function internal.organization_staff_activity() to service_role;
grant execute on function internal.sync_listed_owner_staff() to service_role;
grant execute on function internal.fanout_manager_notification() to service_role;
grant execute on function internal.organization_cohort_note_activity() to service_role;

-- ---------- rollback ----------
create or replace function internal.rollback_organization_staff()
returns void
language plpgsql
set search_path = ''
as $$
begin
  drop trigger if exists manager_notifications_fanout on public.manager_notifications;
  drop trigger if exists organization_cohort_notes_activity on public.organization_cohort_notes;
  drop trigger if exists groups_sync_listed_owner_staff on public.groups;
  drop trigger if exists organization_staff_activity on public.organization_staff;
  drop trigger if exists organization_staff_guard on public.organization_staff;
  drop function if exists internal.fanout_manager_notification();
  drop function if exists internal.organization_cohort_note_activity();
  drop function if exists internal.sync_listed_owner_staff();
  drop function if exists internal.organization_staff_activity();
  drop function if exists internal.organization_staff_guard();
  drop function if exists public.father_leader_identities();
  drop function if exists internal.father_leader_identities();
  drop function if exists public.reviewer_scoped_group_ids();
  drop function if exists internal.reviewer_scoped_group_ids();
  drop function if exists public.is_reviewer_of_group(uuid);
  drop function if exists internal.is_reviewer_of_group(uuid);
  drop function if exists internal.record_organization_activity(uuid, uuid, text, jsonb);
  drop table if exists public.organization_activity;
  drop table if exists public.organization_staff;
  drop type if exists public.organization_staff_role;
end;
$$;

revoke all on function internal.rollback_organization_staff()
  from public, anon, authenticated;
grant execute on function internal.rollback_organization_staff() to service_role;
