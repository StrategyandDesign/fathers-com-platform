-- Clean-pilot core schema: 3 roles (father, manager, reviewer).
-- Tables and helper functions only. RLS is enabled with no policies yet
-- (deny-all for anon/authenticated; service_role still bypasses).
--
-- Security-definer helpers live in `internal`, not in the exposed `public`
-- schema. Public wrappers call those helpers so the app can RPC them.

create extension if not exists pgcrypto;

create schema if not exists internal;

revoke all on schema internal from public, anon;
grant usage on schema internal to authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role'
      and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('father', 'manager', 'reviewer');
  end if;
end
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'father',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- groups ----------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  manager_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index groups_manager_id_idx on public.groups (manager_id);

-- ---------- group_members ----------
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  father_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, father_id)
);

create index group_members_father_id_idx on public.group_members (father_id);

-- ---------- trainings ----------
create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  session_count integer not null default 0 check (session_count >= 0),
  order_index integer not null default 0
);

create index trainings_order_index_idx on public.trainings (order_index);

-- ---------- sessions ----------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  session_number integer not null check (session_number > 0),
  title text not null,
  keyline text,
  video_url text,
  order_index integer not null default 0,
  unique (training_id, session_number)
);

create index sessions_training_id_idx on public.sessions (training_id);
create index sessions_training_id_order_idx on public.sessions (training_id, order_index);

-- ---------- session_progress ----------
create table public.session_progress (
  id uuid primary key default gen_random_uuid(),
  father_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  film_completed boolean not null default false,
  checkin_completed boolean not null default false,
  action_completed boolean not null default false,
  checkin_answers jsonb not null default '{}'::jsonb,
  action_note text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  unique (father_id, session_id)
);

create index session_progress_father_id_idx on public.session_progress (father_id);
create index session_progress_session_id_idx on public.session_progress (session_id);

-- ---------- father_profiles ----------
create table public.father_profiles (
  id uuid primary key default gen_random_uuid(),
  father_id uuid not null references public.profiles (id) on delete cascade,
  taken_at timestamptz not null default now(),
  primary_edge text,
  primary_determination text,
  raw_scores jsonb not null default '{}'::jsonb,
  full_results jsonb not null default '{}'::jsonb
);

create index father_profiles_father_id_idx on public.father_profiles (father_id);
create index father_profiles_father_id_taken_at_idx
  on public.father_profiles (father_id, taken_at desc);

-- ---------- training_assignments ----------
create table public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  father_id uuid not null references public.profiles (id) on delete cascade,
  training_id uuid not null references public.trainings (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (father_id, training_id)
);

create index training_assignments_father_id_idx on public.training_assignments (father_id);
create index training_assignments_training_id_idx on public.training_assignments (training_id);
create index training_assignments_assigned_by_idx on public.training_assignments (assigned_by);

-- ---------- certificates ----------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  father_id uuid not null references public.profiles (id) on delete cascade,
  training_id uuid not null references public.trainings (id) on delete restrict,
  serial_number text not null unique,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id) on delete set null,
  pdf_url text
);

create index certificates_father_id_idx on public.certificates (father_id);
create index certificates_training_id_idx on public.certificates (training_id);
create index certificates_issued_by_idx on public.certificates (issued_by);

-- RLS on, no policies yet.
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.trainings enable row level security;
alter table public.sessions enable row level security;
alter table public.session_progress enable row level security;
alter table public.father_profiles enable row level security;
alter table public.training_assignments enable row level security;
alter table public.certificates enable row level security;

alter table public.profiles force row level security;
alter table public.groups force row level security;
alter table public.group_members force row level security;
alter table public.trainings force row level security;
alter table public.sessions force row level security;
alter table public.session_progress force row level security;
alter table public.father_profiles force row level security;
alter table public.training_assignments force row level security;
alter table public.certificates force row level security;

-- ---------- helpers (security definer, internal schema) ----------
-- Role is read from public.profiles, never from user_metadata.

create or replace function internal.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function internal.is_manager_of_group(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups
    join public.profiles on profiles.id = groups.manager_id
    where groups.id = $1
      and groups.manager_id = (select auth.uid())
      and profiles.role = 'manager'::public.user_role
  );
$$;

create or replace function internal.manages_father(father_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    join public.groups on groups.id = group_members.group_id
    join public.profiles as manager on manager.id = groups.manager_id
    where group_members.father_id = $1
      and groups.manager_id = (select auth.uid())
      and manager.role = 'manager'::public.user_role
  );
$$;

create or replace function internal.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    'father'::public.user_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function internal.handle_new_user();

-- Public invoker wrappers for RPC and later policies.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.current_user_role();
$$;

create or replace function public.is_manager_of_group(group_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.is_manager_of_group($1);
$$;

create or replace function public.manages_father(father_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.manages_father($1);
$$;

revoke all on function internal.current_user_role() from public, anon;
revoke all on function internal.is_manager_of_group(uuid) from public, anon;
revoke all on function internal.manages_father(uuid) from public, anon;
revoke all on function internal.handle_new_user() from public, anon, authenticated;
grant execute on function internal.current_user_role() to authenticated, service_role;
grant execute on function internal.is_manager_of_group(uuid) to authenticated, service_role;
grant execute on function internal.manages_father(uuid) to authenticated, service_role;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_manager_of_group(uuid) from public, anon;
revoke all on function public.manages_father(uuid) from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_manager_of_group(uuid) to authenticated, service_role;
grant execute on function public.manages_father(uuid) to authenticated, service_role;
