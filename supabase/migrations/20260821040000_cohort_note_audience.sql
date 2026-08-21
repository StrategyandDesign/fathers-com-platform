-- One optional training audience on a leader update.
-- Null = whole group. Set = only fathers assigned that training.
-- Down path: select internal.rollback_cohort_note_audience();

alter table public.organization_cohort_notes
  add column if not exists audience_training_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_cohort_notes_audience_training_fk'
  ) then
    alter table public.organization_cohort_notes
      add constraint organization_cohort_notes_audience_training_fk
      foreign key (audience_training_id)
      references public.trainings (id)
      on delete set null;
  end if;
end $$;

create index if not exists organization_cohort_notes_audience_training_idx
  on public.organization_cohort_notes (audience_training_id)
  where audience_training_id is not null;

comment on column public.organization_cohort_notes.audience_training_id is
  'Null = whole group. Set = only fathers assigned that training.';

drop policy if exists organization_cohort_notes_select
  on public.organization_cohort_notes;

create policy organization_cohort_notes_select
on public.organization_cohort_notes
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (
    (select public.is_member_of_group(group_id))
    and (
      audience_training_id is null
      or exists (
        select 1
        from public.training_assignments as assignments
        where assignments.father_id = (select auth.uid())
          and assignments.training_id = organization_cohort_notes.audience_training_id
      )
    )
  )
);

create or replace function internal.rollback_cohort_note_audience()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop policy if exists organization_cohort_notes_select
    on public.organization_cohort_notes;

  create policy organization_cohort_notes_select
  on public.organization_cohort_notes
  for select
  to authenticated
  using (
    (select public.is_manager_of_group(group_id))
    or (select public.is_member_of_group(group_id))
  );

  alter table public.organization_cohort_notes
    drop constraint if exists organization_cohort_notes_audience_training_fk;
  drop index if exists public.organization_cohort_notes_audience_training_idx;
  alter table public.organization_cohort_notes
    drop column if exists audience_training_id;
end;
$$;

revoke all on function internal.rollback_cohort_note_audience() from public, anon, authenticated;
grant execute on function internal.rollback_cohort_note_audience() to service_role;
