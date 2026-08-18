-- Super-admin training development sandbox.
-- Additive columns only. Does not change assignability, reviews, RLS, or progress.
-- Down path: select internal.rollback_training_development_sandbox();

alter table public.trainings
  add column if not exists development_status text not null default 'draft';

alter table public.trainings
  drop constraint if exists trainings_development_status_check;

alter table public.trainings
  add constraint trainings_development_status_check
  check (development_status in (
    'draft',
    'in_development',
    'ready_for_review',
    'released',
    'archived'
  ));

alter table public.trainings
  add column if not exists working_title text;

alter table public.trainings
  add column if not exists development_notes text;

alter table public.trainings
  add column if not exists last_edited_at timestamptz;

alter table public.trainings
  add column if not exists last_edited_by uuid;

alter table public.trainings
  add column if not exists previewed_at timestamptz;

alter table public.trainings
  drop constraint if exists trainings_last_edited_by_fkey;

alter table public.trainings
  add constraint trainings_last_edited_by_fkey
  foreign key (last_edited_by) references public.profiles (id) on delete set null;

comment on column public.trainings.development_status is
  'Super-admin authoring state. Not used for Father or Leader assignability.';

comment on column public.trainings.working_title is
  'Internal working title. Fathers still see title.';

comment on column public.trainings.development_notes is
  'Super-admin-only development notes.';

comment on column public.trainings.last_edited_at is
  'When Super-admin last edited this training or one of its sessions.';

comment on column public.trainings.last_edited_by is
  'Profile that last edited this training in the sandbox.';

comment on column public.trainings.previewed_at is
  'When Super-admin last finished an end-to-end Stage walk.';

alter table public.sessions
  add column if not exists checkin_prompt text;

alter table public.sessions
  add column if not exists action_prompt text;

comment on column public.sessions.checkin_prompt is
  'Authored Check-in stem plus A) B) C) options. Null keeps Fundamentals or fallback copy.';

comment on column public.sessions.action_prompt is
  'Authored Action stem plus A) B) C) options. Null keeps Fundamentals or fallback copy.';

create index if not exists trainings_development_status_idx
  on public.trainings (development_status);

update public.trainings as training
set development_status = case
  when training.released_at is not null then 'released'
  when training.published is true then 'ready_for_review'
  when exists (
    select 1
    from public.sessions as session
    where session.training_id = training.id
  ) then 'in_development'
  else 'draft'
end;

create or replace function internal.stamp_training_last_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE'
    and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.slug is distinct from old.slug
    ) then
    new.previewed_at := null;
  end if;

  new.last_edited_at := now();
  new.last_edited_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trainings_stamp_last_edited on public.trainings;

create trigger trainings_stamp_last_edited
before insert or update on public.trainings
for each row
execute function internal.stamp_training_last_edited();

create or replace function internal.stamp_parent_training_last_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  training_id uuid;
begin
  training_id := coalesce(new.training_id, old.training_id);
  update public.trainings
  set
    last_edited_at = now(),
    last_edited_by = auth.uid(),
    previewed_at = null
  where id = training_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sessions_stamp_parent_training on public.sessions;

create trigger sessions_stamp_parent_training
after insert or update or delete on public.sessions
for each row
execute function internal.stamp_parent_training_last_edited();

revoke all on function internal.stamp_training_last_edited()
  from public, anon, authenticated;
revoke all on function internal.stamp_parent_training_last_edited()
  from public, anon, authenticated;

grant execute on function internal.stamp_training_last_edited() to service_role;
grant execute on function internal.stamp_parent_training_last_edited() to service_role;

create or replace function internal.rollback_training_development_sandbox()
returns void
language plpgsql
set search_path = ''
as $$
begin
  drop trigger if exists sessions_stamp_parent_training on public.sessions;
  drop trigger if exists trainings_stamp_last_edited on public.trainings;
  drop function if exists internal.stamp_parent_training_last_edited();
  drop function if exists internal.stamp_training_last_edited();

  alter table public.sessions drop column if exists action_prompt;
  alter table public.sessions drop column if exists checkin_prompt;

  alter table public.trainings drop constraint if exists trainings_last_edited_by_fkey;
  alter table public.trainings drop constraint if exists trainings_development_status_check;
  drop index if exists public.trainings_development_status_idx;

  alter table public.trainings drop column if exists previewed_at;
  alter table public.trainings drop column if exists last_edited_by;
  alter table public.trainings drop column if exists last_edited_at;
  alter table public.trainings drop column if exists development_notes;
  alter table public.trainings drop column if exists working_title;
  alter table public.trainings drop column if exists development_status;
end;
$$;

revoke all on function internal.rollback_training_development_sandbox()
  from public, anon, authenticated;
grant execute on function internal.rollback_training_development_sandbox()
  to service_role;
