-- Training series parts: split long catalog trainings into ordered parts
-- of at most 6 sessions. Session row ids stay so session_progress is kept.
-- Down path: select internal.rollback_training_series_split();

create table if not exists internal.training_series_split_backup (
  kind text not null,
  entity_id uuid not null,
  payload jsonb not null,
  primary key (kind, entity_id)
);

alter table public.trainings
  add column if not exists series_id uuid,
  add column if not exists series_title text,
  add column if not exists part_number integer,
  add column if not exists part_total integer;

comment on column public.trainings.series_id is
  'Shared id for an ordered series of parts. Null means a standalone training.';
comment on column public.trainings.series_title is
  'Display name of the series without the part suffix.';
comment on column public.trainings.part_number is
  '1-based part index within the series. Null when standalone.';
comment on column public.trainings.part_total is
  'Number of parts in the series. Null when standalone.';

alter table public.trainings
  drop constraint if exists trainings_series_part_consistency;

alter table public.trainings
  add constraint trainings_series_part_consistency check (
    (
      series_id is null
      and series_title is null
      and part_number is null
      and part_total is null
    )
    or (
      series_id is not null
      and series_title is not null
      and char_length(btrim(series_title)) > 0
      and part_number is not null
      and part_total is not null
      and part_number >= 1
      and part_total >= 1
      and part_number <= part_total
    )
  );

create unique index if not exists trainings_series_part_uidx
  on public.trainings (series_id, part_number)
  where series_id is not null;

insert into internal.training_series_split_backup (kind, entity_id, payload)
select
  'original_training',
  trainings.id,
  jsonb_build_object(
    'id', trainings.id,
    'slug', trainings.slug,
    'title', trainings.title,
    'description', trainings.description,
    'session_count', trainings.session_count,
    'order_index', trainings.order_index,
    'published', trainings.published,
    'released_at', trainings.released_at,
    'first_published_at', trainings.first_published_at,
    'released_by', trainings.released_by,
    'first_released_at', trainings.first_released_at
  )
from public.trainings
where trainings.slug in ('fundamentals', 'anger', 'reentry')
on conflict (kind, entity_id) do nothing;

insert into internal.training_series_split_backup (kind, entity_id, payload)
select
  'original_session',
  sessions.id,
  jsonb_build_object(
    'id', sessions.id,
    'training_id', sessions.training_id,
    'session_number', sessions.session_number,
    'order_index', sessions.order_index
  )
from public.sessions
join public.trainings on trainings.id = sessions.training_id
where trainings.slug in ('fundamentals', 'anger', 'reentry')
on conflict (kind, entity_id) do nothing;

do $$
declare
  v_split record;
  v_part1 public.trainings%rowtype;
  v_part2_id uuid;
  v_series_id uuid;
  v_part1_keep integer;
  v_part2_count integer;
  v_part2_slug text;
  v_moved integer;
begin
  for v_split in
    select *
    from (
      values
        ('fundamentals', 'Fathering Fundamentals', 5, 10, 15, 'fundamentals-2'),
        ('anger', 'Steady Under Pressure', 6, 20, 25, 'anger-2'),
        ('reentry', 'Coming Home Present', 6, 30, 35, 'reentry-2')
    ) as split(slug, series_title, part1_keep, part1_order, part2_order, part2_slug)
  loop
    select * into v_part1
    from public.trainings
    where slug = v_split.slug
    for update;

    if v_part1.id is null then
      raise exception 'Missing catalog training %', v_split.slug;
    end if;

    if v_part1.series_id is not null then
      continue;
    end if;

    select count(*) into v_part2_count
    from public.sessions
    where training_id = v_part1.id
      and session_number > v_split.part1_keep;

    if v_part2_count < 1 then
      raise exception 'Training % has no sessions to move into part 2', v_split.slug;
    end if;

    v_series_id := gen_random_uuid();
    v_part2_id := gen_random_uuid();

    update public.trainings
    set
      series_id = v_series_id,
      series_title = v_split.series_title,
      part_number = 1,
      part_total = 2,
      title = v_split.series_title || ': Part 1',
      session_count = v_split.part1_keep,
      order_index = v_split.part1_order
    where id = v_part1.id;

    insert into public.trainings (
      id,
      slug,
      title,
      description,
      session_count,
      order_index,
      series_id,
      series_title,
      part_number,
      part_total,
      published,
      released_at,
      first_published_at,
      released_by,
      first_released_at
    )
    values (
      v_part2_id,
      v_split.part2_slug,
      v_split.series_title || ': Part 2',
      v_part1.description,
      v_part2_count,
      v_split.part2_order,
      v_series_id,
      v_split.series_title,
      2,
      2,
      v_part1.published,
      v_part1.released_at,
      v_part1.first_published_at,
      v_part1.released_by,
      v_part1.first_released_at
    );

    insert into internal.training_series_split_backup (kind, entity_id, payload)
    values (
      'new_training',
      v_part2_id,
      jsonb_build_object(
        'id', v_part2_id,
        'source_training_id', v_part1.id,
        'slug', v_split.part2_slug,
        'series_id', v_series_id
      )
    )
    on conflict (kind, entity_id) do nothing;

    update public.sessions
    set
      training_id = v_part2_id,
      session_number = session_number - v_split.part1_keep,
      order_index = session_number - v_split.part1_keep
    where training_id = v_part1.id
      and session_number > v_split.part1_keep;

    get diagnostics v_moved = row_count;
    if v_moved <> v_part2_count then
      raise exception 'Session move mismatch for %', v_split.slug;
    end if;

    insert into public.organization_training_reviews (
      group_id, training_id, status, decline_reason, decided_by, decided_at, created_at
    )
    select
      reviews.group_id,
      v_part2_id,
      reviews.status,
      reviews.decline_reason,
      reviews.decided_by,
      reviews.decided_at,
      reviews.created_at
    from public.organization_training_reviews as reviews
    where reviews.training_id = v_part1.id
    on conflict (group_id, training_id) do nothing;

    insert into public.training_assignments (
      father_id, training_id, assigned_by, assigned_at
    )
    select
      assignments.father_id,
      v_part2_id,
      assignments.assigned_by,
      assignments.assigned_at
    from public.training_assignments as assignments
    where assignments.training_id = v_part1.id
    on conflict (father_id, training_id) do nothing;

    insert into internal.training_series_split_backup (kind, entity_id, payload)
    select
      'new_assignment',
      assignments.id,
      jsonb_build_object(
        'id', assignments.id,
        'father_id', assignments.father_id,
        'training_id', assignments.training_id
      )
    from public.training_assignments as assignments
    where assignments.training_id = v_part2_id
    on conflict (kind, entity_id) do nothing;
  end loop;

  update public.trainings
  set order_index = 40
  where slug = 'flourishingfaith'
    and series_id is null;
