-- Explicit Super-admin release control.
-- Publishing no longer notifies managers. Release is the official trigger.
-- Role checks use public.profiles helpers, never user_metadata.

alter table public.trainings
  add column if not exists released_by uuid references public.profiles (id) on delete set null;

comment on column public.trainings.released_by is
  'Super-admin who last released this training to managers for review.';

drop function if exists public.release_training_to_organizations(uuid);
drop function if exists internal.release_training_to_organizations(uuid);

create or replace function internal.release_training_to_organizations(
  p_training_id uuid,
  p_released_by uuid
)
returns table (manager_id uuid, group_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_published boolean;
  v_group record;
  v_inserted integer;
  v_notify boolean;
begin
  select trainings.title, trainings.published
    into v_title, v_published
  from public.trainings
  where trainings.id = p_training_id;

  if v_title is null or v_published is not true then
    return;
  end if;

  update public.trainings
    set released_at = coalesce(released_at, now()),
        released_by = coalesce(p_released_by, released_by)
  where id = p_training_id;

  for v_group in
    select groups.id, groups.manager_id
    from public.groups
    where groups.manager_id is not null
  loop
    insert into public.organization_training_reviews (group_id, training_id, status)
    values (v_group.id, p_training_id, 'pending')
    on conflict (group_id, training_id) do nothing;

    get diagnostics v_inserted = row_count;
    is_new := v_inserted > 0;
    manager_id := v_group.manager_id;
    group_id := v_group.id;

    if v_inserted > 0 then
      select coalesce(prefs.training_releases, true)
        into v_notify
      from public.notification_preferences as prefs
      where prefs.user_id = v_group.manager_id;

      if coalesce(v_notify, true) then
        insert into public.manager_notifications (
          manager_id, group_id, training_id, kind, title, body, href
        ) values (
          v_group.manager_id,
          v_group.id,
          p_training_id,
          'training_release',
          'A new training is available for your review',
          v_title,
          '/manager/reviews/' || p_training_id::text
        );
      end if;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.release_training_to_organizations(
  p_training_id uuid,
  p_released_by uuid
)
returns table (manager_id uuid, group_id uuid, is_new boolean)
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
    from internal.release_training_to_organizations(p_training_id, p_released_by);
end;
$$;

create or replace function internal.unrelease_training_from_organizations(p_training_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trainings
    set released_at = null,
        released_by = null
  where id = p_training_id;

  delete from public.organization_training_reviews
  where training_id = p_training_id
    and status = 'pending';

  delete from public.manager_notifications
  where training_id = p_training_id
    and kind = 'training_release';
end;
$$;

create or replace function public.unrelease_training_from_organizations(p_training_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select internal.is_super_admin()) then
    raise exception 'Not authorized';
  end if;
  perform internal.unrelease_training_from_organizations(p_training_id);
end;
$$;

revoke all on function internal.release_training_to_organizations(uuid, uuid)
  from public, anon;
revoke all on function public.release_training_to_organizations(uuid, uuid)
  from public, anon;
revoke all on function internal.unrelease_training_from_organizations(uuid)
  from public, anon;
revoke all on function public.unrelease_training_from_organizations(uuid)
  from public, anon;

grant execute on function internal.release_training_to_organizations(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.release_training_to_organizations(uuid, uuid)
  to authenticated, service_role;
grant execute on function internal.unrelease_training_from_organizations(uuid)
  to authenticated, service_role;
grant execute on function public.unrelease_training_from_organizations(uuid)
  to authenticated, service_role;
