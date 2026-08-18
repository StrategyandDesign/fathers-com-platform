-- Weekly streak tables: father-only RLS, freeze ceiling, no staff policies.
select
  (select count(*) from public.session_progress) as progress_rows,
  (select count(*) from public.session_progress where completed_at is not null) as completed_rows,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'father_streaks'
  ) as has_father_streaks,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'streak_week_ledger'
  ) as has_ledger,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'father_streak_notices'
  ) as has_notices,
  (
    select bool_and(cls.relrowsecurity and cls.relforcerowsecurity)
    from pg_class as cls
    join pg_namespace as ns on ns.oid = cls.relnamespace
    where ns.nspname = 'public'
      and cls.relname in ('father_streaks', 'streak_week_ledger', 'father_streak_notices')
  ) as force_rls,
  not exists(
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('father_streaks', 'streak_week_ledger', 'father_streak_notices')
      and (
        qual ilike '%manages_father%'
        or qual ilike '%is_super_admin%'
        or with_check ilike '%manages_father%'
        or with_check ilike '%is_super_admin%'
      )
  ) as no_staff_policy,
  not exists(
    select 1
    from pg_enum as e
    join pg_type as t on t.oid = e.enumtypid
    join pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname like '%notification%'
      and e.enumlabel ilike '%streak%'
  ) as no_streak_notification_type;
