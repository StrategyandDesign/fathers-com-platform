-- ============================================================
-- Keystone Father Profile: full 130-item instrument
-- Resumable, sectioned, scored against published norms.
-- Run AFTER schema.sql and schema_rbac.sql.
-- ============================================================

-- A father's in-progress or completed run of the Keystone.
-- One active session per user; supports stop-and-resume across devices.
create table if not exists keystone_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  mode text not null default 'by_section' check (mode in ('all_at_once','by_section')),
  path text not null default 'father' check (path in ('father','preparing')),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  current_section text,              -- which section they're on: dimensions | practices | satisfaction
  sections_done text[] default '{}', -- sections completed so far
  started_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now()
);
alter table keystone_sessions enable row level security;
create policy "own keystone sessions" on keystone_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Every answer, saved as the father goes. Resumable = we persist each response immediately.
-- item_key is section.scale.index, e.g. "dimensions.involvement.0"
create table if not exists keystone_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references keystone_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  item_key text not null,
  value int not null,                -- raw Likert value (1-5 or 1-7)
  answered_at timestamptz default now(),
  unique (session_id, item_key)      -- one answer per item; re-answering updates
);
alter table keystone_answers enable row level security;
create policy "own keystone answers" on keystone_answers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Final scored result, one row per completed session. Immutable once written.
-- scale_scores: {involvement: {raw: 24, pct: 62, band: "solid"}, ...}
create table if not exists keystone_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references keystone_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  overall_pct numeric(5,2),          -- overall percentile-style score vs norms
  section_scores jsonb,              -- {dimensions: 68, practices: 72, satisfaction: 60}
  scale_scores jsonb,                -- all 26 scales with raw, pct, band
  gap_scale text,                    -- lowest-scoring scale (the growth focus)
  strength_scale text,               -- highest-scoring scale
  completed_at timestamptz default now()
);
alter table keystone_results enable row level security;
create policy "own keystone results read" on keystone_results for select using (user_id = auth.uid());
create policy "own keystone results insert" on keystone_results for insert with check (user_id = auth.uid());

-- Keep updated_at fresh on session writes.
create or replace function public.touch_keystone_session()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_keystone on keystone_sessions;
create trigger trg_touch_keystone before update on keystone_sessions
  for each row execute function public.touch_keystone_session();
