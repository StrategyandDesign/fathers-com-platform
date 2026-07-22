-- Report branding, page backgrounds. Extends the section-photo model so a
-- designated course creator can also set a full-bleed background photo behind the
-- report cover (hero) and behind the closing panel (footer). Stored inline as a
-- data URL (uploaded, web-optimized) or a hosted https URL, exactly like the logos
-- and section photos. The report applies a dark overlay so the display type stays
-- readable, and shows the solid pine background when a slot is empty. Existing
-- row-level policies on report_branding already cover these columns. Idempotent.

alter table public.report_branding
  add column if not exists photo_cover  text,
  add column if not exists photo_footer text;

select 'report_branding backgrounds ready' as status,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='report_branding'
       and column_name in ('photo_cover','photo_footer')) as bg_cols;
