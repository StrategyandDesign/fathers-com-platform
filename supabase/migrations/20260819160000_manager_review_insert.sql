-- Leaders can include or decline a catalog training from the list
-- without a Super-admin release row already sitting in pending.

grant insert on public.organization_training_reviews to authenticated;

drop policy if exists organization_training_reviews_insert on public.organization_training_reviews;

create policy organization_training_reviews_insert
on public.organization_training_reviews
for insert
to authenticated
with check ((select public.is_manager_of_group(group_id)));

create or replace function internal.my_declined_training_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct reviews.training_id), '{}'::uuid[])
  from public.organization_training_reviews as reviews
  join public.group_members as members
    on members.group_id = reviews.group_id
  where members.father_id = (select auth.uid())
    and reviews.status = 'declined';
$$;

create or replace function public.my_declined_training_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.my_declined_training_ids();
$$;

revoke all on function internal.my_declined_training_ids() from public, anon;
revoke all on function public.my_declined_training_ids() from public, anon;

grant execute on function internal.my_declined_training_ids() to authenticated, service_role;
grant execute on function public.my_declined_training_ids() to authenticated, service_role;
