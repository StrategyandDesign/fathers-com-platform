-- ============================================================================
-- Reporting spine v2 | RECONCILIATION. RUN THIS ONE.
--
-- Fixes two defects in v1, found in audit against the repo schema:
--   1. v1 tagged public.assessments, the LEGACY demo instrument
--      (instrument_version 'demo-0'). The validated 130-item Keystone writes
--      to keystone_sessions / keystone_answers / keystone_results. The
--      reporting spine must hang off the validated instrument.
--   2. v1 created public.organizations, duplicating the canonical
--      public.orgs table that RBAC, seats, and circles already hang off.
--
-- Safe: every affected table is empty in production. Re-runnable.
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste whole file -> Run.
-- ============================================================================

-- 1. Tag the VALIDATED instrument. Set at intake; results inherit by join.
alter table public.keystone_sessions
  add column if not exists organization_id uuid references public.orgs(id) on delete set null;
alter table public.keystone_sessions
  add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.keystone_sessions
  add column if not exists cohort_id uuid references public.cohorts(id) on delete set null;
create index if not exists idx_keystone_sessions_org     on public.keystone_sessions(organization_id);
create index if not exists idx_keystone_sessions_program on public.keystone_sessions(program_id);
create index if not exists idx_keystone_sessions_cohort  on public.keystone_sessions(cohort_id);

-- 2. Repoint programs to the canonical orgs table.
alter table public.programs drop constraint if exists programs_organization_id_fkey;
alter table public.programs
  add constraint programs_organization_id_fkey
  foreign key (organization_id) references public.orgs(id) on delete set null;

-- 3. Outcomes key on the validated session, not the legacy assessment.
alter table public.participant_outcomes drop constraint if exists fk_outcome_assessment;
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='participant_outcomes'
               and column_name='assessment_id') then
    alter table public.participant_outcomes rename column assessment_id to session_id;
  end if;
end $$;
alter table public.participant_outcomes drop constraint if exists fk_outcome_session;
alter table public.participant_outcomes
  add constraint fk_outcome_session
  foreign key (session_id) references public.keystone_sessions(id) on delete cascade;
alter index if exists idx_participant_outcomes_assessment
  rename to idx_participant_outcomes_session;

-- 4. Remove the misplaced tags from the legacy demo table.
alter table public.assessments drop column if exists organization_id;
alter table public.assessments drop column if exists program_id;
alter table public.assessments drop column if exists cohort_id;

-- 5. Drop the duplicate org table. Canonical is public.orgs.
drop table if exists public.organizations;

-- 6. Verify. Expect: three new columns on keystone_sessions,
--    session_id on participant_outcomes, organizations gone.
select
  (select count(*) from information_schema.columns
    where table_name='keystone_sessions'
      and column_name in ('organization_id','program_id','cohort_id')) as ks_tagged_3_expected,
  (select count(*) from information_schema.columns
    where table_name='participant_outcomes' and column_name='session_id') as outcomes_keyed_1_expected,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='organizations') as duplicate_gone_0_expected;
