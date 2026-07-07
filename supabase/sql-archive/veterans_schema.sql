-- Fathers.com: Veterans program schema. Safe to run more than once.
-- Creates three tables, locks each to its owner with RLS, and sets up the
-- private storage bucket for voice recordings.

-- 1) One veteran profile per user. Self-attested context that drives matching.
create table if not exists veteran_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  service_context text check (service_context in ('active','guard_reserve','veteran','family')),
  combat_theater boolean default false,
  separation_months int,
  child_age_bands text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Private check-in outcomes. Public-domain instruments only.
--    No free text and no method-level detail is ever stored here.
create table if not exists screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  instrument text not null,          -- pc_ptsd_5 | phq2 | gad2
  score int,
  band text,                         -- positive | negative
  routed_to text,                    -- resource key the father was pointed to
  acute_flag boolean default false,
  created_at timestamptz default now()
);

-- 3) Voice recording metadata. The audio itself lives in the 'voice' bucket.
create table if not exists voice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  kind text,                         -- bedtime_story | message | thinking
  storage_path text not null,
  created_at timestamptz default now()
);

-- RLS: a father reads and writes only his own rows.
alter table veteran_profiles enable row level security;
alter table screenings enable row level security;
alter table voice_recordings enable row level security;

drop policy if exists "own veteran profile" on veteran_profiles;
create policy "own veteran profile" on veteran_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own screenings" on screenings;
create policy "own screenings" on screenings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own recordings" on voice_recordings;
create policy "own recordings" on voice_recordings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Private storage bucket for the audio files.
--    If this insert is blocked in your project, create a bucket named 'voice'
--    (not public) in the dashboard under Storage instead. The policies below
--    still apply.
insert into storage.buckets (id, name, public) values ('voice','voice',false)
on conflict (id) do nothing;

-- A father can upload to and read only his own folder, which is named by his user id.
drop policy if exists "voice upload own" on storage.objects;
create policy "voice upload own" on storage.objects for insert
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "voice read own" on storage.objects;
create policy "voice read own" on storage.objects for select
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "voice delete own" on storage.objects;
create policy "voice delete own" on storage.objects for delete
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
