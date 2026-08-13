-- Returning Home researcher seat, part 1 of 2.
-- Postgres 17: ADD VALUE IF NOT EXISTS must commit before a later statement
-- in another file uses the new enum label.
alter type public.app_role add value if not exists 'researcher';
