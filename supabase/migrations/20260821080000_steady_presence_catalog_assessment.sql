-- Seed The Steady Presence Keystone Assessment into the first-party catalog.
-- Super-admin releases it. Leaders accept or decline.

create or replace function internal.assessment_release_title(p_assessment_key text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select platform_assessments.title
      from public.platform_assessments
      where platform_assessments.assessment_key = p_assessment_key
      limit 1
    ),
    case
      when p_assessment_key = 'keystone' then 'Keystone Assessment'
      when p_assessment_key = 'legacy-architect' then 'The Legacy Architect Keystone Assessment'
      when p_assessment_key = 'family-fortress' then 'The Family Fortress Keystone Assessment'
      when p_assessment_key = 'steady-presence' then 'The Steady Presence Keystone Assessment'
      else p_assessment_key
    end
  );
$$;

revoke all on function internal.assessment_release_title(text)
  from public, anon, authenticated;
grant execute on function internal.assessment_release_title(text) to service_role;

insert into public.platform_assessments (
  slug,
  assessment_key,
  title,
  description,
  attribution,
  development_status,
  scoring_method,
  scale_min,
  scale_max,
  published,
  archived,
  last_edited_at
)
values (
  'steady-presence',
  'steady-presence',
  'The Steady Presence Keystone Assessment',
  'A 30-question look at how reliably you show up. Answer from the presence your children actually meet, not the one you intend.',
  'Fathers.com',
  'ready_for_review',
  'weighted_mean',
  1,
  5,
  false,
  false,
  now()
)
on conflict (assessment_key) do update
set
  title = excluded.title,
  description = excluded.description,
  attribution = excluded.attribution,
  last_edited_at = now();
