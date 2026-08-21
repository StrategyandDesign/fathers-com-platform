-- Leader invite tokens and first-run mark.
-- Super-admin writes invites. Service role claims them. Existing managers skip the tour.

alter table public.profiles
  add column if not exists manager_onboarded_at timestamptz;

comment on column public.profiles.manager_onboarded_at is
  'When a Leader finished the first-run desk instruction. Null means show /manager/start.';

update public.profiles
set manager_onboarded_at = coalesce(manager_onboarded_at, now())
where role = 'manager'::public.user_role
  and manager_onboarded_at is null;

create table if not exists public.manager_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  full_name text,
  organization_name text not null,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  group_id uuid references public.groups (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint manager_invites_email_check
    check (char_length(btrim(email)) >= 3 and char_length(email) <= 320),
  constraint manager_invites_org_check
    check (char_length(btrim(organization_name)) >= 1 and char_length(organization_name) <= 200),
  constraint manager_invites_name_check
    check (full_name is null or char_length(btrim(full_name)) <= 80),
  constraint manager_invites_accepted_check
    check (
      (accepted_at is null and accepted_by is null)
      or (accepted_at is not null and accepted_by is not null)
    )
);

comment on table public.manager_invites is
  'One-time Leader join links. Super-admin writes. Service role claims. Token stored hashed.';

create index if not exists manager_invites_created_idx
  on public.manager_invites (created_at desc);

create unique index if not exists manager_invites_open_email_idx
  on public.manager_invites (lower(email))
  where accepted_at is null;

alter table public.manager_invites enable row level security;

drop policy if exists manager_invites_admin_all on public.manager_invites;
create policy manager_invites_admin_all
on public.manager_invites
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

revoke all on table public.manager_invites from public, anon;
grant select, insert, update on table public.manager_invites to authenticated;
grant all on table public.manager_invites to service_role;
