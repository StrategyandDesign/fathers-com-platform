-- Once a training has been released, un-release must not restore legacy catalog access.
-- Re-release reopens declined reviews so managers are asked again.

alter table public.trainings
  add column if not exists first_released_at timestamptz;

comment on column public.trainings.first_released_at is
  'First time this training was released for review. Never cleared. Null = never entered the review flow (legacy catalog).';

update public.trainings
set first_released_at = released_at
where released_at is not null
  and first_released_at is null;

update public.trainings as trainings
set first_released_at = reviews.first_seen
from (
  select training_id, min(created_at) as first_seen
  from public.organization_training_reviews
  group by training_id
) as reviews
where reviews.training_id = trainings.id
  and trainings.first_released_at is null;

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
        first_released_at = coalesce(first_released_at, now()),
        released_by = coalesce(p_released_by, released_by)
  where id = p_training_id;

  for v_group in
    select groups.id, groups.manager_id
    from public.groups
    where groups.manager_id is not null
  loop
    insert into public.organization_training_reviews (group_id, training_id, status)
    values (v_group.id, p_training_id, 'pending')
    on conflict (group_id, training_id) do update
    set
      status = 'pending',
      decline_reason = null,
      decided_by = null,
      decided_at = null
    where public.organization_training_reviews.status = 'declined';

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
