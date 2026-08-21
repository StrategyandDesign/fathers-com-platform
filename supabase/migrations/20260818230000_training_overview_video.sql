-- Overview film for each training. Separate from session films.
-- YouTube or Vimeo URL. Empty means fathers go straight to sessions.

alter table public.trainings
  add column if not exists overview_video_url text;
