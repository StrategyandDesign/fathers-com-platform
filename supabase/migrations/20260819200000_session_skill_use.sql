-- Optional self-report that a completed session's skill was used.
-- Does not change completion, certificates, or assignment.

alter table public.session_progress
  add column if not exists skill_use text;

alter table public.session_progress
  add column if not exists skill_use_at timestamptz;

do $$
begin
  alter table public.session_progress
    add constraint session_progress_skill_use_check
    check (skill_use is null or skill_use in ('used', 'later'));
exception
  when duplicate_object then null;
end
$$;

comment on column public.session_progress.skill_use is
  'Optional self-report after completion: used (he tapped I used it) or later (dismissed). Not a score.';
comment on column public.session_progress.skill_use_at is
  'When the father last answered the skill-use prompt.';
