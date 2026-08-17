-- Production hardening (additive):
-- 1. Fathers may read their own certificates and assignments, not write them.
-- 2. Server-side recipient lookup for transactional email (own row or managed father).
-- Role checks use public.profiles helpers, never user_metadata.
-- Security-definer body stays in internal.

-- ---------- certificates: split ALL into select vs manager writes ----------
drop policy if exists certificates_own_or_managed on public.certificates;
drop policy if exists certificates_select on public.certificates;
drop policy if exists certificates_insert on public.certificates;
drop policy if exists certificates_update on public.certificates;
drop policy if exists certificates_delete on public.certificates;

create policy certificates_select
on public.certificates
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select public.manages_father(father_id))
);

create policy certificates_insert
on public.certificates
for insert
to authenticated
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

create policy certificates_update
on public.certificates
for update
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
)
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

create policy certificates_delete
on public.certificates
for delete
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

-- ---------- assignments: father read own; manager writes for managed fathers ----------
drop policy if exists training_assignments_own_or_managed on public.training_assignments;
drop policy if exists training_assignments_select on public.training_assignments;
drop policy if exists training_assignments_insert on public.training_assignments;
drop policy if exists training_assignments_update on public.training_assignments;
drop policy if exists training_assignments_delete on public.training_assignments;

create policy training_assignments_select
on public.training_assignments
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select public.manages_father(father_id))
);

create policy training_assignments_insert
on public.training_assignments
for insert
to authenticated
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

create policy training_assignments_update
on public.training_assignments
for update
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
)
with check (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

create policy training_assignments_delete
on public.training_assignments
for delete
to authenticated
using (
  (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(father_id))
);

-- ---------- email recipient (pref + address) ----------
create or replace function internal.notification_recipient(
  target_user_id uuid,
  pref_key text
)
returns table (email text, allowed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed_pref boolean;
  recipient_email text;
begin
  if target_user_id is null or pref_key is null then
    return;
  end if;

  if pref_key not in (
    'participant_joined',
    'session_completed',
    'training_completed',
    'profile_completed',
    'certificate_sent',
    'weekly_report_ready',
    'account_security_alerts',
    'session_reminders',
    'new_trainings'
  ) then
    return;
  end if;

  if (select auth.uid()) is distinct from target_user_id
     and not internal.manages_father(target_user_id) then
    return;
  end if;

  select u.email::text
    into recipient_email
  from auth.users as u
  where u.id = target_user_id;

  if recipient_email is null or recipient_email = '' then
    return;
  end if;

  execute format(
    'select %I from public.notification_preferences where user_id = $1',
    pref_key
  )
  into allowed_pref
  using target_user_id;

  email := recipient_email;
  allowed := coalesce(allowed_pref, true);
  return next;
end;
$$;

create or replace function public.notification_recipient(
  target_user_id uuid,
  pref_key text
)
returns table (email text, allowed boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from internal.notification_recipient($1, $2);
$$;

revoke all on function internal.notification_recipient(uuid, text)
  from public, anon;
grant execute on function internal.notification_recipient(uuid, text)
  to authenticated, service_role;

revoke all on function public.notification_recipient(uuid, text)
  from public, anon;
grant execute on function public.notification_recipient(uuid, text)
  to authenticated, service_role;
