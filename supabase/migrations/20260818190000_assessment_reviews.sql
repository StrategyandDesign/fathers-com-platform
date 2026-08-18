-- Super-admin → Leader review for platform assessments (Keystone).
-- Mirrors organization_training_reviews. Leader share/remove stays on
-- organization_assessment_availability.
-- Down path: select internal.rollback_assessment_reviews();

alter table public.notification_preferences
  add column if not exists assessment_releases boolean not null default true;

comment on column public.notification_preferences.assessment_releases is
  'Email and in-app notice when a Super-admin releases an assessment for Leader review.';

alter table public.manager_notifications
  add column if not exists assessment_key text;

alter table public.manager_notifications
  drop constraint if exists manager_notifications_kind_check;

alter table public.manager_notifications
  add constraint manager_notifications_kind_check
  check (kind in ('training_release', 'assessment_release'));

create table if not exists public.platform_assessment_releases (
  assessment_key text primary key,
  released_at timestamptz,
  first_released_at timestamptz not null default now(),
  released_by uuid references auth.users (id) on delete set null,
  constraint platform_assessment_releases_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
    )
);

comment on table public.platform_assessment_releases is
  'Platform assessments Super-admin has put into Leader review. first_released_at is never cleared.';

create table if not exists public.organization_assessment_reviews (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  assessment_key text not null,
  status text not null default 'pending',
  decline_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  unique (group_id, assessment_key),
  constraint organization_assessment_reviews_status_check
    check (status in ('pending', 'accepted', 'declined')),
  constraint organization_assessment_reviews_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
    )
);

comment on table public.organization_assessment_reviews is
  'Leader accept/decline after Super-admin releases a platform assessment to the organization.';

create index if not exists organization_assessment_reviews_group_idx
  on public.organization_assessment_reviews (group_id, status);

create index if not exists organization_assessment_reviews_assessment_idx
  on public.organization_assessment_reviews (assessment_key, status);

alter table public.platform_assessment_releases enable row level security;
alter table public.platform_assessment_releases force row level security;
alter table public.organization_assessment_reviews enable row level security;
alter table public.organization_assessment_reviews force row level security;

grant select on public.platform_assessment_releases
  to authenticated, service_role;
revoke insert, update, delete, truncate on public.platform_assessment_releases
  from anon, authenticated;

grant select, update on public.organization_assessment_reviews
  to authenticated, service_role;
revoke insert, delete, truncate on public.organization_assessment_reviews
  from anon, authenticated;

drop policy if exists platform_assessment_releases_select
  on public.platform_assessment_releases;
drop policy if exists organization_assessment_reviews_select
  on public.organization_assessment_reviews;
drop policy if exists organization_assessment_reviews_update
  on public.organization_assessment_reviews;

create policy platform_assessment_releases_select
on public.platform_assessment_releases
for select
to authenticated
using ((select auth.uid()) is not null);

create policy organization_assessment_reviews_select
on public.organization_assessment_reviews
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_super_admin())
  or exists (
    select 1
    from public.group_members as membership
    where membership.group_id = organization_assessment_reviews.group_id
      and membership.father_id = (select auth.uid())
  )
);

create policy organization_assessment_reviews_update
on public.organization_assessment_reviews
for update
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check ((select public.is_manager_of_group(group_id)));

create or replace function internal.assessment_release_title(p_assessment_key text)
returns text
language sql
immutable
as $$
  select case
    when p_assessment_key = 'keystone' then 'Keystone Assessment'
    else p_assessment_key
  end;
$$;

