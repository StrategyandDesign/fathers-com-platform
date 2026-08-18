-- Weekly streak: Monday–Sunday in the father's timezone.
-- Ledger is the source of truth. father_streaks is a derived cache.
-- Staff roles have no policy. No streak notifications of any kind.
-- Down path: select internal.rollback_father_streaks();

create table if not exists public.father_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak_weeks integer not null default 0
    check (current_streak_weeks >= 0),
  longest_streak_weeks integer not null default 0
    check (longest_streak_weeks >= 0),
  last_counted_week date,
  last_evaluated_week date,
  freezes_remaining integer not null default 2
    check (freezes_remaining between 0 and 2),
  freezes_last_replenished_at timestamptz not null default now(),
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

comment on table public.father_streaks is
  'Derived weekly streak cache. One row per father. Staff roles have no policy.';
comment on column public.father_streaks.last_counted_week is
  'Monday date of the latest counted week in the ledger.';
comment on column public.father_streaks.last_evaluated_week is
  'Monday date of the latest closed week written to the ledger.';
comment on column public.father_streaks.freezes_remaining is
  'Automatic freezes. Ceiling is 2. Not purchasable.';
comment on column public.father_streaks.timezone is
  'IANA zone used for the last evaluation. Mid-week changes do not rewrite history.';

create table if not exists public.streak_week_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  outcome text not null check (
    outcome in ('counted', 'frozen', 'missed', 'neutral')
  ),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists streak_week_ledger_user_week_idx
  on public.streak_week_ledger (user_id, week_start desc);

comment on table public.streak_week_ledger is
  'Source of truth for weekly streak outcomes. One row per father per Monday week.';
comment on column public.streak_week_ledger.week_start is
  'Monday date of the local week in the father''s timezone.';
comment on column public.streak_week_ledger.outcome is
  'counted: finished a session. frozen: miss covered by a freeze. missed: reset. neutral: nothing assigned open.';

create table if not exists public.father_streak_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (
    kind in ('freeze_consumed', 'reset', 'freeze_replenished')
  ),
  week_start date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists father_streak_notices_open_idx
  on public.father_streak_notices (user_id, created_at desc)
  where dismissed_at is null;

create unique index if not exists father_streak_notices_week_kind_uidx
  on public.father_streak_notices (user_id, kind, week_start)
  where week_start is not null;

comment on table public.father_streak_notices is
  'In-app streak notices only. Never sent as push or email.';

alter table public.father_streaks enable row level security;
alter table public.father_streaks force row level security;
alter table public.streak_week_ledger enable row level security;
alter table public.streak_week_ledger force row level security;
alter table public.father_streak_notices enable row level security;
alter table public.father_streak_notices force row level security;

drop policy if exists father_streaks_select_own on public.father_streaks;
create policy father_streaks_select_own
on public.father_streaks
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

drop policy if exists streak_week_ledger_select_own on public.streak_week_ledger;
create policy streak_week_ledger_select_own
on public.streak_week_ledger
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

drop policy if exists father_streak_notices_select_own on public.father_streak_notices;
create policy father_streak_notices_select_own
on public.father_streak_notices
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

drop policy if exists father_streak_notices_dismiss_own on public.father_streak_notices;
create policy father_streak_notices_dismiss_own
on public.father_streak_notices
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
)
with check (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

revoke all on table public.father_streaks from public, anon;
revoke all on table public.streak_week_ledger from public, anon;
revoke all on table public.father_streak_notices from public, anon;

grant select on table public.father_streaks to authenticated;
grant select on table public.streak_week_ledger to authenticated;
grant select, update on table public.father_streak_notices to authenticated;

grant select, insert, update, delete on table public.father_streaks to service_role;
grant select, insert, update, delete on table public.streak_week_ledger to service_role;
grant select, insert, update, delete on table public.father_streak_notices to service_role;

create or replace function internal.record_streak_week(
  p_user_id uuid,
  p_week_start date,
  p_outcome text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_outcome not in ('counted', 'frozen', 'missed', 'neutral') then
    raise exception 'invalid streak outcome';
  end if;

  insert into public.streak_week_ledger (user_id, week_start, outcome)
  values (p_user_id, p_week_start, p_outcome)
  on conflict (user_id, week_start) do nothing
  returning id into v_id;

  if v_id is null then
    return false;
  end if;

  if p_outcome = 'frozen' then
    update public.father_streaks
    set
      freezes_remaining = freezes_remaining - 1,
      updated_at = now()
    where user_id = p_user_id
      and freezes_remaining > 0;
  end if;

  return true;
end;
$$;

create or replace function public.record_streak_week(
  p_user_id uuid,
  p_week_start date,
  p_outcome text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select internal.record_streak_week(p_user_id, p_week_start, p_outcome);
$$;

revoke all on function internal.record_streak_week(uuid, date, text) from public, anon, authenticated;
revoke all on function public.record_streak_week(uuid, date, text) from public, anon, authenticated;
grant execute on function internal.record_streak_week(uuid, date, text) to service_role;
grant execute on function public.record_streak_week(uuid, date, text) to service_role;

create or replace function internal.rollback_father_streaks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop function if exists public.record_streak_week(uuid, date, text);
  drop function if exists internal.record_streak_week(uuid, date, text);
  drop table if exists public.father_streak_notices;
  drop table if exists public.streak_week_ledger;
  drop table if exists public.father_streaks;
end;
$$;

revoke all on function internal.rollback_father_streaks() from public, anon, authenticated;
grant execute on function internal.rollback_father_streaks() to service_role;
