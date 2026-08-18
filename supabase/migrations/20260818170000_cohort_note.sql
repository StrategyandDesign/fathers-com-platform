-- One optional cohort note per organization. Fathers see the current note
-- only. Dismiss is per-father. Not a feed, thread, or two-way channel.
-- Leader identity RPC returns name and avatar path only.
-- Down path: select internal.rollback_cohort_note();

create or replace function internal.father_leader_identity()
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select leader.id, leader.full_name, leader.avatar_url
  from public.group_members as membership
  join public.groups as org
    on org.id = membership.group_id
  join public.profiles as leader
    on leader.id = org.manager_id
  where membership.father_id = (select auth.uid())
  order by membership.joined_at
  limit 1;
$$;

create or replace function public.father_leader_identity()
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from internal.father_leader_identity();
$$;

revoke all on function internal.father_leader_identity() from public, anon;
revoke all on function public.father_leader_identity() from public, anon;
grant execute on function internal.father_leader_identity()
  to authenticated, service_role;
grant execute on function public.father_leader_identity()
  to authenticated, service_role;

create table if not exists public.organization_cohort_notes (
  group_id uuid primary key references public.groups (id) on delete cascade,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_cohort_notes_body_len
    check (char_length(body) >= 1 and char_length(body) <= 280)
);

comment on table public.organization_cohort_notes is
  'One active short note per organization. Fathers see the current row only.';

create table if not exists public.organization_cohort_note_dismissals (
  group_id uuid not null references public.groups (id) on delete cascade,
  father_id uuid not null references public.profiles (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (group_id, father_id)
);

comment on table public.organization_cohort_note_dismissals is
  'Per-father dismiss of the current cohort note. A newer note.updated_at shows again.';

create or replace function internal.touch_organization_cohort_notes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organization_cohort_notes_touch
  on public.organization_cohort_notes;
create trigger organization_cohort_notes_touch
  before insert or update
  on public.organization_cohort_notes
  for each row
  execute function internal.touch_organization_cohort_notes();

revoke all on function internal.touch_organization_cohort_notes()
  from public, anon, authenticated;
grant execute on function internal.touch_organization_cohort_notes()
  to service_role;

alter table public.organization_cohort_notes enable row level security;
alter table public.organization_cohort_notes force row level security;
alter table public.organization_cohort_note_dismissals enable row level security;
alter table public.organization_cohort_note_dismissals force row level security;

grant select, insert, update, delete on public.organization_cohort_notes
  to authenticated, service_role;
grant select, insert, update, delete on public.organization_cohort_note_dismissals
  to authenticated, service_role;
revoke truncate on public.organization_cohort_notes from anon, authenticated;
revoke truncate on public.organization_cohort_note_dismissals from anon, authenticated;

drop policy if exists organization_cohort_notes_select
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_notes_write
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_notes_delete
  on public.organization_cohort_notes;
drop policy if exists organization_cohort_note_dismissals_select
  on public.organization_cohort_note_dismissals;
drop policy if exists organization_cohort_note_dismissals_write
  on public.organization_cohort_note_dismissals;

create policy organization_cohort_notes_select
on public.organization_cohort_notes
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_member_of_group(group_id))
);

create policy organization_cohort_notes_write
on public.organization_cohort_notes
for insert
to authenticated
with check (
  (select public.is_manager_of_group(group_id))
  and updated_by = (select auth.uid())
);

create policy organization_cohort_notes_update
on public.organization_cohort_notes
for update
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check (
  (select public.is_manager_of_group(group_id))
  and updated_by = (select auth.uid())
);

create policy organization_cohort_notes_delete
on public.organization_cohort_notes
for delete
to authenticated
using ((select public.is_manager_of_group(group_id)));

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

drop policy if exists avatars_objects_select_own_leader on storage.objects;
create policy avatars_objects_select_own_leader
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.groups as org
    join public.group_members as membership
      on membership.group_id = org.id
    where membership.father_id = (select auth.uid())
      and org.manager_id = public.storage_folder_uuid(name)
  )
);

create or replace function internal.rollback_cohort_note()
returns void
language plpgsql
set search_path = ''
as $$
begin
  drop policy if exists avatars_objects_select_own_leader on storage.objects;
  drop policy if exists organization_cohort_note_dismissals_update
    on public.organization_cohort_note_dismissals;
  drop policy if exists organization_cohort_note_dismissals_write
    on public.organization_cohort_note_dismissals;
  drop policy if exists organization_cohort_note_dismissals_select
    on public.organization_cohort_note_dismissals;
  drop policy if exists organization_cohort_notes_delete
    on public.organization_cohort_notes;
  drop policy if exists organization_cohort_notes_update
    on public.organization_cohort_notes;
  drop policy if exists organization_cohort_notes_write
    on public.organization_cohort_notes;
  drop policy if exists organization_cohort_notes_select
    on public.organization_cohort_notes;
  drop trigger if exists organization_cohort_notes_touch
    on public.organization_cohort_notes;
  drop function if exists internal.touch_organization_cohort_notes();
  drop table if exists public.organization_cohort_note_dismissals;
  drop table if exists public.organization_cohort_notes;
  drop function if exists public.father_leader_identity();
  drop function if exists internal.father_leader_identity();
end;
$$;

revoke all on function internal.rollback_cohort_note()
  from public, anon, authenticated;
grant execute on function internal.rollback_cohort_note() to service_role;
