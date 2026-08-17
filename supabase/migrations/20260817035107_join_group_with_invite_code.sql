-- Fathers join a manager's group by invite code.
-- RLS blocks father inserts on group_members, so this lives in internal
-- as security definer. Public wrapper is invoker-only.

create or replace function internal.join_group_with_invite_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text;
  uid uuid;
  found_group_id uuid;
begin
  normalized := nullif(trim(invite_code), '');
  uid := (select auth.uid());

  if uid is null then
    raise exception 'Not signed in';
  end if;

  if normalized is null then
    raise exception 'Invalid invite code';
  end if;

  select groups.id
    into found_group_id
  from public.groups
  where groups.invite_code = normalized;

  if found_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, father_id)
  values (found_group_id, uid)
  on conflict (group_id, father_id) do nothing;

  return found_group_id;
end;
$$;

create or replace function public.join_group_with_invite_code(invite_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select internal.join_group_with_invite_code($1);
$$;

revoke all on function internal.join_group_with_invite_code(text) from public, anon;
grant execute on function internal.join_group_with_invite_code(text) to authenticated, service_role;

revoke all on function public.join_group_with_invite_code(text) from public, anon;
grant execute on function public.join_group_with_invite_code(text) to authenticated, service_role;
