-- Reviewer insights: aggregates only. No names, ids, or row-level records.
-- Security definer stays in internal. Public wrapper is reviewer-only.

create or replace function internal.reviewer_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total_participants integer := 0;
  profiles_completed integer := 0;
  profiles_completed_pct numeric := 0;
  average_sessions numeric := 0;
  trainings_completed integer := 0;
  active_groups integer := 0;
  training_distribution jsonb := '[]'::jsonb;
  primary_edges jsonb := '[]'::jsonb;
  completion_trend jsonb := '[]'::jsonb;
begin
  select count(distinct group_members.father_id)
    into total_participants
  from public.group_members;

  select count(*)
    into active_groups
  from public.groups;

  select count(distinct father_profiles.father_id)
    into profiles_completed
  from public.father_profiles
  where father_profiles.father_id in (
    select group_members.father_id from public.group_members
  );

  if total_participants > 0 then
    profiles_completed_pct := round(
      (profiles_completed::numeric / total_participants::numeric) * 100
    );
  end if;

  select coalesce(avg(completed.n), 0)
    into average_sessions
  from (
    select members.father_id,
      count(progress.id) filter (
        where progress.film_completed
          and progress.checkin_completed
          and progress.action_completed
      ) as n
    from (
      select distinct group_members.father_id
      from public.group_members
    ) as members
    left join public.session_progress as progress
      on progress.father_id = members.father_id
    group by members.father_id
  ) as completed;

  select coalesce(count(*), 0)
    into trainings_completed
  from (
    select members.father_id, trainings.id
    from (
      select distinct group_members.father_id
      from public.group_members
    ) as members
    cross join public.trainings
    join public.sessions
      on sessions.training_id = trainings.id
    left join public.session_progress as progress
      on progress.session_id = sessions.id
      and progress.father_id = members.father_id
    group by members.father_id, trainings.id
    having count(sessions.id) > 0
      and count(sessions.id) filter (
        where progress.film_completed
          and progress.checkin_completed
          and progress.action_completed
      ) = count(sessions.id)
  ) as finished;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', distribution.title,
        'not_started', distribution.not_started,
        'in_progress', distribution.in_progress,
        'completed', distribution.completed
      )
      order by distribution.order_index
    ),
    '[]'::jsonb
  )
    into training_distribution
  from (
    select
      trainings.title,
      trainings.order_index,
      count(*) filter (where completed_sessions = 0) as not_started,
      count(*) filter (
        where completed_sessions > 0
          and completed_sessions < session_total
      ) as in_progress,
      count(*) filter (
        where session_total > 0
          and completed_sessions >= session_total
      ) as completed
    from (
      select
        members.father_id,
        trainings.id as training_id,
        trainings.title,
        trainings.order_index,
        count(sessions.id) as session_total,
        count(progress.id) filter (
          where progress.film_completed
            and progress.checkin_completed
            and progress.action_completed
        ) as completed_sessions
      from (
        select distinct group_members.father_id
        from public.group_members
      ) as members
      cross join public.trainings
      left join public.sessions
        on sessions.training_id = trainings.id
      left join public.session_progress as progress
        on progress.session_id = sessions.id
        and progress.father_id = members.father_id
      group by
        members.father_id,
        trainings.id,
        trainings.title,
        trainings.order_index
    ) as per_father
    right join public.trainings
      on trainings.id = per_father.training_id
    group by trainings.title, trainings.order_index
  ) as distribution;

  -- If there are no participants, still list each training at zero.
  if total_participants = 0 then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'title', trainings.title,
          'not_started', 0,
          'in_progress', 0,
          'completed', 0
        )
        order by trainings.order_index
      ),
      '[]'::jsonb
    )
      into training_distribution
    from public.trainings;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('label', edges.label, 'count', edges.count)
      order by edges.count desc, edges.label
    ),
    '[]'::jsonb
  )
    into primary_edges
  from (
    select latest.primary_edge as label, count(*)::integer as count
    from (
      select distinct on (father_profiles.father_id)
        father_profiles.primary_edge
      from public.father_profiles
      where father_profiles.father_id in (
        select group_members.father_id from public.group_members
      )
      order by father_profiles.father_id, father_profiles.taken_at desc
    ) as latest
    where latest.primary_edge is not null
      and latest.primary_edge <> ''
    group by latest.primary_edge
  ) as edges;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('week', weeks.week, 'count', weeks.count)
      order by weeks.week
    ),
    '[]'::jsonb
  )
    into completion_trend
  from (
    select
      to_char(weeks.week_start, 'YYYY-MM-DD') as week,
      coalesce(counts.n, 0)::integer as count
    from (
      select date_trunc('week', series.week_ts)::date as week_start
      from generate_series(
        date_trunc('week', (current_date - interval '5 weeks')),
        date_trunc('week', current_date::timestamp),
        interval '1 week'
      ) as series(week_ts)
    ) as weeks
    left join (
      select
        date_trunc('week', father_profiles.taken_at)::date as week_start,
        count(distinct father_profiles.father_id)::integer as n
      from public.father_profiles
      where father_profiles.taken_at >= date_trunc('week', (current_date - interval '5 weeks'))
        and father_profiles.father_id in (
          select group_members.father_id from public.group_members
        )
      group by 1
    ) as counts using (week_start)
  ) as weeks;

  return jsonb_build_object(
    'total_participants', total_participants,
    'profiles_completed', profiles_completed,
    'profiles_completed_pct', profiles_completed_pct,
    'average_sessions_completed', round(average_sessions, 1),
    'trainings_completed', trainings_completed,
    'active_groups', active_groups,
    'training_distribution', training_distribution,
    'primary_edges', primary_edges,
    'completion_trend', completion_trend
  );
end;
$$;

create or replace function public.reviewer_insights()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select internal.current_user_role()) is distinct from 'reviewer'::public.user_role then
    raise exception 'Not authorized';
  end if;

  return internal.reviewer_insights();
end;
$$;

revoke all on function internal.reviewer_insights() from public, anon, authenticated;
grant execute on function internal.reviewer_insights() to service_role;

revoke all on function public.reviewer_insights() from public, anon;
grant execute on function public.reviewer_insights() to authenticated, service_role;
