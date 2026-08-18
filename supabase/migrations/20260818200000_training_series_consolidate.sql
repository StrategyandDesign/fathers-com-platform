-- One complete training is a list of sessions. No parts.
-- Session row ids stay so session_progress is kept.
-- Existing certificates stay; a later-part certificate is remapped
-- to the parent training when that father does not already have one.
-- The 6-session cap is removed so the original catalog can exist again.
-- Down path: this migration does not re-split. Restore from backup if needed.

drop trigger if exists enforce_training_session_limit_sessions
  on public.sessions;
drop trigger if exists enforce_training_session_limit_trainings
  on public.trainings;
drop function if exists internal.enforce_training_session_limit();

alter table public.trainings
  drop constraint if exists trainings_session_count_max;

drop trigger if exists enforce_session_film_runtime_sessions
  on public.sessions;

do $$
declare
  v_later record;
  v_parent public.trainings%rowtype;
  v_offset integer;
  v_moved integer;
  v_has_backup boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'internal'
      and table_name = 'training_series_split_backup'
  ) into v_has_backup;

  if v_has_backup then
    update public.sessions as sessions
    set
      training_id = (backup.payload ->> 'training_id')::uuid,
      session_number = (backup.payload ->> 'session_number')::integer,
      order_index = (backup.payload ->> 'order_index')::integer
    from internal.training_series_split_backup as backup
    where backup.kind = 'original_session'
      and sessions.id = backup.entity_id;
  end if;

  for v_later in
    select *
    from public.trainings
    where series_id is not null
      and part_number is not null
      and part_number > 1
    order by series_id, part_number
  loop
    select * into v_parent
    from public.trainings
    where series_id = v_later.series_id
      and part_number = 1
    for update;

    if v_parent.id is null then
      raise exception 'Missing part 1 for series %', v_later.series_id;
    end if;

    select coalesce(max(session_number), 0) into v_offset
    from public.sessions
    where training_id = v_parent.id;

    update public.sessions
    set
      training_id = v_parent.id,
      session_number = session_number + v_offset,
      order_index = session_number + v_offset
    where training_id = v_later.id;

    get diagnostics v_moved = row_count;

    update public.training_assignments as later
    set training_id = v_parent.id
    where later.training_id = v_later.id
      and not exists (
        select 1
        from public.training_assignments as parent
        where parent.father_id = later.father_id
          and parent.training_id = v_parent.id
      );

    delete from public.training_assignments
    where training_id = v_later.id;

    update public.organization_training_reviews as later
    set training_id = v_parent.id
    where later.training_id = v_later.id
      and not exists (
        select 1
        from public.organization_training_reviews as parent
        where parent.group_id = later.group_id
          and parent.training_id = v_parent.id
      );

    delete from public.organization_training_reviews
    where training_id = v_later.id;

    update public.certificates as later
    set training_id = v_parent.id
    where later.training_id = v_later.id
      and not exists (
        select 1
        from public.certificates as parent
        where parent.father_id = later.father_id
          and parent.training_id = v_parent.id
      );

    delete from public.certificates
    where training_id = v_later.id;

    update public.manager_notifications
    set training_id = v_parent.id
    where training_id = v_later.id;

    delete from public.trainings
    where id = v_later.id;
  end loop;

  if v_has_backup then
    update public.trainings as trainings
    set
      slug = backup.payload ->> 'slug',
      title = backup.payload ->> 'title',
      description = backup.payload ->> 'description',
      session_count = (backup.payload ->> 'session_count')::integer,
      order_index = (backup.payload ->> 'order_index')::integer,
      series_id = null,
      series_title = null,
      part_number = null,
      part_total = null
    from internal.training_series_split_backup as backup
    where backup.kind = 'original_training'
      and trainings.id = (backup.payload ->> 'id')::uuid;
  end if;

  update public.trainings
  set
    title = coalesce(nullif(btrim(series_title), ''), title),
    series_id = null,
    series_title = null,
    part_number = null,
    part_total = null
  where series_id is not null
     or series_title is not null
     or part_number is not null
     or part_total is not null;

  update public.trainings as trainings
  set session_count = (
    select count(*)
    from public.sessions
    where sessions.training_id = trainings.id
  );
end
$$;

alter table public.trainings
  drop constraint if exists trainings_series_part_consistency;
drop index if exists public.trainings_series_part_uidx;

drop trigger if exists enforce_session_film_runtime_sessions
  on public.sessions;
create trigger enforce_session_film_runtime_sessions
  before insert or update of duration_seconds, video_url, training_id
  on public.sessions
  for each row
  execute function internal.enforce_session_film_runtime();

drop function if exists internal.rollback_training_series_split();