create or replace function internal.release_assessment_to_organizations(
  p_assessment_key text,
  p_released_by uuid,
  p_group_ids uuid[] default null
)
returns table (manager_id uuid, group_id uuid, assessment_key text, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_group record;
  v_inserted integer;
  v_notify boolean;
begin
  if nullif(btrim(p_assessment_key), '') is null then
    return;
  end if;

  v_title := internal.assessment_release_title(p_assessment_key);

  insert into public.platform_assessment_releases (
    assessment_key, released_at, first_released_at, released_by
  )
  values (p_assessment_key, now(), now(), p_released_by)
  on conflict (assessment_key) do update
  set
    released_at = coalesce(public.platform_assessment_releases.released_at, now()),
    released_by = coalesce(p_released_by, public.platform_assessment_releases.released_by);

  for v_group in
    select groups.id, groups.manager_id
    from public.groups
    where groups.manager_id is not null
      and (
        p_group_ids is null
        or cardinality(p_group_ids) = 0
        or groups.id = any (p_group_ids)
      )
    order by groups.name
  loop
    insert into public.organization_assessment_reviews (group_id, assessment_key, status)
    values (v_group.id, p_assessment_key, 'pending')
    on conflict (group_id, assessment_key) do update
    set
      status = 'pending',
      decline_reason = null,
      decided_by = null,
      decided_at = null
    where public.organization_assessment_reviews.status = 'declined';

    get diagnostics v_inserted = row_count;
    is_new := v_inserted > 0;
    manager_id := v_group.manager_id;
    group_id := v_group.id;
    assessment_key := p_assessment_key;

    if v_inserted > 0 then
      select coalesce(prefs.assessment_releases, true)
        into v_notify
      from public.notification_preferences as prefs
      where prefs.user_id = v_group.manager_id;

      if coalesce(v_notify, true) then
        insert into public.manager_notifications (
          manager_id, group_id, assessment_key, kind, title, body, href
        ) values (
          v_group.manager_id,
          v_group.id,
          p_assessment_key,
          'assessment_release',
          'A new assessment is available for your review',
          v_title,
          '/manager/assessment-reviews/' || p_assessment_key
        );
      end if;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.release_assessment_to_organizations(
  p_assessment_key text,
  p_released_by uuid,
  p_group_ids uuid[] default null
)
returns table (manager_id uuid, group_id uuid, assessment_key text, is_new boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select internal.is_super_admin()) then
    raise exception 'Not authorized';
  end if;
  return query
    select *
    from internal.release_assessment_to_organizations(
      p_assessment_key,
      p_released_by,
      p_group_ids
    );
end;
$$;

create or replace function internal.unrelease_assessment_from_organizations(
  p_assessment_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.platform_assessment_releases
    set released_at = null,
        released_by = null
  where assessment_key = p_assessment_key;

  delete from public.organization_assessment_reviews
  where assessment_key = p_assessment_key
    and status = 'pending';

  delete from public.manager_notifications
  where assessment_key = p_assessment_key
    and kind = 'assessment_release';
end;
$$;

create or replace function public.unrelease_assessment_from_organizations(
  p_assessment_key text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select internal.is_super_admin()) then
    raise exception 'Not authorized';
  end if;
  perform internal.unrelease_assessment_from_organizations(p_assessment_key);
end;
$$;

create or replace function internal.seed_group_assessment_reviews(p_group_id uuid)
returns table (manager_id uuid, group_id uuid, assessment_key text, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager uuid;
  v_release record;
  v_inserted integer;
  v_notify boolean;
  v_title text;
begin
  select groups.manager_id into v_manager
  from public.groups
  where groups.id = p_group_id;

  if v_manager is null then
    return;
  end if;

  for v_release in
    select releases.assessment_key
    from public.platform_assessment_releases as releases
    where releases.released_at is not null
  loop
    insert into public.organization_assessment_reviews (group_id, assessment_key, status)
    values (p_group_id, v_release.assessment_key, 'pending')
    on conflict (group_id, assessment_key) do nothing;

    get diagnostics v_inserted = row_count;
    is_new := v_inserted > 0;
    manager_id := v_manager;
    group_id := p_group_id;
    assessment_key := v_release.assessment_key;
    v_title := internal.assessment_release_title(v_release.assessment_key);

    if v_inserted > 0 then
      select coalesce(prefs.assessment_releases, true)
        into v_notify
      from public.notification_preferences as prefs
      where prefs.user_id = v_manager;

      if coalesce(v_notify, true) then
        insert into public.manager_notifications (
          manager_id, group_id, assessment_key, kind, title, body, href
        ) values (
          v_manager,
          p_group_id,
          v_release.assessment_key,
          'assessment_release',
          'A new assessment is available for your review',
          v_title,
          '/manager/assessment-reviews/' || v_release.assessment_key
        );
      end if;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.seed_group_assessment_reviews(p_group_id uuid)
returns table (manager_id uuid, group_id uuid, assessment_key text, is_new boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (
    (select internal.is_super_admin())
    or (select internal.is_manager_of_group(p_group_id))
  ) then
    raise exception 'Not authorized';
  end if;
  return query select * from internal.seed_group_assessment_reviews(p_group_id);
end;
$$;

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
    'new_trainings',
    'training_releases',
    'assessment_releases',
    'action_reminders',
    'leader_encouragement'
  ) then
    return;
  end if;

  if (select auth.uid()) is distinct from target_user_id
     and not internal.manages_father(target_user_id)
     and not internal.is_super_admin() then
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

revoke all on function internal.assessment_release_title(text)
  from public, anon;
revoke all on function internal.release_assessment_to_organizations(text, uuid, uuid[])
  from public, anon;
revoke all on function public.release_assessment_to_organizations(text, uuid, uuid[])
  from public, anon;
revoke all on function internal.unrelease_assessment_from_organizations(text)
  from public, anon;
revoke all on function public.unrelease_assessment_from_organizations(text)
  from public, anon;
revoke all on function internal.seed_group_assessment_reviews(uuid)
  from public, anon;
revoke all on function public.seed_group_assessment_reviews(uuid)
  from public, anon;

grant execute on function internal.assessment_release_title(text)
  to authenticated, service_role;
grant execute on function internal.release_assessment_to_organizations(text, uuid, uuid[])
  to authenticated, service_role;
grant execute on function public.release_assessment_to_organizations(text, uuid, uuid[])
  to authenticated, service_role;
grant execute on function internal.unrelease_assessment_from_organizations(text)
  to authenticated, service_role;
grant execute on function public.unrelease_assessment_from_organizations(text)
  to authenticated, service_role;
grant execute on function internal.seed_group_assessment_reviews(uuid)
  to authenticated, service_role;
grant execute on function public.seed_group_assessment_reviews(uuid)
  to authenticated, service_role;

create or replace function internal.rollback_assessment_reviews()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop policy if exists organization_assessment_reviews_update
    on public.organization_assessment_reviews;
  drop policy if exists organization_assessment_reviews_select
    on public.organization_assessment_reviews;
  drop policy if exists platform_assessment_releases_select
    on public.platform_assessment_releases;
  drop function if exists public.seed_group_assessment_reviews(uuid);
  drop function if exists internal.seed_group_assessment_reviews(uuid);
  drop function if exists public.unrelease_assessment_from_organizations(text);
  drop function if exists internal.unrelease_assessment_from_organizations(text);
  drop function if exists public.release_assessment_to_organizations(text, uuid, uuid[]);
  drop function if exists internal.release_assessment_to_organizations(text, uuid, uuid[]);
  drop function if exists internal.assessment_release_title(text);
  drop table if exists public.organization_assessment_reviews;
  drop table if exists public.platform_assessment_releases;
  delete from public.manager_notifications where kind = 'assessment_release';
  alter table public.manager_notifications
    drop constraint if exists manager_notifications_kind_check;
  alter table public.manager_notifications
    add constraint manager_notifications_kind_check
    check (kind in ('training_release'));
  alter table public.manager_notifications
    drop column if exists assessment_key;
  alter table public.notification_preferences
    drop column if exists assessment_releases;
end;
$$;

revoke all on function internal.rollback_assessment_reviews()
  from public, anon, authenticated;
grant execute on function internal.rollback_assessment_reviews() to service_role;
