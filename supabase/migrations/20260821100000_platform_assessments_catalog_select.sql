-- Fathers and Leaders need to read the saved first-party instrument
-- after Super-admin edits it. Sourced drafts stay admin-only.

drop policy if exists platform_assessments_catalog_select
  on public.platform_assessments;

create policy platform_assessments_catalog_select
on public.platform_assessments
for select
to authenticated
using (
  intake_id is null
  and archived is not true
);
