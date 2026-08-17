-- Anonymized reviewer rows + filtered aggregates.
-- Reviewers have no SELECT on participant tables, so a security_invoker
-- view over those tables would be empty. Same pattern as reviewer_insights:
-- security definer stays in internal; public wrappers are invoker + reviewer-only.
-- Rows never include names, emails, avatars, serials, UUIDs, or free text.

create or replace function internal.reviewer_insight_filter_args(p_filters jsonb)
returns table (
  group_id uuid,
  training_id uuid,
  status text,
  from_date date,
  to_date date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  raw jsonb := coalesce(p_filters, '{}'::jsonb);
  group_raw text := nullif(trim(coalesce(raw->>'group_id', '')), '');
  training_raw text := nullif(trim(coalesce(raw->>'training_id', '')), '');
  status_raw text := nullif(trim(coalesce(raw->>'status', '')), '');
  from_raw text := nullif(trim(coalesce(raw->>'from', '')), '');
  to_raw text := nullif(trim(coalesce(raw->>'to', '')), '');
begin
  return query select
    case
      when group_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then group_raw::uuid
    end,
    case
      when training_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then training_raw::uuid
    end,
    case
      when status_raw in ('not_started', 'in_progress', 'completed') then status_raw
    end,
    case
      when from_raw ~ '^\d{4}-\d{2}-\d{2}$' then from_raw::date
    end,
    case
      when to_raw ~ '^\d{4}-\d{2}-\d{2}$' then to_raw::date
    end;
end;
$$;

create or replace function internal.reviewer_insight_group_labels()
returns table (
  id uuid,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    numbered.id,
    case
      when numbered.n <= 26 then 'Group ' || chr(64 + numbered.n::integer)
      else 'Group ' || numbered.n::text
    end as label
  from (
    select groups.id, row_number() over (order by groups.created_at, groups.id) as n
    from public.groups
  ) as numbered;
$$;

create or replace function internal.reviewer_insight_cohort(
  p_group_id uuid,
  p_training_id uuid,
  p_status text,
  p_from date,
  p_to date
)
returns table (
  father_id uuid,
  group_id uuid,
  group_label text,
  participant_label text,
  profile_status text,
  completion_status text,
  trainings_completed integer,
  trainings_in_progress integer,
  trainings_not_started integer,
  sessions_completed integer,
  sessions_total integer,
  activity_week date
)
language sql
stable
security definer
set search_path = ''
as $$
  with participant_labels as (
    select
      first_join.father_id,
      'P-' || lpad(
        (row_number() over (order by first_join.joined_at, first_join.father_id))::text,
        3,
        '0'
      ) as label
    from (
      select group_members.father_id, min(group_members.joined_at) as joined_at
      from public.group_members
      group by group_members.father_id
    ) as first_join
  ),
  memberships as (
    select
      group_members.father_id,
      group_members.group_id,
      group_members.joined_at,
      group_labels.label as group_label
    from public.group_members
    join internal.reviewer_insight_group_labels() as group_labels
      on group_labels.id = group_members.group_id
    where p_group_id is null
      or group_members.group_id = p_group_id
  ),
  members as (
    select distinct on (memberships.father_id)
      memberships.father_id,
      memberships.group_id,
      memberships.group_label,
      participant_labels.label as participant_label
    from memberships
    join participant_labels
      on participant_labels.father_id = memberships.father_id
    order by memberships.father_id, memberships.joined_at, memberships.group_id
  ),
  profile_state as (
    select
      members.father_id,
      case
        when exists (
          select 1
          from public.father_profiles
          where father_profiles.father_id = members.father_id
        ) then 'completed'
        when exists (
          select 1
          from public.father_profile_drafts
          where father_profile_drafts.father_id = members.father_id
        ) then 'in_progress'
        else 'not_started'
      end as profile_status
    from members
  ),
  activity as (
    select
      events.father_id,
      max(events.at) as last_activity
    from (
      select group_members.father_id, group_members.joined_at as at
      from public.group_members
      union all
      select father_profiles.father_id, father_profiles.taken_at
      from public.father_profiles
      union all
      select session_progress.father_id, session_progress.completed_at
      from public.session_progress
      where session_progress.completed_at is not null
      union all
      select training_assignments.father_id, training_assignments.assigned_at
      from public.training_assignments
      union all
      select certificates.father_id, certificates.issued_at
      from public.certificates
      union all
      select father_profile_drafts.father_id, father_profile_drafts.updated_at
      from public.father_profile_drafts
    ) as events
    group by events.father_id
  ),
  per_training as (
    select
      members.father_id,
      trainings.id as training_id,
      count(sessions.id)::integer as session_total,
      count(progress.id) filter (
        where progress.film_completed
          and progress.checkin_completed
          and progress.action_completed
      )::integer as completed_sessions
    from members
    cross join public.trainings
    left join public.sessions
      on sessions.training_id = trainings.id
    left join public.session_progress as progress
      on progress.session_id = sessions.id
      and progress.father_id = members.father_id
    group by members.father_id, trainings.id
  ),
  training_rollups as (
    select
      per_training.father_id,
      count(*) filter (
        where per_training.session_total > 0
          and per_training.completed_sessions >= per_training.session_total
      )::integer as trainings_completed,
      count(*) filter (
        where per_training.completed_sessions > 0
          and per_training.completed_sessions < per_training.session_total
      )::integer as trainings_in_progress,
      count(*) filter (
        where per_training.completed_sessions = 0
      )::integer as trainings_not_started,
      coalesce(sum(per_training.completed_sessions), 0)::integer as sessions_completed,
      coalesce(sum(per_training.session_total), 0)::integer as sessions_total,
      case
        when count(*) filter (where per_training.session_total > 0) > 0
          and count(*) filter (
            where per_training.session_total > 0
              and per_training.completed_sessions < per_training.session_total
          ) = 0
        then 'completed'
        when coalesce(sum(per_training.completed_sessions), 0) > 0
        then 'in_progress'
        else 'not_started'
      end as overall_status
    from per_training
    group by per_training.father_id
  ),
  scoped as (
    select
      per_training.father_id,
      per_training.completed_sessions,
      per_training.session_total,
      case
        when per_training.session_total > 0
          and per_training.completed_sessions >= per_training.session_total
        then 'completed'
        when per_training.completed_sessions > 0
        then 'in_progress'
        else 'not_started'
      end as training_status
    from per_training
    where p_training_id is not null
      and per_training.training_id = p_training_id
  ),
  assembled as (
    select
      members.father_id,
      members.group_id,
      members.group_label,
      members.participant_label,
      profile_state.profile_status,
      case
        when p_training_id is null then coalesce(training_rollups.overall_status, 'not_started')
        else coalesce(scoped.training_status, 'not_started')
      end as completion_status,
      coalesce(training_rollups.trainings_completed, 0) as trainings_completed,
      coalesce(training_rollups.trainings_in_progress, 0) as trainings_in_progress,
      coalesce(training_rollups.trainings_not_started, 0) as trainings_not_started,
      case
        when p_training_id is null then coalesce(training_rollups.sessions_completed, 0)
        else coalesce(scoped.completed_sessions, 0)
      end as sessions_completed,
      case
        when p_training_id is null then coalesce(training_rollups.sessions_total, 0)
        else coalesce(scoped.session_total, 0)
      end as sessions_total,
      date_trunc('week', activity.last_activity)::date as activity_week,
      activity.last_activity
    from members
    left join profile_state on profile_state.father_id = members.father_id
    left join training_rollups on training_rollups.father_id = members.father_id
    left join scoped on scoped.father_id = members.father_id
    left join activity on activity.father_id = members.father_id
  )
  select
    assembled.father_id,
    assembled.group_id,
    assembled.group_label,
    assembled.participant_label,
    assembled.profile_status,
    assembled.completion_status,
    assembled.trainings_completed,
    assembled.trainings_in_progress,
    assembled.trainings_not_started,
    assembled.sessions_completed,
    assembled.sessions_total,
    assembled.activity_week
  from assembled
  where (
      p_status is null
      or assembled.completion_status = p_status
    )
    and (
      (p_from is null and p_to is null)
      or (
        assembled.last_activity is not null
        and (p_from is null or (assembled.last_activity at time zone 'utc')::date >= p_from)
        and (p_to is null or (assembled.last_activity at time zone 'utc')::date <= p_to)
      )
    )
  order by assembled.participant_label;
$$;

drop function if exists public.reviewer_insights();
drop function if exists internal.reviewer_insights();

create or replace function internal.reviewer_insights(p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_training_id uuid;
  v_status text;
  v_from date;
  v_to date;
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
  if (select internal.current_user_role()) is distinct from 'reviewer'::public.user_role then
    raise exception 'Not authorized';
  end if;

  select
    filter_args.group_id,
    filter_args.training_id,
    filter_args.status,
    filter_args.from_date,
    filter_args.to_date
    into v_group_id, v_training_id, v_status, v_from, v_to
  from internal.reviewer_insight_filter_args(p_filters) as filter_args;

  select count(*)
    into total_participants
  from internal.reviewer_insight_cohort(
    v_group_id, v_training_id, v_status, v_from, v_to
  );

  select count(*)
    into profiles_completed
  from internal.reviewer_insight_cohort(
    v_group_id, v_training_id, v_status, v_from, v_to
  ) as cohort
  where cohort.profile_status = 'completed';

  if total_participants > 0 then
    profiles_completed_pct := round(
      (profiles_completed::numeric / total_participants::numeric) * 100
    );
  end if;

  select coalesce(avg(cohort.sessions_completed), 0)
    into average_sessions
  from internal.reviewer_insight_cohort(
    v_group_id, v_training_id, v_status, v_from, v_to
  ) as cohort;

  select coalesce(sum(cohort.trainings_completed), 0)
    into trainings_completed
  from internal.reviewer_insight_cohort(
    v_group_id, v_training_id, v_status, v_from, v_to
  ) as cohort;

  if v_group_id is null
    and v_training_id is null
    and v_status is null
    and v_from is null
    and v_to is null
  then
    select count(*)
      into active_groups
    from public.groups;
  else
    select count(distinct cohort.group_id)
      into active_groups
    from internal.reviewer_insight_cohort(
      v_group_id, v_training_id, v_status, v_from, v_to
    ) as cohort;
  end if;

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
      from internal.reviewer_insight_cohort(
        v_group_id, v_training_id, v_status, v_from, v_to
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
        select cohort.father_id
        from internal.reviewer_insight_cohort(
          v_group_id, v_training_id, v_status, v_from, v_to
        ) as cohort
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
          select cohort.father_id
          from internal.reviewer_insight_cohort(
            v_group_id, v_training_id, v_status, v_from, v_to
          ) as cohort
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

create or replace function public.reviewer_insights(p_filters jsonb default '{}'::jsonb)
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

  return internal.reviewer_insights(p_filters);
end;
$$;

create or replace function internal.reviewer_insight_rows(p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_training_id uuid;
  v_status text;
  v_from date;
  v_to date;
begin
  if (select internal.current_user_role()) is distinct from 'reviewer'::public.user_role then
    raise exception 'Not authorized';
  end if;

  select
    filter_args.group_id,
    filter_args.training_id,
    filter_args.status,
    filter_args.from_date,
    filter_args.to_date
    into v_group_id, v_training_id, v_status, v_from, v_to
  from internal.reviewer_insight_filter_args(p_filters) as filter_args;

  return jsonb_build_object(
    'rows',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'participant_label', cohort.participant_label,
            'group_label', cohort.group_label,
            'profile_status', cohort.profile_status,
            'completion_status', cohort.completion_status,
            'trainings_completed', cohort.trainings_completed,
            'trainings_in_progress', cohort.trainings_in_progress,
            'trainings_not_started', cohort.trainings_not_started,
            'sessions_completed', cohort.sessions_completed,
            'sessions_total', cohort.sessions_total,
            'activity_week',
              case
                when cohort.activity_week is null then null
                else to_char(cohort.activity_week, 'YYYY-MM-DD')
              end
          )
          order by cohort.participant_label
        )
        from internal.reviewer_insight_cohort(
          v_group_id, v_training_id, v_status, v_from, v_to
        ) as cohort
      ),
      '[]'::jsonb
    ),
    'groups',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', group_labels.id, 'label', group_labels.label)
          order by group_labels.label
        )
        from internal.reviewer_insight_group_labels() as group_labels
      ),
      '[]'::jsonb
    ),
    'trainings',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', trainings.id, 'title', trainings.title)
          order by trainings.order_index, trainings.title
        )
        from public.trainings
      ),
      '[]'::jsonb
    ),
    'participant_count',
    (
      select count(distinct group_members.father_id)
      from public.group_members
    )
  );
