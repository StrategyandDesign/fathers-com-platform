-- Keystone v1.4 | Program-localized support + scale indexes. Safe, re-runnable.
-- 1. A unit or program can attach its own support contacts to its join code.
--    Shown to its fathers in the hub and resources pages. Never shown otherwise.
alter table public.org_join_codes add column if not exists support_note text;

-- 2. Scale indexes for the report and cohort paths.
create index if not exists idx_keystone_sessions_org on public.keystone_sessions(organization_id);
create index if not exists idx_participant_outcomes_session on public.participant_outcomes(session_id);

-- 3. Verify. Expect: support_note_col=1, org_idx=1, outcome_idx=1.
select
  (select count(*) from information_schema.columns where table_name='org_join_codes' and column_name='support_note') as support_note_col,
  (select count(*) from pg_indexes where indexname='idx_keystone_sessions_org') as org_idx,
  (select count(*) from pg_indexes where indexname='idx_participant_outcomes_session') as outcome_idx;
