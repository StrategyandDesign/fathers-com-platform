-- First-run father flow: setup answers on the profile, weekly reminder row.
-- Not assessment data. Down path: select internal.rollback_father_first_run();

alter table public.profiles
  add column if not exists onboarding_step text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists setup_answers jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
  add constraint profiles_onboarding_step_check check (
    onboarding_step is null
    or onboarding_step in (
      'welcome',
      'children',
      'skill',
      'when',
      'reminder',
      'session',
      'hold',
      'complete',
      'done'
    )
  );

comment on column public.profiles.onboarding_step is
  'Resumable first-run step under /father/start. Null means not started.';

comment on column public.profiles.onboarding_completed_at is
  'When /father/start was finished. Once set, the flow never shows again.';

comment on column public.profiles.setup_answers is
  'Skill-oriented first-run answers for later personalization. Not assessment data.';

create table if not exists public.reminder_preferences (
  father_id uuid primary key references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  remind_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reminder_preferences is
  'One weekly reminder time per father. Written by first-run step 3.';

comment on column public.reminder_preferences.weekday is
  '0 = Sunday through 6 = Saturday, matching extract(dow from date).';

comment on column public.reminder_preferences.remind_at is
  'Local clock time for the weekly reminder. Timezone is applied by the sender.';

alter table public.reminder_preferences enable row level security;
alter table public.reminder_preferences force row level security;

drop policy if exists reminder_preferences_select on public.reminder_preferences;
drop policy if exists reminder_preferences_insert on public.reminder_preferences;
drop policy if exists reminder_preferences_update on public.reminder_preferences;

create policy reminder_preferences_select
on public.reminder_preferences
for select
to authenticated
using (father_id = (select auth.uid()));

create policy reminder_preferences_insert
on public.reminder_preferences
for insert
to authenticated
with check (father_id = (select auth.uid()));

create policy reminder_preferences_update
on public.reminder_preferences
for update
to authenticated
using (father_id = (select auth.uid()))
with check (father_id = (select auth.uid()));

grant select, insert, update on public.reminder_preferences
  to authenticated, service_role;

revoke delete, truncate on public.reminder_preferences from anon, authenticated;

create or replace function internal.touch_reminder_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reminder_preferences_touch on public.reminder_preferences;
create trigger reminder_preferences_touch
  before update on public.reminder_preferences
  for each row
  execute function internal.touch_reminder_preferences();

revoke all on function internal.touch_reminder_preferences() from public, anon, authenticated;
grant execute on function internal.touch_reminder_preferences() to service_role;

create or replace function internal.rollback_father_first_run()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop trigger if exists reminder_preferences_touch on public.reminder_preferences;
  drop function if exists internal.touch_reminder_preferences();
  drop table if exists public.reminder_preferences;
  alter table public.profiles drop constraint if exists profiles_onboarding_step_check;
  alter table public.profiles drop column if exists onboarding_step;
  alter table public.profiles drop column if exists onboarding_completed_at;
  alter table public.profiles drop column if exists setup_answers;
end;
$$;

revoke all on function internal.rollback_father_first_run() from public, anon, authenticated;
grant execute on function internal.rollback_father_first_run() to service_role;