end;
$$;

create or replace function public.reviewer_insight_rows(p_filters jsonb default '{}'::jsonb)
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

  return internal.reviewer_insight_rows(p_filters);
end;
$$;

revoke all on function internal.reviewer_insight_filter_args(jsonb) from public, anon, authenticated;
revoke all on function internal.reviewer_insight_group_labels() from public, anon, authenticated;
revoke all on function internal.reviewer_insight_cohort(uuid, uuid, text, date, date) from public, anon, authenticated;
revoke all on function internal.reviewer_insights(jsonb) from public, anon;
revoke all on function public.reviewer_insights(jsonb) from public, anon;
revoke all on function internal.reviewer_insight_rows(jsonb) from public, anon;
revoke all on function public.reviewer_insight_rows(jsonb) from public, anon;

grant execute on function internal.reviewer_insight_filter_args(jsonb) to service_role;
grant execute on function internal.reviewer_insight_group_labels() to service_role;
grant execute on function internal.reviewer_insight_cohort(uuid, uuid, text, date, date) to service_role;
grant execute on function internal.reviewer_insights(jsonb) to authenticated, service_role;
grant execute on function public.reviewer_insights(jsonb) to authenticated, service_role;
grant execute on function internal.reviewer_insight_rows(jsonb) to authenticated, service_role;
grant execute on function public.reviewer_insight_rows(jsonb) to authenticated, service_role;

comment on function public.reviewer_insights(jsonb) is
  'Reviewer-only cohort aggregates. Filters are optional. No identifiable fields.';

comment on function public.reviewer_insight_rows(jsonb) is
  'Reviewer-only anonymized progress rows (P-001, Group A). No names, emails, or serials.';
