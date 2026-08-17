-- Clean-pilot RLS policies. Table structure is unchanged.
-- Reviewers have no access to individual records (aggregates come later).
-- Helpers are wrapped in SELECT so Postgres can cache stable values.

-- Table privileges: RLS only filters rows that the role can already access.
grant select, insert, update, delete on
  public.profiles,
  public.groups,
  public.group_members,
  public.trainings,
  public.sessions,
  public.session_progress,
  public.father_profiles,
  public.training_assignments,
  public.certificates
to authenticated, service_role;

-- TRUNCATE is not filtered by RLS.
revoke truncate on
  public.profiles,
  public.groups,
  public.group_members,
  public.trainings,
  public.sessions,
  public.session_progress,
  public.father_profiles,
  public.training_assignments,
  public.certificates
from anon, authenticated;

-- ---------- profiles ----------
-- Anyone signed in can see/update their own profile.
-- Managers can see fathers in groups they own. Role cannot be changed here.
create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.manages_father(id))
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = (select public.current_user_role())
);

-- ---------- groups ----------
create policy groups_select
on public.groups
for select
to authenticated
using (
  (select public.is_manager_of_group(id))
  or exists (
    select 1
    from public.group_members
    where group_members.group_id = groups.id
      and group_members.father_id = (select auth.uid())
  )
);

create policy groups_insert_own
on public.groups
for insert
to authenticated
with check (
  manager_id = (select auth.uid())
  and (select public.current_user_role()) = 'manager'::public.user_role
);

create policy groups_update_own
on public.groups
for update
to authenticated
using ((select public.is_manager_of_group(id)))
with check ((select public.is_manager_of_group(id)));

create policy groups_delete_own
on public.groups
for delete
to authenticated
using ((select public.is_manager_of_group(id)));

-- ---------- group_members ----------
-- Fathers can read their membership. Managers manage the roster.
create policy group_members_select
on public.group_members
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select public.is_manager_of_group(group_id))
);

create policy group_members_write
on public.group_members
for all
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check ((select public.is_manager_of_group(group_id)));

-- ---------- trainings / sessions (catalog, not individual records) ----------
create policy trainings_select
on public.trainings
for select
to authenticated
using (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role
  )
);

create policy sessions_select
on public.sessions
for select
to authenticated
using (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role
  )
);

-- ---------- father-owned records ----------
-- Fathers fully manage their own rows. Managers manage fathers in their groups.
create policy session_progress_own_or_managed
on public.session_progress
for all
to authenticated
using (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
)
with check (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
);

create policy father_profiles_own_or_managed
on public.father_profiles
for all
to authenticated
using (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
)
with check (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
);

create policy training_assignments_own_or_managed
on public.training_assignments
for all
to authenticated
using (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
)
with check (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
);

create policy certificates_own_or_managed
on public.certificates
for all
to authenticated
using (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
)
with check (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
);
