-- Keystone v2.4: voice share links. Phase A of the steward architecture.
-- Capability tokens: signed, revocable, expiring. The player page collects nothing.
begin;

create table if not exists public.voice_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  title text,
  label text,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

alter table public.voice_shares enable row level security;

drop policy if exists "voice_shares own all" on public.voice_shares;
create policy "voice_shares own all" on public.voice_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists voice_shares_path_idx on public.voice_shares (storage_path);
create index if not exists voice_shares_user_idx on public.voice_shares (user_id);

-- Public resolver: token in, playable facts out. No table exposure to anon.
create or replace function public.get_shared_voice(p_token uuid)
returns table (title text, storage_path text)
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(s.title, 'A message for you'), s.storage_path
  from public.voice_shares s
  where s.token = p_token
    and s.revoked_at is null
    and s.expires_at > now();
$$;

revoke all on function public.get_shared_voice(uuid) from public;
grant execute on function public.get_shared_voice(uuid) to anon, authenticated;

-- Storage: an object in the voice bucket is readable while an active share names it.
-- Revoking or expiry closes the door immediately.
drop policy if exists "voice shared objects readable" on storage.objects;
create policy "voice shared objects readable" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'voice'
    and exists (
      select 1 from public.voice_shares s
      where s.storage_path = storage.objects.name
        and s.revoked_at is null
        and s.expires_at > now()
    )
  );

commit;

-- verify: expect 1, 1, 1
select 'voice_shares table' as item, count(*) as n from information_schema.tables where table_schema='public' and table_name='voice_shares';
select 'resolver fn' as item, count(*) as n from pg_proc where proname='get_shared_voice';
select 'storage share policy' as item, count(*) as n from pg_policies where policyname='voice shared objects readable';
