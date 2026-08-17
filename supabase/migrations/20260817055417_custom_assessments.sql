-- Manager-created custom assessments (parallel to Father Profile / Keystone).
-- Scoped to the creating manager. No org table exists on clean-pilot; groups
-- already use manager_id. Role checks use public.profiles / helpers, never
-- user_metadata. Reviewers have no access (default deny).

-- ---------- tables ----------
create table public.custom_assessments (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_assessments_manager_id_idx
  on public.custom_assessments (manager_id);

create table public.custom_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null
    references public.custom_assessments (id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  prompt text not null,
  question_type text not null
    check (question_type in ('short_text', 'single_select')),
  options jsonb,
  unique (assessment_id, order_index),
  check (
    (
      question_type = 'short_text'
      and options is null
    )
    or (
      question_type = 'single_select'
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) >= 2
    )
  )
);

create index custom_assessment_questions_assessment_id_idx
  on public.custom_assessment_questions (assessment_id);

create table public.custom_assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null
    references public.custom_assessments (id) on delete cascade,
  father_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assessment_id, father_id)
);

create index custom_assessment_assignments_assessment_id_idx
  on public.custom_assessment_assignments (assessment_id);
create index custom_assessment_assignments_father_id_idx
  on public.custom_assessment_assignments (father_id);
create index custom_assessment_assignments_assigned_by_idx
  on public.custom_assessment_assignments (assigned_by);

create table public.custom_assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null
    references public.custom_assessment_assignments (id) on delete cascade,
  question_id uuid not null
    references public.custom_assessment_questions (id) on delete cascade,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (assignment_id, question_id)
);

create index custom_assessment_answers_assignment_id_idx
  on public.custom_assessment_answers (assignment_id);
create index custom_assessment_answers_question_id_idx
  on public.custom_assessment_answers (question_id);

-- ---------- RLS ----------
alter table public.custom_assessments enable row level security;
alter table public.custom_assessment_questions enable row level security;
alter table public.custom_assessment_assignments enable row level security;
alter table public.custom_assessment_answers enable row level security;

alter table public.custom_assessments force row level security;
alter table public.custom_assessment_questions force row level security;
alter table public.custom_assessment_assignments force row level security;
alter table public.custom_assessment_answers force row level security;

grant select, insert, update, delete on
  public.custom_assessments,
  public.custom_assessment_questions,
  public.custom_assessment_assignments,
  public.custom_assessment_answers
to authenticated, service_role;

revoke truncate on
  public.custom_assessments,
  public.custom_assessment_questions,
  public.custom_assessment_assignments,
  public.custom_assessment_answers
from anon, authenticated;

-- ---------- helpers (security definer, internal schema) ----------
create or replace function internal.owns_custom_assessment(assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.custom_assessments
    join public.profiles on profiles.id = custom_assessments.manager_id
    where custom_assessments.id = $1
      and custom_assessments.manager_id = (select auth.uid())
      and profiles.role = 'manager'::public.user_role
  );
$$;

create or replace function internal.has_custom_assessment_assignment(assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.assessment_id = $1
      and custom_assessment_assignments.father_id = (select auth.uid())
  );
$$;

create or replace function internal.can_access_custom_assignment(assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.custom_assessment_assignments
    join public.custom_assessments
      on custom_assessments.id = custom_assessment_assignments.assessment_id
    where custom_assessment_assignments.id = $1
      and (
        custom_assessment_assignments.father_id = (select auth.uid())
        or (
          custom_assessments.manager_id = (select auth.uid())
          and (select internal.manages_father(custom_assessment_assignments.father_id))
        )
      )
  );
$$;

