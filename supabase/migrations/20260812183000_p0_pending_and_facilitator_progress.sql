-- P0: pending_results claim path + facilitator progress strip RPC.
-- Live applied 2026-08-12 via Supabase MCP (pending_results_claim,
-- facilitator_participant_progress). Kept here for repo/history parity.

create table if not exists pending_results (
  token           uuid primary key,
  assessment_slug text not null default 'keystone-father-profile',
  payload         jsonb not null,
  created_at      timestamptz not null default now(),
  claimed_by      uuid,
  claimed_at      timestamptz,
  constraint pending_payload_shape check (payload ? 'scored')
);

alter table pending_results enable row level security;

drop policy if exists pending_park on pending_results;
create policy pending_park
  on pending_results
  for insert
  to anon, authenticated
  with check (claimed_by is null and claimed_at is null);

revoke all on pending_results from anon, authenticated;
grant insert (token, assessment_slug, payload) on pending_results to anon, authenticated;

create or replace function claim_pending_result(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pend pending_results%rowtype;
  sc   jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into pend
  from pending_results
  where token = p_token
    and claimed_at is null
    and created_at > now() - interval '7 days'
  for update skip locked;

  if not found then
    return false;
  end if;

  sc := pend.payload -> 'scored';

  insert into keystone_results
    (user_id, assessment_slug, overall_pct, section_scores, scale_scores,
     gap_scale, strength_scale)
  values
    (auth.uid(),
     pend.assessment_slug,
     nullif(sc ->> 'overall','')::numeric,
     sc -> 'sections',
     sc -> 'scales',
     sc ->> 'gap',
     sc ->> 'strength');

  update pending_results
     set claimed_by = auth.uid(), claimed_at = now()
   where token = p_token;

  return true;
end $$;

revoke all on function claim_pending_result(uuid) from public;
grant execute on function claim_pending_result(uuid) to authenticated;

create or replace function purge_pending_results()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from pending_results
    where claimed_at is not null
       or created_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function purge_pending_results() from public;

create or replace function facilitator_participant_progress()
returns table (
  claim_id uuid,
  participant_email text,
  participant_user_id uuid,
  participant_name text,
  profile_complete boolean,
  sessions_completed integer,
  checkpoints_passed integer,
  seconds_logged integer,
  enroll_state text,
  course_title text,
  cert_serial text,
  cert_issued_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any (array['circle_leader'::app_role, 'org_admin'::app_role, 'admin'::app_role])
  ) and not exists (
    select 1 from participant_claims pc
    where pc.facilitator_user_id = auth.uid() and pc.status = 'active'
  ) then
    raise exception 'facilitator role required';
  end if;

  return query
  with claims as (
    select pc.id as claim_id, pc.participant_email, pc.user_id as linked_user_id
    from participant_claims pc
    where pc.facilitator_user_id = auth.uid()
      and pc.status = 'active'
  ),
  resolved as (
    select
      c.claim_id,
      c.participant_email,
      coalesce(c.linked_user_id, p.id) as uid,
      coalesce(p.name, '') as pname
    from claims c
    left join profiles p on lower(p.email) = lower(c.participant_email)
  )
  select
    r.claim_id,
    r.participant_email,
    r.uid,
    r.pname,
    exists (select 1 from keystone_results kr where kr.user_id = r.uid) as profile_complete,
    coalesce((select count(*)::int from video_progress vp where vp.user_id = r.uid and vp.completed is true), 0),
    coalesce((select count(*)::int from checkpoint_passes cp where cp.user_id = r.uid), 0),
    coalesce((select max(ce.seconds_logged)::int from certificate_enrollments ce where ce.user_id = r.uid), 0),
    (select ce.state from certificate_enrollments ce where ce.user_id = r.uid order by ce.last_activity_at desc nulls last limit 1),
    (select cc.title from certificate_enrollments ce join certificate_courses cc on cc.id = ce.course_id where ce.user_id = r.uid order by ce.last_activity_at desc nulls last limit 1),
    (select cert.serial from certificate_enrollments ce join certificates cert on cert.enrollment_id = ce.id where ce.user_id = r.uid and coalesce(cert.revoked, false) is not true order by cert.issued_at desc nulls last limit 1),
    (select cert.issued_at from certificate_enrollments ce join certificates cert on cert.enrollment_id = ce.id where ce.user_id = r.uid and coalesce(cert.revoked, false) is not true order by cert.issued_at desc nulls last limit 1)
  from resolved r
  order by r.participant_email;
end;
$$;

revoke all on function facilitator_participant_progress() from public;
grant execute on function facilitator_participant_progress() to authenticated;
