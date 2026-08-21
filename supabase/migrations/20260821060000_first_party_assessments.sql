-- First-party platform assessments (Legacy Architect and later catalog
-- instruments). Super-admin releases them. Leaders accept or decline.
-- Fathers persist one attempt per instrument.

create or replace function internal.assessment_release_title(p_assessment_key text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select platform_assessments.title
      from public.platform_assessments
      where platform_assessments.assessment_key = p_assessment_key
      limit 1
    ),
    case
      when p_assessment_key = 'keystone' then 'Keystone Assessment'
      when p_assessment_key = 'legacy-architect' then 'The Legacy Architect Keystone Assessment'
      else p_assessment_key
    end
  );
$$;

revoke all on function internal.assessment_release_title(text)
  from public, anon, authenticated;
grant execute on function internal.assessment_release_title(text) to service_role;

insert into public.platform_assessments (
  slug,
  assessment_key,
  title,
  description,
  attribution,
  development_status,
  scoring_method,
  scale_min,
  scale_max,
  published,
  archived,
  last_edited_at
)
values (
  'legacy-architect',
  'legacy-architect',
  'The Legacy Architect Keystone Assessment',
  'A 30-question look at the architecture you are handing the next generation. Answer from current behavior, not intentions.',
  'Fathers.com',
  'ready_for_review',
  'weighted_mean',
  1,
  5,
  false,
  false,
  now()
)
on conflict (assessment_key) do update
set
  title = excluded.title,
  description = excluded.description,
  attribution = excluded.attribution,
  last_edited_at = now();

create table if not exists public.catalog_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  assessment_key text not null,
  answers jsonb not null default '{}'::jsonb,
  total integer,
  outcome_key text,
  outcome_label text,
  outcome_description text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, assessment_key),
  constraint catalog_assessment_attempts_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
      and assessment_key <> 'keystone'
    ),
  constraint catalog_assessment_attempts_answers_object
    check (jsonb_typeof(answers) = 'object')
);

comment on table public.catalog_assessment_attempts is
  'One in-progress or completed take of a first-party catalog assessment per user.';

create index if not exists catalog_assessment_attempts_user_idx
  on public.catalog_assessment_attempts (user_id, completed_at desc);

create index if not exists catalog_assessment_attempts_key_idx
  on public.catalog_assessment_attempts (assessment_key, completed_at desc);

alter table public.catalog_assessment_attempts enable row level security;
alter table public.catalog_assessment_attempts force row level security;

grant select, insert, update, delete on public.catalog_assessment_attempts
  to authenticated, service_role;
revoke truncate on public.catalog_assessment_attempts from anon, authenticated;

drop policy if exists catalog_assessment_attempts_own
  on public.catalog_assessment_attempts;
create policy catalog_assessment_attempts_own
on public.catalog_assessment_attempts
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists catalog_assessment_attempts_manager_select
  on public.catalog_assessment_attempts;
create policy catalog_assessment_attempts_manager_select
on public.catalog_assessment_attempts
for select
to authenticated
using (
  (select public.is_super_admin())
  or exists (
    select 1
    from public.group_members as membership
    where membership.father_id = catalog_assessment_attempts.user_id
      and (select public.is_manager_of_group(membership.group_id))
  )
);