create or replace function public.owns_custom_assessment(assessment_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.owns_custom_assessment($1);
$$;

create or replace function public.has_custom_assessment_assignment(assessment_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.has_custom_assessment_assignment($1);
$$;

create or replace function public.can_access_custom_assignment(assignment_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.can_access_custom_assignment($1);
$$;

revoke all on function internal.owns_custom_assessment(uuid) from public, anon;
revoke all on function internal.has_custom_assessment_assignment(uuid) from public, anon;
revoke all on function internal.can_access_custom_assignment(uuid) from public, anon;
grant execute on function internal.owns_custom_assessment(uuid) to authenticated, service_role;
grant execute on function internal.has_custom_assessment_assignment(uuid) to authenticated, service_role;
grant execute on function internal.can_access_custom_assignment(uuid) to authenticated, service_role;

revoke all on function public.owns_custom_assessment(uuid) from public, anon;
revoke all on function public.has_custom_assessment_assignment(uuid) from public, anon;
revoke all on function public.can_access_custom_assignment(uuid) from public, anon;
grant execute on function public.owns_custom_assessment(uuid) to authenticated, service_role;
grant execute on function public.has_custom_assessment_assignment(uuid) to authenticated, service_role;
grant execute on function public.can_access_custom_assignment(uuid) to authenticated, service_role;

-- ---------- policies ----------
-- Assessments: owning manager CRUD; assigned fathers can read.
create policy custom_assessments_select
on public.custom_assessments
for select
to authenticated
using (
  (select public.owns_custom_assessment(id))
  or (select public.has_custom_assessment_assignment(id))
);

create policy custom_assessments_insert
on public.custom_assessments
for insert
to authenticated
with check (
  manager_id = (select auth.uid())
  and (select public.current_user_role()) = 'manager'::public.user_role
);

create policy custom_assessments_update
on public.custom_assessments
for update
to authenticated
using ((select public.owns_custom_assessment(id)))
with check ((select public.owns_custom_assessment(id)));

create policy custom_assessments_delete
on public.custom_assessments
for delete
to authenticated
using ((select public.owns_custom_assessment(id)));

-- Questions: same read as parent; only owning manager writes.
create policy custom_assessment_questions_select
on public.custom_assessment_questions
for select
to authenticated
using (
  (select public.owns_custom_assessment(assessment_id))
  or (select public.has_custom_assessment_assignment(assessment_id))
);

create policy custom_assessment_questions_insert
on public.custom_assessment_questions
for insert
to authenticated
with check ((select public.owns_custom_assessment(assessment_id)));

create policy custom_assessment_questions_update
on public.custom_assessment_questions
for update
to authenticated
using ((select public.owns_custom_assessment(assessment_id)))
with check ((select public.owns_custom_assessment(assessment_id)));

create policy custom_assessment_questions_delete
on public.custom_assessment_questions
for delete
to authenticated
using ((select public.owns_custom_assessment(assessment_id)));

-- Assignments: manager assigns only to fathers in their groups; fathers read/update own.
create policy custom_assessment_assignments_select
on public.custom_assessment_assignments
for select
to authenticated
using ((select public.can_access_custom_assignment(id)));

create policy custom_assessment_assignments_insert
on public.custom_assessment_assignments
for insert
to authenticated
with check (
  (select public.owns_custom_assessment(assessment_id))
  and (select public.manages_father(father_id))
  and assigned_by = (select auth.uid())
);

create policy custom_assessment_assignments_update
on public.custom_assessment_assignments
for update
to authenticated
using (
  father_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
)
with check (
  father_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

-- Answers: father writes own while not completed; manager who assigned can read.
create policy custom_assessment_answers_select
on public.custom_assessment_answers
for select
to authenticated
using ((select public.can_access_custom_assignment(assignment_id)));

create policy custom_assessment_answers_insert
on public.custom_assessment_answers
for insert
to authenticated
with check (
  (select public.current_user_role()) = 'father'::public.user_role
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
);

create policy custom_assessment_answers_update
on public.custom_assessment_answers
for update
to authenticated
using (
  (select public.current_user_role()) = 'father'::public.user_role
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
)
with check (
  (select public.current_user_role()) = 'father'::public.user_role
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
);
