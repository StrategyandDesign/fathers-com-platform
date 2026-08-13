-- Returning Home researcher seat, part 2 of 2.
-- Org-scoped app_role `researcher`: Efficacy Report aggregates only, k=11
-- suppression. Do not add researcher to leads_org or admins_org. Do not
-- touch facilitator_participant_progress. Do not grant table SELECT. Do not
-- reuse Postgres role fc_researcher. Do not seed grants.

-- Helper: admin, org-scoped researcher, or org-scoped org_admin.
create or replace function public.reports_org(_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and org_id = _org
        and role = 'researcher'::app_role
    )
    or exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and org_id = _org
        and role = 'org_admin'::app_role
    );
$$;

revoke all on function public.reports_org(uuid) from public;
grant execute on function public.reports_org(uuid) to authenticated;

-- New inserts of org_admin, circle_leader, or researcher require org_id.
-- Existing unscoped circle_leader rows stay until re-granted from Admin.
drop policy if exists "admin grants roles" on user_roles;
create policy "admin grants roles" on user_roles
  for insert
  with check (
    public.is_admin()
    and (
      org_id is not null
      or role not in (
        'org_admin'::app_role,
        'circle_leader'::app_role,
        'researcher'::app_role
      )
    )
  );

alter table public.user_roles drop constraint if exists user_roles_scoped_org_required;
alter table public.user_roles
  add constraint user_roles_scoped_org_required
  check (
    org_id is not null
    or role not in (
      'org_admin'::app_role,
      'circle_leader'::app_role,
      'researcher'::app_role
    )
  ) not valid;

-- Retarget report RPCs off org_admins onto reports_org / user_roles.
-- Return type gains suppressed, so drop then recreate.
drop function if exists public.get_efficacy_report(uuid);

create function public.get_efficacy_report(p_org uuid)
returns table(
  cohort text,
  fathers bigint,
  completed bigint,
  baseline numeric,
  latest numeric,
  movement numeric,
  outcomes text,
  suppressed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reports_org(p_org) then
    raise exception 'not authorized to view this organization report';
  end if;
  return query
  with s as (
    select ks.id, ks.user_id, ks.status,
           coalesce(c.name, 'Unassigned') as cohort_name
    from keystone_sessions ks
    left join cohorts c on c.id = ks.cohort_id
    where ks.organization_id = p_org
  ),
  firsts as (
    select distinct on (s.user_id, s.cohort_name) s.cohort_name, kr.overall_pct
    from s join keystone_results kr on kr.session_id = s.id
    order by s.user_id, s.cohort_name, kr.completed_at asc
  ),
  lasts as (
    select distinct on (s.user_id, s.cohort_name) s.cohort_name, kr.overall_pct
    from s join keystone_results kr on kr.session_id = s.id
    order by s.user_id, s.cohort_name, kr.completed_at desc
  ),
  oc as (
    select s.cohort_name,
           count(*) filter (where po.outcome_flag is not null) as linked,
           count(*) filter (where po.outcome_flag) as flagged,
           min(po.outcome_type) as otype
    from s join participant_outcomes po on po.session_id = s.id
    group by s.cohort_name
  ),
  agg as (
    select s.cohort_name as cohort_name,
           count(distinct s.user_id) as fathers,
           count(distinct s.user_id) filter (where s.status = 'completed') as completed,
           round(avg(f.overall_pct)::numeric, 1) as baseline,
           round(avg(l.overall_pct)::numeric, 1) as latest,
           round((avg(l.overall_pct) - avg(f.overall_pct))::numeric, 1) as movement,
           case when max(oc.linked) is null then null
                else max(oc.otype) || ' overlay: ' || max(oc.flagged)::text || ' of ' || max(oc.linked)::text || ' linked records flagged'
           end as outcomes
    from s
    left join firsts f on f.cohort_name = s.cohort_name
    left join lasts  l on l.cohort_name = s.cohort_name
    left join oc on oc.cohort_name = s.cohort_name
    group by s.cohort_name
  )
  select a.cohort_name,
         case when a.fathers < 11 then 0 else a.fathers end,
         case when a.fathers < 11 then 0 else a.completed end,
         case when a.fathers < 11 then null else a.baseline end,
         case when a.fathers < 11 then null else a.latest end,
         case when a.fathers < 11 then null else a.movement end,
         case when a.fathers < 11 then null else a.outcomes end,
         (a.fathers < 11) as suppressed
  from agg a
  order by a.cohort_name;
end
$$;

revoke all on function public.get_efficacy_report(uuid) from public;
grant execute on function public.get_efficacy_report(uuid) to authenticated;

create or replace function public.list_my_report_orgs()
returns table(id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select o.id, o.name
  from orgs o
  where public.reports_org(o.id)
  order by o.name;
$$;

revoke all on function public.list_my_report_orgs() from public;
grant execute on function public.list_my_report_orgs() to authenticated;

-- Explicit: researcher is not granted SELECT on identified or operational tables.
-- Table grants stay as they are; RLS still gates org_admin / circle_leader / own-row.
-- Do not GRANT researcher (or fc_researcher) SELECT on org_participation, seats,
-- org_join_codes, keystone_answers, quiz_responses, profiles, or participant_claims.
