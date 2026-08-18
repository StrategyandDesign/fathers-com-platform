-- Reminder system: schedule fields, push, outbox, delivery log. Progress unchanged.
select
  (select count(*) from public.session_progress) as progress_rows,
  (select count(*) from public.session_progress where completed_at is not null) as completed_rows,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_preferences' and column_name = 'timezone'
  ) as has_timezone,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_preferences' and column_name = 'leader_encouragement'
  ) as has_leader_encouragement,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'push_subscriptions'
  ) as has_push_subscriptions,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notification_outbox'
  ) as has_outbox,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notification_deliveries'
  ) as has_deliveries,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'session_progress' and column_name = 'action_try_at'
  ) as has_action_try_at;
