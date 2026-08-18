-- Opt-in anonymous participation for super-admin Gathering.
-- Off by default. Counts only: no names, emails, notes, answers, or serials.
-- Security definer stays in internal. Public wrapper is super-admin only.

alter table public.profiles
  add column if not exists share_anonymous_admin boolean not null default false;

alter table public.profiles
  add column if not exists share_anonymous_admin_at timestamptz;

comment on column public.profiles.share_anonymous_admin is
  'When true, this account releases anonymous participation counts to super-admin Gathering. Off by default. No names, emails, notes, or answers.';

comment on column public.profiles.share_anonymous_admin_at is
  'When the current opt-in was turned on. Cleared when sharing is turned off.';

create index if not exists profiles_share_anonymous_admin_idx
  on public.profiles (role)
  where share_anonymous_admin and deactivated_at is null;

create or replace function internal.admin_anonymous_gathering()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  min_n constant integer := 3;
  father_opted integer := 0;
  father_eligible integer := 0;
  manager_opted integer := 0;
  manager_eligible integer := 0;
  reviewer_opted integer := 0;
  reviewer_eligible integer := 0;
  fathers jsonb;
  managers jsonb;
  reviewers jsonb;
  started integer := 0;
  completed_one integer := 0;
  trainings_done integer := 0;
  sessions_done integer := 0;
  certificates_held integer := 0;
  assessments_done integer := 0;
  profiles_done integer := 0;
  training_distribution jsonb := '[]'::jsonb;
  completion_trend jsonb := '[]'::jsonb;
  assignments_made integer := 0;
  certificates_issued integer := 0;
  reviews_accepted integer := 0;
  reviews_declined integer := 0;
  reviews_pending integer := 0;
  reviewer_scoped integer := 0;
  reviewer_unscoped integer := 0;
