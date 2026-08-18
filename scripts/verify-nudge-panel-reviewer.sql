-- Prove the nudge panel query is empty for the reviewer role.
-- manages_father requires groups.manager_id = auth.uid() and that profile.role = 'manager'.
-- Reviewers never satisfy that, so notification_reachability_many returns no rows.

select
  p.id as reviewer_id,
  p.role,
  (
    select count(*)
    from public.groups g
    where g.manager_id = p.id
  ) as groups_managed
from public.profiles p
where p.role = 'reviewer';

select count(*) as reachability_rows_without_manager_jwt
from public.notification_reachability_many(
  array(
    select id
    from public.profiles
    where role = 'father'
    limit 20
  )
);
