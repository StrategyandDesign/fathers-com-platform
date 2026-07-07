-- Fathers.com: certificate accountability model. Safe to run more than once.
-- Videos with known length, watch tracking, per-video checks, a final Q&A,
-- and an admin-approved award the father then e-signs. Admin authors content.

-- 0) Draft/publish flag on courses (admins build, then publish).
alter table certificate_courses add column if not exists published boolean default false;

-- ---------- admin helper (used across policies) ----------
-- A user is an admin if they hold the 'admin' role.

-- 1) Videos in a certificate course. Admin sets order, title, and true length.
create table if not exists course_videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references certificate_courses on delete cascade,
  ord int not null default 1,
  title text not null,
  video_url text,
  duration_seconds int not null default 0,   -- the known length, so we can tell if it was watched
  created_at timestamptz default now()
);

-- 2) How much of each video a father has actually watched.
create table if not exists video_progress (
  user_id uuid references profiles on delete cascade,
  video_id uuid references course_videos on delete cascade,
  watched_seconds int not null default 0,
  completed boolean not null default false,   -- set when watched_seconds >= duration threshold
  updated_at timestamptz default now(),
  primary key (user_id, video_id)
);

-- 3) The check after each video (the UI calls this a Debrief, not a quiz). Admin authors.
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references course_videos on delete cascade,
  ord int not null default 1,
  prompt text not null,
  choices jsonb not null default '[]',        -- ["A","B","C","D"]
  correct_index int not null default 0
);

create table if not exists quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  question_id uuid references quiz_questions on delete cascade,
  chosen_index int,
  correct boolean,
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

-- 4) The longform Q&A after the last video. Admin authors the prompts.
create table if not exists final_qa_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references certificate_courses on delete cascade,
  ord int not null default 1,
  prompt text not null
);

create table if not exists final_qa_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  question_id uuid references final_qa_questions on delete cascade,
  answer_text text,
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

-- 5) The award. Admin approves; the father then self-signs via the e-sign bridge.
create table if not exists certificate_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  course_id uuid references certificate_courses on delete cascade,
  status text not null default 'in_progress',   -- in_progress | submitted | approved | denied | signed
  approved_by uuid references profiles,
  approved_at timestamptz,
  envelope_id text,                              -- set by the e-sign bridge after signing
  signed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, course_id)
);

-- ---------- RLS ----------
alter table course_videos enable row level security;
alter table video_progress enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_responses enable row level security;
alter table final_qa_questions enable row level security;
alter table final_qa_responses enable row level security;
alter table certificate_awards enable row level security;

-- Course structure (videos, questions, prompts): any signed-in father can read.
-- Admins can write. (Answers are never exposed by these reads on the client;
-- correct_index is only used server-side / by admin. Tighten later if needed.)
drop policy if exists "read videos" on course_videos;
create policy "read videos" on course_videos for select using (auth.uid() is not null);
drop policy if exists "admin write videos" on course_videos;
create policy "admin write videos" on course_videos for all
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

drop policy if exists "read questions" on quiz_questions;
create policy "read questions" on quiz_questions for select using (auth.uid() is not null);
drop policy if exists "admin write questions" on quiz_questions;
create policy "admin write questions" on quiz_questions for all
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

drop policy if exists "read qa" on final_qa_questions;
create policy "read qa" on final_qa_questions for select using (auth.uid() is not null);
drop policy if exists "admin write qa" on final_qa_questions;
create policy "admin write qa" on final_qa_questions for all
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- A father's own progress and answers.
drop policy if exists "own progress" on video_progress;
create policy "own progress" on video_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own quiz responses" on quiz_responses;
create policy "own quiz responses" on quiz_responses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own qa responses" on final_qa_responses;
create policy "own qa responses" on final_qa_responses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Awards: a father reads and starts/submits his own; an admin reads all and approves.
drop policy if exists "own award read" on certificate_awards;
create policy "own award read" on certificate_awards for select
  using (user_id = auth.uid() or exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
drop policy if exists "own award start" on certificate_awards;
create policy "own award start" on certificate_awards for insert
  with check (user_id = auth.uid());
drop policy if exists "own award submit" on certificate_awards;
create policy "own award submit" on certificate_awards for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin approve award" on certificate_awards;
create policy "admin approve award" on certificate_awards for update
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
