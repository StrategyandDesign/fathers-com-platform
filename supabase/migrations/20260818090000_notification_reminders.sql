-- Father reminder system: schedule fields, push, outbox, delivery log.
-- Down path: select internal.rollback_notification_reminders();

alter table public.notification_preferences
  add column if not exists action_reminders boolean not null default true,
  add column if not exists leader_encouragement boolean not null default true,
  add column if not exists push_enabled boolean not null default true,
  add column if not exists email_enabled boolean not null default true,
  add column if not exists reminder_day smallint,
  add column if not exists reminder_time time,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists quiet_hours_start time not null default '21:00',
  add column if not exists quiet_hours_end time not null default '07:00',
  add column if not exists locale text not null default 'en';

alter table public.notification_preferences
  drop constraint if exists notification_preferences_reminder_day_check;

alter table public.notification_preferences
  add constraint notification_preferences_reminder_day_check check (
    reminder_day is null or (reminder_day >= 0 and reminder_day <= 6)
  );

comment on column public.notification_preferences.action_reminders is
  'Remind once if Action is still open two days after check-in.';
comment on column public.notification_preferences.leader_encouragement is
  'Notes from a Leader. Used by the nudge panel.';
comment on column public.notification_preferences.timezone is
  'IANA timezone for quiet hours and the weekly reminder clock.';
comment on column public.notification_preferences.push_enabled is
  'Push channel. One channel is used per reminder; email is the fallback.';
comment on column public.notification_preferences.email_enabled is
  'Email channel. Used when push is off or no device subscription exists.';

alter table public.session_progress
  add column if not exists action_try_at time;

comment on column public.session_progress.action_try_at is
  'Clock time named on the Action step for the follow-up reminder. Not father writing.';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

comment on table public.push_subscriptions is
  'Web push subscriptions, one row per device.';

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'weekly_session',
      'action',
      'new_assignment',
      'certificate',
      'leader_encouragement'
    )
  ),
  dedupe_key text not null unique,
  href text not null,
  payload jsonb not null default '{}'::jsonb,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_outbox_due_idx
  on public.notification_outbox (available_at)
  where processed_at is null and canceled_at is null;

create index if not exists notification_outbox_user_idx
  on public.notification_outbox (user_id, created_at desc);

comment on table public.notification_outbox is
  'Due reminder work. Payload is catalog metadata only.';

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'weekly_session',
      'action',
      'new_assignment',
      'certificate',
      'leader_encouragement'
    )
  ),
  channel text not null check (channel in ('push', 'email')),
  status text not null check (
    status in (
      'sent',
      'skipped_pref',
      'skipped_quiet',
      'skipped_ceiling',
      'skipped_channel',
      'failed'
    )
  ),
  dedupe_key text not null,
  href text,
  title text,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists notification_deliveries_user_idx
  on public.notification_deliveries (user_id, created_at desc);

create index if not exists notification_deliveries_dedupe_idx
  on public.notification_deliveries (dedupe_key, created_at desc);

comment on table public.notification_deliveries is
  'One row per attempted send. Leader nudge panel reads encouragement rows.';

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.notification_outbox enable row level security;
alter table public.notification_outbox force row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_deliveries force row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own
on public.push_subscriptions
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists notification_outbox_select on public.notification_outbox;
drop policy if exists notification_outbox_insert on public.notification_outbox;
drop policy if exists notification_outbox_update on public.notification_outbox;

create policy notification_outbox_select
on public.notification_outbox
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
);

create policy notification_outbox_insert
on public.notification_outbox
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
);

create policy notification_outbox_update
on public.notification_outbox
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
)
with check (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
);

drop policy if exists notification_deliveries_select on public.notification_deliveries;
drop policy if exists notification_deliveries_insert on public.notification_deliveries;

create policy notification_deliveries_select
on public.notification_deliveries
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
);

create policy notification_deliveries_insert
on public.notification_deliveries
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or (select public.manages_father(user_id))
);

grant select, insert, update, delete on public.push_subscriptions
  to authenticated, service_role;
grant select, insert, update on public.notification_outbox
  to authenticated, service_role;
grant select, insert on public.notification_deliveries
  to authenticated, service_role;

revoke delete, truncate on public.notification_outbox from anon, authenticated;
revoke update, delete, truncate on public.notification_deliveries from anon, authenticated;

create or replace function internal.notification_recipient(
  target_user_id uuid,
  pref_key text
)
returns table (email text, allowed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed_pref boolean;
  recipient_email text;
begin
  if target_user_id is null or pref_key is null then
    return;
  end if;

  if pref_key not in (
    'participant_joined',
    'session_completed',
    'training_completed',
    'profile_completed',
    'certificate_sent',
    'weekly_report_ready',
    'account_security_alerts',
    'session_reminders',
    'new_trainings',
    'training_releases',
    'action_reminders',
    'leader_encouragement'
  ) then
    return;
  end if;

  if (select auth.uid()) is distinct from target_user_id
     and not internal.manages_father(target_user_id)
     and not internal.is_super_admin() then
    return;
  end if;

  select u.email::text
    into recipient_email
  from auth.users as u
  where u.id = target_user_id;

  if recipient_email is null or recipient_email = '' then
    return;
  end if;

  execute format(
    'select %I from public.notification_preferences where user_id = $1',
    pref_key
  )
  into allowed_pref
  using target_user_id;

  email := recipient_email;
  allowed := coalesce(allowed_pref, true);
  return next;
end;
$$;

create or replace function internal.rollback_notification_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop table if exists public.notification_deliveries;
  drop table if exists public.notification_outbox;
  drop table if exists public.push_subscriptions;
  alter table public.session_progress drop column if exists action_try_at;
  alter table public.notification_preferences
    drop constraint if exists notification_preferences_reminder_day_check;
  alter table public.notification_preferences
    drop column if exists action_reminders,
    drop column if exists leader_encouragement,
    drop column if exists push_enabled,
    drop column if exists email_enabled,
    drop column if exists reminder_day,
    drop column if exists reminder_time,
    drop column if exists timezone,
    drop column if exists quiet_hours_start,
    drop column if exists quiet_hours_end,
    drop column if exists locale;
end;
$$;

revoke all on function internal.rollback_notification_reminders() from public, anon, authenticated;
grant execute on function internal.rollback_notification_reminders() to service_role;
