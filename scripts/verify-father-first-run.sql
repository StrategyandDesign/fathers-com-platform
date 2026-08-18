-- First-run flow: profiles columns, reminder_preferences, session_progress unchanged.
select
  (select count(*) from public.session_progress) as progress_rows,
  (select count(*) from public.session_progress where completed_at is not null) as completed_rows,
  (select count(distinct father_id) from public.session_progress) as fathers_with_progress,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_step'
  ) as has_onboarding_step,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_completed_at'
  ) as has_onboarding_completed_at,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'setup_answers'
  ) as has_setup_answers,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'reminder_preferences'
  ) as has_reminder_preferences;
