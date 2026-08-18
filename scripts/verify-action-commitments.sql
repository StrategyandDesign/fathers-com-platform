-- Action commitments: new table, father-only RLS, progress rows unchanged.
select
  (select count(*) from public.session_progress) as progress_rows,
  (select count(*) from public.session_progress where completed_at is not null) as completed_rows,
  exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'action_commitments'
  ) as has_action_commitments,
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class as cls
    join pg_namespace as ns on ns.oid = cls.relnamespace
    where ns.nspname = 'public' and cls.relname = 'action_commitments'
  ) as force_rls,
  not exists(
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'action_commitments'
      and (
        qual ilike '%manages_father%'
        or qual ilike '%is_super_admin%'
        or with_check ilike '%manages_father%'
        or with_check ilike '%is_super_admin%'
      )
  ) as no_staff_policy;
