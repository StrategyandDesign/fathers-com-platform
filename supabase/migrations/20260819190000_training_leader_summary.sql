-- Complete Training Summary for Org Managers. Shown below the title
-- on View training, before sessions and films. Optional. Does not
-- change assignability, reviews, RLS, or the catalog description.
-- Down path: alter table public.trainings drop column if exists leader_summary;

alter table public.trainings
  add column if not exists leader_summary text;

alter table public.trainings
  drop constraint if exists trainings_leader_summary_len;

alter table public.trainings
  add constraint trainings_leader_summary_len
  check (leader_summary is null or char_length(leader_summary) <= 4000);

comment on column public.trainings.leader_summary is
  'Complete Training Summary shown to Org Managers above sessions and films.';
