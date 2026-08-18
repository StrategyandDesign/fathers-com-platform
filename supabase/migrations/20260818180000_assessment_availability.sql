-- Org-level share/remove for assessments, parallel to training reviews.
-- No row means available (Keystone stays on for existing groups).
-- Hidden hides new starts. Fathers who already started or finished keep access.
-- Down path: select internal.rollback_assessment_availability();

create table if not exists public.organization_assessment_availability (
  group_id uuid not null references public.groups (id) on delete cascade,
  assessment_key text not null,
  status text not null default 'available',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, assessment_key),
  constraint organization_assessment_availability_status_check
    check (status in ('available', 'hidden')),
  constraint organization_assessment_availability_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
    )
);

comment on table public.organization_assessment_availability is
  'Per-organization share/remove of an assessment. Missing row = available. keystone or a custom assessment id.';

create index if not exists organization_assessment_availability_group_status_idx
  on public.organization_assessment_availability (group_id, status);

alter table public.organization_assessment_availability enable row level security;
alter table public.organization_assessment_availability force row level security;

grant select, insert, update on public.organization_assessment_availability
  to authenticated, service_role;
revoke delete, truncate on public.organization_assessment_availability
  from anon, authenticated;

drop policy if exists organization_assessment_availability_select
  on public.organization_assessment_availability;
drop policy if exists organization_assessment_availability_insert
  on public.organization_assessment_availability;
drop policy if exists organization_assessment_availability_update
  on public.organization_assessment_availability;

create policy organization_assessment_availability_select
on public.organization_assessment_availability
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_super_admin())
  or exists (
    select 1
    from public.group_members as membership
    where membership.group_id = organization_assessment_availability.group_id
      and membership.father_id = (select auth.uid())
  )
);

create policy organization_assessment_availability_insert
on public.organization_assessment_availability
for insert
to authenticated
with check ((select public.is_manager_of_group(group_id)));

create policy organization_assessment_availability_update
on public.organization_assessment_availability
for update
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check ((select public.is_manager_of_group(group_id)));

create or replace function internal.rollback_assessment_availability()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop policy if exists organization_assessment_availability_update
    on public.organization_assessment_availability;
  drop policy if exists organization_assessment_availability_insert
    on public.organization_assessment_availability;
  drop policy if exists organization_assessment_availability_select
    on public.organization_assessment_availability;
  drop table if exists public.organization_assessment_availability;
end;
$$;

revoke all on function internal.rollback_assessment_availability()
  from public, anon, authenticated;
grant execute on function internal.rollback_assessment_availability() to service_role;