begin
  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  select
    count(*) filter (where share_anonymous_admin)::integer,
    count(*)::integer
  into father_opted, father_eligible
  from public.profiles
  where role = 'father'::public.user_role
    and deactivated_at is null;

  select
    count(*) filter (where share_anonymous_admin)::integer,
    count(*)::integer
  into manager_opted, manager_eligible
  from public.profiles
  where role = 'manager'::public.user_role
    and deactivated_at is null;

  select
    count(*) filter (where share_anonymous_admin)::integer,
    count(*)::integer
  into reviewer_opted, reviewer_eligible
  from public.profiles
  where role = 'reviewer'::public.user_role
    and deactivated_at is null;

  if father_opted >= min_n then
    select
      count(*) filter (
        where exists (
          select 1
          from public.session_progress as progress
          where progress.father_id = opted.id
            and (
              progress.film_completed
              or progress.checkin_completed
              or progress.action_completed
              or progress.status in ('in_progress', 'completed')
            )
        )
      )::integer,
      count(*) filter (
        where exists (
          select 1
          from public.session_progress as progress
          where progress.father_id = opted.id
            and progress.film_completed
            and progress.checkin_completed
            and progress.action_completed
        )
      )::integer
    into started, completed_one
    from public.profiles as opted
    where opted.role = 'father'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin;

    select coalesce(count(*), 0)::integer
      into trainings_done
    from (
      select assignments.father_id, assignments.training_id
      from public.training_assignments as assignments
      join public.profiles as opted
        on opted.id = assignments.father_id
      join public.sessions
        on sessions.training_id = assignments.training_id
      left join public.session_progress as progress
        on progress.session_id = sessions.id
        and progress.father_id = assignments.father_id
      where opted.role = 'father'::public.user_role
        and opted.deactivated_at is null
        and opted.share_anonymous_admin
      group by assignments.father_id, assignments.training_id
      having count(sessions.id) > 0
        and count(sessions.id) filter (
          where progress.film_completed
            and progress.checkin_completed
            and progress.action_completed
        ) = count(sessions.id)
    ) as finished;

    select coalesce(count(*), 0)::integer
      into sessions_done
    from public.session_progress as progress
    join public.profiles as opted
      on opted.id = progress.father_id
    where opted.role = 'father'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin
      and progress.film_completed
      and progress.checkin_completed
      and progress.action_completed;

    select coalesce(count(*), 0)::integer
      into certificates_held
    from public.certificates as cert
    join public.profiles as opted
      on opted.id = cert.father_id
    where opted.role = 'father'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin;

    select coalesce(count(*), 0)::integer
      into assessments_done
    from public.custom_assessment_assignments as assigned
    join public.profiles as opted
      on opted.id = assigned.father_id
    where opted.role = 'father'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin
      and assigned.status = 'completed';

    select coalesce(count(distinct father_profiles.father_id), 0)::integer
      into profiles_done
    from public.father_profiles
    join public.profiles as opted
      on opted.id = father_profiles.father_id
    where opted.role = 'father'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin;

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
        per_assignment.title,
        per_assignment.order_index,
        count(*) filter (where completed_sessions = 0)::integer as not_started,
        count(*) filter (
          where completed_sessions > 0
            and completed_sessions < session_total
        )::integer as in_progress,
        count(*) filter (
          where session_total > 0
            and completed_sessions >= session_total
        )::integer as completed
      from (
        select
          assignments.father_id,
          trainings.id as training_id,
          trainings.title,
          trainings.order_index,
          count(sessions.id) as session_total,
          count(progress.id) filter (
            where progress.film_completed
              and progress.checkin_completed
              and progress.action_completed
          ) as completed_sessions
        from public.training_assignments as assignments
        join public.profiles as opted
          on opted.id = assignments.father_id
        join public.trainings
          on trainings.id = assignments.training_id
        join public.sessions
          on sessions.training_id = trainings.id
        left join public.session_progress as progress
          on progress.session_id = sessions.id
          and progress.father_id = assignments.father_id
        where opted.role = 'father'::public.user_role
          and opted.deactivated_at is null
          and opted.share_anonymous_admin
        group by assignments.father_id, trainings.id, trainings.title, trainings.order_index
      ) as per_assignment
      group by per_assignment.title, per_assignment.order_index
    ) as distribution;

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
          date_trunc('week', progress.completed_at)::date as week_start,
          count(*)::integer as n
        from public.session_progress as progress
        join public.profiles as opted
          on opted.id = progress.father_id
        where opted.role = 'father'::public.user_role
          and opted.deactivated_at is null
          and opted.share_anonymous_admin
          and progress.film_completed
          and progress.checkin_completed
          and progress.action_completed
          and progress.completed_at is not null
          and progress.completed_at >= date_trunc('week', (current_date - interval '5 weeks'))
        group by 1
      ) as counts using (week_start)
    ) as weeks;

    fathers := jsonb_build_object(
      'opted_in', father_opted,
      'eligible', father_eligible,
      'ready', true,
      'started', started,
      'completed_one_session', completed_one,
      'trainings_completed', trainings_done,
      'sessions_completed', sessions_done,
      'certificates', certificates_held,
      'assessments_completed', assessments_done,
      'profiles_completed', profiles_done,
      'training_distribution', training_distribution,
      'completion_trend', completion_trend
    );
  else
    fathers := jsonb_build_object(
      'opted_in', father_opted,
      'eligible', father_eligible,
      'ready', false
    );
  end if;

  if manager_opted >= min_n then
    select coalesce(count(*), 0)::integer
      into assignments_made
    from public.training_assignments as assignments
    join public.profiles as opted
      on opted.id = assignments.assigned_by
    where opted.role = 'manager'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin;

    select coalesce(count(*), 0)::integer
      into certificates_issued
    from public.certificates as cert
    join public.profiles as opted
      on opted.id = cert.issued_by
    where opted.role = 'manager'::public.user_role
      and opted.deactivated_at is null
      and opted.share_anonymous_admin;

    select
      count(*) filter (
        where reviews.status = 'accepted'
          and decider.share_anonymous_admin
          and decider.role = 'manager'::public.user_role
          and decider.deactivated_at is null
      )::integer,
      count(*) filter (
        where reviews.status = 'declined'
          and decider.share_anonymous_admin
          and decider.role = 'manager'::public.user_role
          and decider.deactivated_at is null
      )::integer,
      count(*) filter (
        where reviews.status = 'pending'
          and manager.share_anonymous_admin
          and manager.role = 'manager'::public.user_role
          and manager.deactivated_at is null
      )::integer
    into reviews_accepted, reviews_declined, reviews_pending
    from public.organization_training_reviews as reviews
    join public.groups
      on groups.id = reviews.group_id
    join public.profiles as manager
      on manager.id = groups.manager_id
    left join public.profiles as decider
      on decider.id = reviews.decided_by;

    managers := jsonb_build_object(
      'opted_in', manager_opted,
      'eligible', manager_eligible,
      'ready', true,
      'assignments', assignments_made,
      'certificates_issued', certificates_issued,
      'reviews_accepted', reviews_accepted,
      'reviews_declined', reviews_declined,
      'reviews_pending', reviews_pending
    );
  else
    managers := jsonb_build_object(
      'opted_in', manager_opted,
      'eligible', manager_eligible,
      'ready', false
    );
  end if;

  if reviewer_opted >= min_n then
    select
      count(*) filter (where home_group_id is not null)::integer,
      count(*) filter (where home_group_id is null)::integer
    into reviewer_scoped, reviewer_unscoped
    from public.profiles
    where role = 'reviewer'::public.user_role
      and deactivated_at is null
      and share_anonymous_admin;

    reviewers := jsonb_build_object(
      'opted_in', reviewer_opted,
      'eligible', reviewer_eligible,
      'ready', true,
      'scoped', reviewer_scoped,
      'unscoped', reviewer_unscoped
    );
  else
    reviewers := jsonb_build_object(
      'opted_in', reviewer_opted,
      'eligible', reviewer_eligible,
      'ready', false
    );
  end if;

  return jsonb_build_object(
    'min_cohort', min_n,
    'fathers', fathers,
    'managers', managers,
    'reviewers', reviewers
  );
end;
$$;

create or replace function public.admin_anonymous_gathering()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.admin_anonymous_gathering();
$$;

revoke all on function internal.admin_anonymous_gathering() from public, anon, authenticated;
grant execute on function internal.admin_anonymous_gathering() to service_role;

revoke all on function public.admin_anonymous_gathering() from public, anon;
grant execute on function public.admin_anonymous_gathering() to authenticated, service_role;
