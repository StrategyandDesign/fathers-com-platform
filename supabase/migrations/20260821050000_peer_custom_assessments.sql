-- Peer Leaders on the same organization share custom assessments.

create or replace function internal.manages_same_organization_as(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups
    where (select internal.is_manager_of_group(groups.id))
      and (
        groups.manager_id = $1
        or exists (
          select 1
          from public.organization_staff as staff
          where staff.group_id = groups.id
            and staff.profile_id = $1
            and staff.staff_role = 'manager'::public.organization_staff_role
        )
      )
  );
$$;

revoke all on function internal.manages_same_organization_as(uuid) from public, anon;
grant execute on function internal.manages_same_organization_as(uuid) to authenticated, service_role;

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
    join public.profiles as owner on owner.id = custom_assessments.manager_id
    join public.profiles as me on me.id = (select auth.uid())
    where custom_assessments.id = $1
      and owner.role = 'manager'::public.user_role
      and me.role = 'manager'::public.user_role
      and me.deactivated_at is null
      and (
        custom_assessments.manager_id = (select auth.uid())
        or (select internal.manages_same_organization_as(custom_assessments.manager_id))
      )
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
          (select internal.owns_custom_assessment(custom_assessments.id))
          and (select internal.manages_father(custom_assessment_assignments.father_id))
        )
      )
  );
$$;

comment on function internal.manages_same_organization_as(uuid) is
  'True when the current Leader shares an organization with this profile.';
