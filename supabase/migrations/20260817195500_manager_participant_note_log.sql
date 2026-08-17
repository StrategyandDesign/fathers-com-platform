-- Private notes become an append-only log. The existing single note, if any,
-- is kept as the first entry. Fathers and reviewers still have no policy path.

alter table public.manager_participant_notes
  add column if not exists id uuid;

update public.manager_participant_notes
set id = gen_random_uuid()
where id is null;

alter table public.manager_participant_notes
  alter column id set default gen_random_uuid();

alter table public.manager_participant_notes
  alter column id set not null;

alter table public.manager_participant_notes
  drop constraint if exists manager_participant_notes_pkey;

alter table public.manager_participant_notes
  add primary key (id);

alter table public.manager_participant_notes
  add column if not exists created_at timestamptz;

update public.manager_participant_notes
set created_at = coalesce(updated_at, now())
where created_at is null;

alter table public.manager_participant_notes
  alter column created_at set default now();

alter table public.manager_participant_notes
  alter column created_at set not null;

alter table public.manager_participant_notes
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

update public.manager_participant_notes
set created_by = updated_by
where created_by is null and updated_by is not null;

create index if not exists manager_participant_notes_father_created_idx
  on public.manager_participant_notes (father_id, created_at desc);

comment on table public.manager_participant_notes is
  'Private manager notes for a father. One row per saved note. Visible only to managers of his group.';

drop trigger if exists manager_participant_notes_touch
  on public.manager_participant_notes;

drop policy if exists manager_participant_notes_insert
  on public.manager_participant_notes;

create policy manager_participant_notes_insert
on public.manager_participant_notes
for insert
to authenticated
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
  and created_by = (select auth.uid())
  and (updated_by is null or updated_by = (select auth.uid()))
);
