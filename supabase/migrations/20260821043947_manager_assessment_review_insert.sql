-- Leaders can include or decline a catalog assessment from the list
-- without a Super-admin release row already sitting in pending.

grant insert on public.organization_assessment_reviews to authenticated;

drop policy if exists organization_assessment_reviews_insert
  on public.organization_assessment_reviews;

create policy organization_assessment_reviews_insert
on public.organization_assessment_reviews
for insert
to authenticated
with check ((select public.is_manager_of_group(group_id)));
