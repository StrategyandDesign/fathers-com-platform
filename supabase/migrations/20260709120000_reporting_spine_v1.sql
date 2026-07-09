-- ============================================================================
-- Reporting spine v1 | HISTORICAL RECORD, ALREADY APPLIED
-- Applied by hand via the Supabase dashboard on 2026-07-09 (verified: four
-- empty tables returned). Committed here so the repo records reality, per
-- supabase/migrations/README.md. Do NOT re-run. Reconciled by v2, which
-- retargets the spine onto the validated Keystone instrument and the
-- canonical orgs table.
-- ============================================================================
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  org_type    text,
  created_at  timestamptz not null default now()
);
create table if not exists public.programs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  name             text not null,
  created_at       timestamptz not null default now()
);
create table if not exists public.cohorts (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete set null,
  name        text not null,
  started_on  date,
  created_at  timestamptz not null default now()
);
alter table public.assessments add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.assessments add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.assessments add column if not exists cohort_id uuid references public.cohorts(id) on delete set null;
create table if not exists public.participant_outcomes (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null,
  outcome_type   text not null check (outcome_type in ('recidivism','collection','readiness','other')),
  outcome_flag   boolean,
  outcome_value  numeric,
  outcome_date   date,
  source         text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_participant_outcomes_assessment on public.participant_outcomes(assessment_id);
create index if not exists idx_participant_outcomes_type on public.participant_outcomes(outcome_type);
alter table public.organizations        enable row level security;
alter table public.programs             enable row level security;
alter table public.cohorts              enable row level security;
alter table public.participant_outcomes enable row level security;
