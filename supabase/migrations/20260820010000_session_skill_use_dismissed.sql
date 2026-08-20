-- Allow Dismiss on the optional skill-use prompt.
-- Completed stays used. Not yet stays later. Dismiss does not count as used.

alter table public.session_progress
  drop constraint if exists session_progress_skill_use_check;

alter table public.session_progress
  add constraint session_progress_skill_use_check
  check (skill_use is null or skill_use in ('used', 'later', 'dismissed'));

comment on column public.session_progress.skill_use is
  'Optional self-report after completion: used (Completed), later (Not yet), or dismissed. Not a score.';
