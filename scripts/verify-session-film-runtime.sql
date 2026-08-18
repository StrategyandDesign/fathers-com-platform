-- Session film runtime verification.
-- Run on Pilot after applying 20260818070000_session_film_runtime.sql.
-- Down path: begin; select internal.rollback_session_film_runtime(); rollback;

select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('sessions', 'session_progress')
  and column_name in ('duration_seconds', 'film_seconds')
order by table_name, column_name;

-- Existing progress rows must keep their completion flags.
select
  count(*) as progress_rows,
  count(*) filter (
    where film_completed and checkin_completed and action_completed
  ) as completed_rows,
  count(*) filter (where film_seconds is null) as null_resume_rows
from public.session_progress;

-- Down-path smoke test (transactional; does not keep the rollback):
-- begin;
--   select internal.rollback_session_film_runtime();
--   -- expect duration_seconds and film_seconds gone
-- rollback;
