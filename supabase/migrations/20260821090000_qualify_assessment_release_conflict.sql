-- Release failed with "column reference assessment_key is ambiguous".
-- RETURNS TABLE exposes assessment_key and group_id as PL/pgSQL variables,
-- so ON CONFLICT (assessment_key) and ON CONFLICT (group_id, assessment_key)
-- cannot see the table columns. Point at the named unique constraints instead.

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
  on conflict on constraint platform_assessment_releases_pkey do update
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
    on conflict on constraint organization_assessment_reviews_group_id_assessment_key_key
    do update
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
  where public.platform_assessment_releases.assessment_key = p_assessment_key;

  delete from public.organization_assessment_reviews
  where public.organization_assessment_reviews.assessment_key = p_assessment_key
    and public.organization_assessment_reviews.status = 'pending';

  delete from public.manager_notifications
  where public.manager_notifications.assessment_key = p_assessment_key
    and public.manager_notifications.kind = 'assessment_release';
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
    on conflict on constraint organization_assessment_reviews_group_id_assessment_key_key
    do nothing;

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

revoke all on function internal.release_assessment_to_organizations(text, uuid, uuid[])
  from public, anon;
revoke all on function internal.unrelease_assessment_from_organizations(text)
  from public, anon;
revoke all on function internal.seed_group_assessment_reviews(uuid)
  from public, anon;

grant execute on function internal.release_assessment_to_organizations(text, uuid, uuid[])
  to authenticated, service_role;
grant execute on function internal.unrelease_assessment_from_organizations(text)
  to authenticated, service_role;
grant execute on function internal.seed_group_assessment_reviews(uuid)
  to authenticated, service_role;
