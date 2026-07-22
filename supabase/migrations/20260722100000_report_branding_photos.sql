-- Report branding, section photos. Extends the two-logos-and-colors model so a
-- designated course creator can also set one optional photo per section of the
-- participant report (Dimensions, Practices, Satisfaction). Stored inline as a
-- data URL (uploaded, web-optimized) or a hosted https URL. The report shows a
-- designed default when a slot is empty, so a blank set still looks finished.
-- Existing row-level policies on report_branding already cover these columns.
-- Idempotent.

alter table public.report_branding
  add column if not exists photo_dimensions   text,
  add column if not exists photo_practices    text,
  add column if not exists photo_satisfaction text;

select 'report_branding photos ready' as status,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='report_branding'
       and column_name in ('photo_dimensions','photo_practices','photo_satisfaction')) as photo_cols;
