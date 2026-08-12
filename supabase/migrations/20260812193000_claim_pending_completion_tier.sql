-- Quick Start: claim_pending_result must persist completion_tier into keystone_results.
-- Live applied 2026-08-12 via Supabase MCP (claim_pending_completion_tier).

create or replace function claim_pending_result(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pend pending_results%rowtype;
  sc   jsonb;
  tier text;
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
  tier := coalesce(nullif(pend.payload ->> 'completion_tier', ''), 'full');
  if tier not in ('quick', 'full', 'preparing') then
    tier := 'full';
  end if;

  insert into keystone_results
    (user_id, assessment_slug, overall_pct, section_scores, scale_scores,
     gap_scale, strength_scale, completion_tier)
  values
    (auth.uid(),
     pend.assessment_slug,
     nullif(sc ->> 'overall','')::numeric,
     sc -> 'sections',
     sc -> 'scales',
     sc ->> 'gap',
     sc ->> 'strength',
     tier);

  update pending_results
     set claimed_by = auth.uid(), claimed_at = now()
   where token = p_token;

  return true;
end $$;

revoke all on function claim_pending_result(uuid) from public;
grant execute on function claim_pending_result(uuid) to authenticated;