end
$$;

do $$
declare
  v_over integer;
begin
  select count(*) into v_over
  from public.sessions
  group by training_id
  having count(*) > 6;

  if found then
    raise exception 'A training still has more than 6 sessions after the split';
  end if;
end
$$;

alter table public.trainings
  drop constraint if exists trainings_session_count_max;

alter table public.trainings
  add constraint trainings_session_count_max check (session_count <= 6);

create or replace function internal.enforce_training_session_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_training_id uuid;
  v_count integer;
  v_published boolean;
  v_released timestamptz;
begin
  if tg_table_name = 'sessions' then
    v_training_id := coalesce(new.training_id, old.training_id);
    select count(*) into v_count
    from public.sessions
    where training_id = v_training_id;
    if v_count > 6 then
      raise exception 'A training cannot have more than 6 sessions.';
    end if;
    update public.trainings
    set session_count = v_count
    where id = v_training_id;
    return coalesce(new, old);
  end if;

  if new.session_count > 6 then
    raise exception 'A training cannot have more than 6 sessions.';
  end if;

  select count(*) into v_count
  from public.sessions
  where training_id = new.id;

  if (new.published is true or new.released_at is not null) and v_count > 6 then
    raise exception 'A training cannot be published or released with more than 6 sessions.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_training_session_limit_sessions on public.sessions;
create trigger enforce_training_session_limit_sessions
  after insert or update or delete on public.sessions
  for each row
  execute function internal.enforce_training_session_limit();

drop trigger if exists enforce_training_session_limit_trainings on public.trainings;
create trigger enforce_training_session_limit_trainings
  before insert or update of published, released_at, session_count on public.trainings
  for each row
  execute function internal.enforce_training_session_limit();

revoke all on function internal.enforce_training_session_limit() from public, anon, authenticated;
grant execute on function internal.enforce_training_session_limit() to service_role;

create or replace function internal.rollback_training_series_split()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
  v_training record;
begin
  drop trigger if exists enforce_training_session_limit_sessions on public.sessions;
  drop trigger if exists enforce_training_session_limit_trainings on public.trainings;

  alter table public.trainings
    drop constraint if exists trainings_session_count_max;

  for v_session in
    select
      entity_id as session_id,
      (payload ->> 'training_id')::uuid as training_id,
      (payload ->> 'session_number')::integer as session_number,
      (payload ->> 'order_index')::integer as order_index
    from internal.training_series_split_backup
    where kind = 'original_session'
  loop
    update public.sessions
    set
      training_id = v_session.training_id,
      session_number = v_session.session_number,
      order_index = v_session.order_index
    where id = v_session.session_id;
  end loop;

  delete from public.training_assignments
  where id in (
    select entity_id
    from internal.training_series_split_backup
    where kind = 'new_assignment'
  );

  delete from public.organization_training_reviews
  where training_id in (
    select entity_id
    from internal.training_series_split_backup
    where kind = 'new_training'
  );

  delete from public.manager_notifications
  where training_id in (
    select entity_id
    from internal.training_series_split_backup
    where kind = 'new_training'
  );

  delete from public.certificates
  where training_id in (
    select entity_id
    from internal.training_series_split_backup
    where kind = 'new_training'
  );

  delete from public.trainings
  where id in (
    select entity_id
    from internal.training_series_split_backup
    where kind = 'new_training'
  );

  for v_training in
    select payload
    from internal.training_series_split_backup
    where kind = 'original_training'
  loop
    update public.trainings
    set
      slug = v_training.payload ->> 'slug',
      title = v_training.payload ->> 'title',
      description = v_training.payload ->> 'description',
      session_count = (v_training.payload ->> 'session_count')::integer,
      order_index = (v_training.payload ->> 'order_index')::integer,
      series_id = null,
      series_title = null,
      part_number = null,
      part_total = null
    where id = (v_training.payload ->> 'id')::uuid;
  end loop;

  alter table public.trainings
    drop constraint if exists trainings_series_part_consistency;
  drop index if exists public.trainings_series_part_uidx;

  alter table public.trainings
    drop column if exists series_id,
    drop column if exists series_title,
    drop column if exists part_number,
    drop column if exists part_total;

  drop table if exists internal.training_series_split_backup;
end;
$$;

revoke all on function internal.rollback_training_series_split() from public, anon, authenticated;
grant execute on function internal.rollback_training_series_split() to service_role;
