-- Fathers and leaders start sharing anonymous Gathering counts.
-- Reviewers stay off until they turn it on. Super-admins never share.
-- Down path: drop the trigger and function; existing rows stay as stored.

create or replace function internal.apply_default_anonymous_share()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role in ('father'::public.user_role, 'manager'::public.user_role) then
      new.share_anonymous_admin := true;
      if new.share_anonymous_admin_at is null then
        new.share_anonymous_admin_at := now();
      end if;
    end if;
    return new;
  end if;

  if new.role in ('father'::public.user_role, 'manager'::public.user_role)
    and old.role is distinct from new.role
    and old.role not in ('father'::public.user_role, 'manager'::public.user_role)
  then
    new.share_anonymous_admin := true;
    new.share_anonymous_admin_at := coalesce(new.share_anonymous_admin_at, now());
  elsif new.role = 'admin'::public.user_role
    and old.role is distinct from new.role
  then
    new.share_anonymous_admin := false;
    new.share_anonymous_admin_at := null;
  end if;

  return new;
end;
$$;

revoke all on function internal.apply_default_anonymous_share()
  from public, anon, authenticated;

drop trigger if exists profiles_default_anonymous_share on public.profiles;

create trigger profiles_default_anonymous_share
  before insert or update of role on public.profiles
  for each row
  execute function internal.apply_default_anonymous_share();

comment on column public.profiles.share_anonymous_admin is
  'When true, this account releases anonymous participation counts to super-admin Gathering. Fathers and leaders start on. Reviewers stay off until they turn it on. Super-admins do not share. No names, emails, notes, or answers.';

comment on column public.profiles.share_anonymous_admin_at is
  'When the current share was turned on. Cleared when sharing is turned off.';

update public.profiles
set
  share_anonymous_admin = true,
  share_anonymous_admin_at = coalesce(share_anonymous_admin_at, now())
where role in ('father'::public.user_role, 'manager'::public.user_role)
  and deactivated_at is null
  and not share_anonymous_admin;
