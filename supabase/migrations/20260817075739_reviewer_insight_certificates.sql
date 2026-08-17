-- Anonymized certificate count for reviewer impact summaries.
-- Reuses the existing filtered cohort. No names, emails, or serials.

create or replace function internal.reviewer_insight_certificates(
  p_filters jsonb default '{}'::jsonb
)
returns integer
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
  v_count integer := 0;
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

  select count(*)::integer
    into v_count
  from public.certificates
  where certificates.father_id in (
    select cohort.father_id
    from internal.reviewer_insight_cohort(
      v_group_id, v_training_id, v_status, v_from, v_to
    ) as cohort
  )
    and (
      v_training_id is null
      or certificates.training_id = v_training_id
    );

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.reviewer_insight_certificates(
  p_filters jsonb default '{}'::jsonb
)
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select internal.current_user_role()) is distinct from 'reviewer'::public.user_role then
    raise exception 'Not authorized';
  end if;

  return internal.reviewer_insight_certificates(p_filters);
end;
$$;

revoke all on function internal.reviewer_insight_certificates(jsonb)
  from public, anon;
revoke all on function public.reviewer_insight_certificates(jsonb)
  from public, anon;
grant execute on function internal.reviewer_insight_certificates(jsonb)
  to authenticated, service_role;
grant execute on function public.reviewer_insight_certificates(jsonb)
  to authenticated, service_role;

comment on function public.reviewer_insight_certificates(jsonb) is
  'Reviewer-only count of certificates in the filtered cohort. No identifiable fields.';
