-- Optional Check-in note on session progress. Separate from skill-check answers
-- and from Action's action_note. Fathers already own the row via existing RLS.

alter table public.session_progress
  add column if not exists session_note text;

comment on column public.session_progress.session_note is
  'Optional father teaching note from Check-in. Not a skill-check answer.';

update public.session_progress
set session_note = left(btrim(checkin_answers ->> 'notes'), 2000)
where session_note is null
  and nullif(btrim(coalesce(checkin_answers ->> 'notes', '')), '') is not null;

update public.session_progress
set checkin_answers = checkin_answers - 'notes'
where checkin_answers ? 'notes';

alter table public.session_progress
  drop constraint if exists session_progress_session_note_check;

alter table public.session_progress
  add constraint session_progress_session_note_check
  check (session_note is null or char_length(session_note) <= 2000);
