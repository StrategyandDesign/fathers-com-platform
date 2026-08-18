-- Catalog after consolidating parts: one complete training, sessions only.
-- No assignable training should still carry part_number.

select slug, title, session_count, part_number, part_total, series_title
from public.trainings
order by order_index;

select
  count(*) as progress_rows,
  count(*) filter (
    where film_completed and checkin_completed and action_completed
  ) as completed_rows,
  count(distinct father_id) as fathers_with_progress
from public.session_progress;
