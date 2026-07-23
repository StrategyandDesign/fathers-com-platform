-- If-then cue on plan check-ins. Additive and idempotent.
--
-- A man's plan action is a goal intention: "call at the time you said you would."
-- An implementation intention adds the when and the where: "Tuesday at 7pm, from
-- the truck." Across 94 independent tests the if-then form produced a medium to
-- large improvement in whether the behavior actually happened, so the cue is
-- worth storing rather than leaving in the browser.
--
-- The cue is the man's own words about his own week. It lives under the existing
-- "own plan checkins" policy, so only he can read or write it. No new policy and
-- no widening of access.
--
-- Safe to run before or after the app ships: the client writes the cue to
-- localStorage first and mirrors it here only when signed in, so the plan keeps
-- working whether or not this has been applied.

alter table public.plan_checkins add column if not exists cue text;

comment on column public.plan_checkins.cue is
  'Implementation intention: when and where the man will do this action, in his own words.';

select 'plan_checkins.cue ready' as status,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='plan_checkins' and column_name='cue') as cue_col;
