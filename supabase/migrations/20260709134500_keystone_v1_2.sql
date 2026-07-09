-- ============================================================================
-- Keystone Standard v1.2 | RUN THIS ONE (after v2, which is already applied)
--
-- Four capabilities:
--   1. JOIN CODES: one link tags every man's assessment to an org/program/cohort.
--   2. THE EFFICACY REPORT: security-definer RPCs so an org admin sees cohort
--      aggregates and never a man's private answers.
--   3. CERTIFICATE TRIO: retitle by slug (slugs never change, so existing
--      enrollments never break); publish the three, unpublish the rest.
--   4. LEGACY VOICE ARCHIVE: recordings carry the chosen prompt as a title.
--
-- Safe and re-runnable. HOW TO RUN: Supabase SQL Editor, paste all, Run.
-- ============================================================================

-- 1. JOIN CODES ---------------------------------------------------------------
create table if not exists public.org_join_codes (
  code        text primary key,
  org_id      uuid not null references public.orgs(id) on delete cascade,
  program_id  uuid references public.programs(id) on delete set null,
  cohort_id   uuid references public.cohorts(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.org_join_codes enable row level security;
drop policy if exists "resolve active join codes" on public.org_join_codes;
create policy "resolve active join codes" on public.org_join_codes
  for select using (active = true);

-- 2. EFFICACY REPORT RPCs -----------------------------------------------------
create or replace function public.list_my_report_orgs()
returns table (id uuid, name text)
language sql security definer set search_path = public as $$
  select o.id, o.name
  from orgs o
  join org_admins oa on oa.org_id = o.id
  where oa.user_id = auth.uid()
  order by o.name;
$$;
revoke all on function public.list_my_report_orgs() from public;
grant execute on function public.list_my_report_orgs() to authenticated;

create or replace function public.get_efficacy_report(p_org uuid)
returns table (cohort text, fathers bigint, completed bigint,
               baseline numeric, latest numeric, movement numeric, outcomes text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from org_admins oa where oa.org_id = p_org and oa.user_id = auth.uid()) then
    raise exception 'not an admin of this organization';
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
  )
  select s.cohort_name,
         count(distinct s.user_id),
         count(distinct s.user_id) filter (where s.status = 'completed'),
         round(avg(f.overall_pct)::numeric, 1),
         round(avg(l.overall_pct)::numeric, 1),
         round((avg(l.overall_pct) - avg(f.overall_pct))::numeric, 1),
         case when max(oc.linked) is null then null
              else max(oc.otype) || ' overlay: ' || max(oc.flagged)::text || ' of ' || max(oc.linked)::text || ' linked records flagged'
         end
  from s
  left join firsts f on f.cohort_name = s.cohort_name
  left join lasts  l on l.cohort_name = s.cohort_name
  left join oc on oc.cohort_name = s.cohort_name
  group by s.cohort_name
  order by s.cohort_name;
end $$;
revoke all on function public.get_efficacy_report(uuid) from public;
grant execute on function public.get_efficacy_report(uuid) to authenticated;

-- 3. CERTIFICATE TRIO (slugs unchanged; titles carry the story) ----------------
insert into public.certificate_courses (slug, title, hours, price_cents)
values ('fundamentals', 'Fathering Fundamentals', 10.0, 7900),
       ('anger',        'Steady Under Pressure', 8.0, 7900),
       ('reentry',      'Coming Home Present',  12.0, 7900)
on conflict (slug) do update set title = excluded.title, hours = excluded.hours;

update public.certificate_courses set published = true  where slug in ('fundamentals','anger','reentry');
update public.certificate_courses set published = false where slug not in ('fundamentals','anger','reentry');

-- 4. LEGACY VOICE ARCHIVE -------------------------------------------------------
alter table public.voice_recordings add column if not exists title text;

-- 5. VERIFY. Expect: join_codes_ready=0, published_trio=3, voice_titled=1.
select
  (select count(*) from public.org_join_codes) as join_codes_ready,
  (select count(*) from public.certificate_courses where published) as published_trio,
  (select count(*) from information_schema.columns
     where table_name='voice_recordings' and column_name='title') as voice_titled;
