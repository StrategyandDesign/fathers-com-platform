-- Session film runtime and silent resume position.
-- duration_seconds may be over 360 so existing long films can be flagged.
-- Publish and first release are what enforce the 6:00 ceiling.
-- Down path: select internal.rollback_session_film_runtime();

alter table public.sessions
  add column if not exists duration_seconds integer;

alter table public.sessions
  drop constraint if exists sessions_duration_seconds_non_negative;

alter table public.sessions
  add constraint sessions_duration_seconds_non_negative
  check (duration_seconds is null or duration_seconds >= 0);

comment on column public.sessions.duration_seconds is
  'Film length in whole seconds. Null means unknown and must be filled before publish.';

alter table public.session_progress
  add column if not exists film_seconds integer not null default 0;

alter table public.session_progress
  drop constraint if exists session_progress_film_seconds_non_negative;

alter table public.session_progress
  add constraint session_progress_film_seconds_non_negative
  check (film_seconds >= 0);

comment on column public.session_progress.film_seconds is
  'Resume position in whole seconds for this father and session.';

create or replace function internal.film_clock(p_seconds integer)
returns text
language sql
immutable
as $$
  select case
    when p_seconds is null then ''
    else (p_seconds / 60)::text || ':' || lpad((p_seconds % 60)::text, 2, '0')
  end;
$$;

create or replace function internal.film_overage_message(p_seconds integer)
returns text
language sql
immutable
as $$
  select format(
    'Film runs %s. The ceiling is 6:00. Re-cut before publishing.',
    internal.film_clock(p_seconds)
  );
$$;

create or replace function internal.session_film_publish_error(p_training_id uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_over integer;
  v_missing boolean;
begin
  select duration_seconds
    into v_over
  from public.sessions
  where training_id = p_training_id
    and duration_seconds is not null
    and duration_seconds > 360
  order by duration_seconds desc
  limit 1;

  if v_over is not null then
    return internal.film_overage_message(v_over);
  end if;

  select exists (
    select 1
    from public.sessions
    where training_id = p_training_id
      and duration_seconds is null
  ) into v_missing;

  if v_missing then
    return 'Runtime missing';
  end if;

  return null;
end;
$$;

create or replace function internal.enforce_session_film_runtime()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_published boolean;
  v_released timestamptz;
  v_error text;
begin
  if tg_table_name = 'sessions' then
    select published, released_at
      into v_published, v_released
    from public.trainings
    where id = new.training_id;

    if coalesce(v_published, false) is not true and v_released is null then
      return new;
    end if;

    if new.duration_seconds is null then
      raise exception 'Runtime missing';
    end if;

    if new.duration_seconds > 360 then
      if tg_op = 'INSERT' then
        raise exception '%', internal.film_overage_message(new.duration_seconds);
      end if;
      if old.duration_seconds is not null and old.duration_seconds <= 360 then
        raise exception '%', internal.film_overage_message(new.duration_seconds);
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.published is true or new.released_at is not null then
      v_error := internal.session_film_publish_error(new.id);
      if v_error is not null then
        raise exception '%', v_error;
      end if;
    end if;
    return new;
  end if;

  if (new.published is true and old.published is distinct from true)
     or (new.released_at is not null and old.released_at is null) then
    v_error := internal.session_film_publish_error(new.id);
    if v_error is not null then
      raise exception '%', v_error;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_session_film_runtime_sessions on public.sessions;
create trigger enforce_session_film_runtime_sessions
  before insert or update of duration_seconds, video_url, training_id on public.sessions
  for each row
  execute function internal.enforce_session_film_runtime();

drop trigger if exists enforce_session_film_runtime_trainings on public.trainings;
create trigger enforce_session_film_runtime_trainings
  before insert or update of published, released_at on public.trainings
  for each row
  execute function internal.enforce_session_film_runtime();

revoke all on function internal.film_clock(integer) from public, anon, authenticated;
revoke all on function internal.film_overage_message(integer) from public, anon, authenticated;
revoke all on function internal.session_film_publish_error(uuid) from public, anon, authenticated;
revoke all on function internal.enforce_session_film_runtime() from public, anon, authenticated;

grant execute on function internal.film_clock(integer) to service_role;
grant execute on function internal.film_overage_message(integer) to service_role;
grant execute on function internal.session_film_publish_error(uuid) to service_role;
grant execute on function internal.enforce_session_film_runtime() to service_role;

create or replace function internal.rollback_session_film_runtime()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop trigger if exists enforce_session_film_runtime_sessions on public.sessions;
  drop trigger if exists enforce_session_film_runtime_trainings on public.trainings;
  drop function if exists internal.enforce_session_film_runtime();
  drop function if exists internal.session_film_publish_error(uuid);
  drop function if exists internal.film_overage_message(integer);
  drop function if exists internal.film_clock(integer);

  alter table public.sessions
    drop constraint if exists sessions_duration_seconds_non_negative;
  alter table public.sessions
    drop column if exists duration_seconds;

  alter table public.session_progress
    drop constraint if exists session_progress_film_seconds_non_negative;
  alter table public.session_progress
    drop column if exists film_seconds;
end;
$$;

revoke all on function internal.rollback_session_film_runtime() from public, anon, authenticated;
grant execute on function internal.rollback_session_film_runtime() to service_role;
