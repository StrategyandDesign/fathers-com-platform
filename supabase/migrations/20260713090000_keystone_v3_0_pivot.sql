-- Keystone v3.0: the pivot. Profile front door, served routing, funnel instrumentation.
begin;

alter table public.profiles add column if not exists served boolean;

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.funnel_events enable row level security;
drop policy if exists "funnel insert any" on public.funnel_events;
create policy "funnel insert any" on public.funnel_events for insert to anon, authenticated with check (true);
drop policy if exists "funnel read own" on public.funnel_events;
create policy "funnel read own" on public.funnel_events for select using (auth.uid() = user_id);
create index if not exists funnel_events_event_idx on public.funnel_events (event, created_at);

alter table public.voice_shares add column if not exists view_count integer not null default 0;
alter table public.voice_shares add column if not exists last_viewed_at timestamptz;

create or replace function public.record_share_view(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.voice_shares
     set view_count = view_count + 1,
         last_viewed_at = now()
   where token = p_token
     and revoked_at is null
     and expires_at > now();
  if found then
    insert into public.funnel_events (event, meta) values ('share_view', jsonb_build_object('token', p_token));
  end if;
end;
$$;
revoke all on function public.record_share_view(uuid) from public;
grant execute on function public.record_share_view(uuid) to anon, authenticated;

commit;

-- verify: expect 1, 1, 1, 1
select 'profiles.served' as item, count(*) as n from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='served';
select 'funnel_events' as item, count(*) as n from information_schema.tables where table_schema='public' and table_name='funnel_events';
select 'record_share_view' as item, count(*) as n from pg_proc where proname='record_share_view';
select 'voice_shares.view_count' as item, count(*) as n from information_schema.columns where table_schema='public' and table_name='voice_shares' and column_name='view_count';
