-- Training series split verification.
-- Run these reads on Pilot after applying 20260818063000_training_series_parts.sql.
-- Down path: begin; select internal.rollback_training_series_split(); -- then rollback;

-- Catalog: no assignable training may exceed 6 sessions.
select slug, title, session_count, part_number, part_total, series_title
from public.trainings
order by order_index, part_number nulls last;

select training_id, count(*) as sessions
from public.sessions
group by training_id
having count(*) > 6;

-- Progress must be unchanged from the pre-split count (10 rows, 8 completed, 3 fathers).
select
  count(*) as progress_rows,
  count(*) filter (
    where film_completed and checkin_completed and action_completed
  ) as completed_rows,
  count(distinct father_id) as fathers_with_progress
from public.session_progress;

-- Down-path smoke test (transactional; does not keep the rollback):
-- begin;
--   select internal.rollback_training_series_split();
--   -- expect fundamentals to have 9 sessions and no *-2 slugs
--   -- expect session_progress still 10 rows
-- rollback;
