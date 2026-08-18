-- Leaders can take the same trainings and assessments as fathers, with
-- progress saved to their own account. Own-row only. Certificates and
-- training assignments stay father-only so Leaders do not appear on the roster.
-- Accepted training ids also include trainings the Leader accepted for groups
-- they manage (they are not group members).

create or replace function public.is_own_walk_row(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    target_user_id is not null
    and target_user_id = (select auth.uid())
    and (select public.current_user_role()) in (
      'father'::public.user_role,
      'manager'::public.user_role
    );
$$;

revoke all on function public.is_own_walk_row(uuid) from public, anon;
grant execute on function public.is_own_walk_row(uuid) to authenticated, service_role;

create or replace function internal.my_accepted_training_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct accepted.training_id), '{}'::uuid[])
  from (
    select reviews.training_id
    from public.organization_training_reviews as reviews
    join public.group_members as members
      on members.group_id = reviews.group_id
    where members.father_id = (select auth.uid())
      and reviews.status = 'accepted'
    union
    select reviews.training_id
    from public.organization_training_reviews as reviews
    join public.groups as managed
      on managed.id = reviews.group_id
    where managed.manager_id = (select auth.uid())
      and reviews.status = 'accepted'
  ) as accepted;
$$;

drop policy if exists session_progress_own_or_managed on public.session_progress;
create policy session_progress_own_or_managed
on public.session_progress
for all
to authenticated
using (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
)
with check (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
);

drop policy if exists father_profiles_own_or_managed on public.father_profiles;
create policy father_profiles_own_or_managed
on public.father_profiles
for all
to authenticated
using (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
)
with check (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
);

drop policy if exists father_profile_drafts_own_or_managed on public.father_profile_drafts;
create policy father_profile_drafts_own_or_managed
on public.father_profile_drafts
for all
to authenticated
using (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
)
with check (
  (select public.is_own_walk_row(father_id))
  or (select public.manages_father(father_id))
);

drop policy if exists action_commitments_own on public.action_commitments;
create policy action_commitments_own
on public.action_commitments
for all
to authenticated
using ((select public.is_own_walk_row(user_id)))
with check ((select public.is_own_walk_row(user_id)));

drop policy if exists custom_assessment_assignments_insert on public.custom_assessment_assignments;
create policy custom_assessment_assignments_insert
on public.custom_assessment_assignments
for insert
to authenticated
with check (
  assigned_by = (select auth.uid())
  and (select public.owns_custom_assessment(assessment_id))
  and (
    (select public.manages_father(father_id))
    or (
      father_id = (select auth.uid())
      and (select public.current_user_role()) = 'manager'::public.user_role
    )
  )
);

drop policy if exists custom_assessment_assignments_update on public.custom_assessment_assignments;
create policy custom_assessment_assignments_update
on public.custom_assessment_assignments
for update
to authenticated
using ((select public.is_own_walk_row(father_id)))
with check ((select public.is_own_walk_row(father_id)));

drop policy if exists custom_assessment_answers_insert on public.custom_assessment_answers;
create policy custom_assessment_answers_insert
on public.custom_assessment_answers
for insert
to authenticated
with check (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role
  )
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
);

drop policy if exists custom_assessment_answers_update on public.custom_assessment_answers;
create policy custom_assessment_answers_update
on public.custom_assessment_answers
for update
to authenticated
using (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role
  )
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
)
with check (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role
  )
  and exists (
    select 1
    from public.custom_assessment_assignments
    where custom_assessment_assignments.id = assignment_id
      and custom_assessment_assignments.father_id = (select auth.uid())
      and custom_assessment_assignments.status <> 'completed'
  )
);
