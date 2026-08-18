-- Leader "Who needs a nudge" reachability. No father-facing columns.
-- Reviewers never manage groups, so this returns no rows for that role.
-- Down path: select internal.rollback_nudge_panel_reachability();

create or replace function internal.notification_reachability_many(target_ids uuid[])
returns table (
  user_id uuid,
  push_enabled boolean,
  email_enabled boolean,
  has_push boolean,
  leader_encouragement boolean,
  timezone text,
  quiet_hours_start text,
  quiet_hours_end text,
  prefs_locale text,
  profile_locale text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    father.id,
    coalesce(prefs.push_enabled, true),
    coalesce(prefs.email_enabled, true),
    exists (
      select 1
      from public.push_subscriptions as push
      where push.user_id = father.id
    ),
    coalesce(prefs.leader_encouragement, true),
    coalesce(prefs.timezone, 'UTC'),
    to_char(coalesce(prefs.quiet_hours_start, '21:00'::time), 'HH24:MI'),
    to_char(coalesce(prefs.quiet_hours_end, '07:00'::time), 'HH24:MI'),
    coalesce(prefs.locale, 'en'),
    father.locale
  from unnest(coalesce(target_ids, '{}'::uuid[])) as requested(id)
  join public.profiles as father on father.id = requested.id
  left join public.notification_preferences as prefs
    on prefs.user_id = father.id
  where internal.manages_father(father.id);
$$;

create or replace function public.notification_reachability_many(target_ids uuid[])
returns table (
  user_id uuid,
  push_enabled boolean,
  email_enabled boolean,
  has_push boolean,
  leader_encouragement boolean,
  timezone text,
  quiet_hours_start text,
  quiet_hours_end text,
  prefs_locale text,
  profile_locale text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from internal.notification_reachability_many($1);
$$;

revoke all on function internal.notification_reachability_many(uuid[])
  from public, anon;
grant execute on function internal.notification_reachability_many(uuid[])
  to authenticated, service_role;

revoke all on function public.notification_reachability_many(uuid[])
  from public, anon;
grant execute on function public.notification_reachability_many(uuid[])
  to authenticated, service_role;

comment on function public.notification_reachability_many(uuid[]) is
  'Channel and quiet-hour flags for fathers a Leader manages. Never returns email.';

create or replace function internal.rollback_nudge_panel_reachability()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop function if exists public.notification_reachability_many(uuid[]);
  drop function if exists internal.notification_reachability_many(uuid[]);
end;
$$;

revoke all on function internal.rollback_nudge_panel_reachability()
  from public, anon, authenticated;
grant execute on function internal.rollback_nudge_panel_reachability()
  to service_role;
