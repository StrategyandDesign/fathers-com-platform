-- Pilot placeholder overview films. Super-admin can replace these URLs.
-- Fathers only see the player when overview_video_url is a YouTube or Vimeo link.
-- Big Buck Bunny is the same demo host already used in session films.

update public.trainings
set overview_video_url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
where coalesce(nullif(btrim(overview_video_url), ''), '') = '';
