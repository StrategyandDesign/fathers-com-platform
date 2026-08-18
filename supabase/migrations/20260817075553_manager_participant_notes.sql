-- One private manager note per participant. Not a case file or timeline.
-- Fathers and reviewers have no policy path. Role checks use public.profiles
-- helpers (manages_father / current_user_role), never user_metadata.

create table if not exists public.manager_participant_notes (
  father_id uuid primary key references public.profiles (id) on delete cascade,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint manager_participant_notes_body_len
    check (char_length(body) <= 2000)
);

comment on table public.manager_participant_notes is
  'Single private note for a father. Visible only to managers of his group.';

create or replace function internal.touch_manager_participant_notes()
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

drop trigger if exists manager_participant_notes_touch
  on public.manager_participant_notes;
create trigger manager_participant_notes_touch
  before insert or update
  on public.manager_participant_notes
  for each row
  execute function internal.touch_manager_participant_notes();

revoke all on function internal.touch_manager_participant_notes()
  from public, anon, authenticated;
grant execute on function internal.touch_manager_participant_notes()
  to service_role;

alter table public.manager_participant_notes enable row level security;
alter table public.manager_participant_notes force row level security;

grant select, insert, update, delete on public.manager_participant_notes
  to authenticated, service_role;
revoke truncate on public.manager_participant_notes
  from anon, authenticated;

drop policy if exists manager_participant_notes_select
  on public.manager_participant_notes;
drop policy if exists manager_participant_notes_insert
  on public.manager_participant_notes;
drop policy if exists manager_participant_notes_update
  on public.manager_participant_notes;
drop policy if exists manager_participant_notes_delete
  on public.manager_participant_notes;

create policy manager_participant_notes_select
on public.manager_participant_notes
for select
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

create policy manager_participant_notes_insert
on public.manager_participant_notes
for insert
to authenticated
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
  and updated_by = (select auth.uid())
);

create policy manager_participant_notes_update
on public.manager_participant_notes
for update
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
)
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
  and updated_by = (select auth.uid())
);

create policy manager_participant_notes_delete
on public.manager_participant_notes
for delete
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);
