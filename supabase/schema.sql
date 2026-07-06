-- ============================================================
-- Fathers.com : Supabase schema v1
-- Run in the Supabase SQL editor or via `supabase db push`.
-- RLS is enabled everywhere. Policies below are a working
-- baseline. Tighten before production traffic.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- identity ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  kids_ages text[] default '{}',          -- e.g. {'6-9','13-15'}
  faith_lens text default 'none',          -- none | christian | jewish | later
  timezone text default 'America/Chicago',
  created_at timestamptz default now()
);

create table notification_prefs (
  user_id uuid primary key references profiles on delete cascade,
  weekly_plan boolean default true,
  action_reminders boolean default true,
  new_classes boolean default true,
  circle_activity boolean default true,
  the_daily boolean default false
);

-- ---------- keystone profile ----------
create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  instrument_version text default 'demo-0',  -- replace when the validated instrument lands
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments on delete cascade,
  item_key text not null,                  -- kids | situation | time | goal | i1..i6 | faith
  value jsonb not null
);

create table baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  assessment_id uuid references assessments,
  involvement int, consistency int, awareness int, nurturance int,
  overall int,
  gap_domain text,
  taken_at timestamptz default now()
);

-- ---------- plan ----------
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  baseline_id uuid references baselines,
  starts_on date default current_date,
  weeks int default 12,
  status text default 'active'             -- active | paused | done
);

create table plan_actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans on delete cascade,
  week int not null,
  kind text not null check (kind in ('lesson','action')),
  title text not null,
  domain text,                             -- Involvement | Consistency | Awareness | Nurturance
  lesson_id uuid,                          -- when kind = lesson
  sort int default 0
);

create table action_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  plan_action_id uuid references plan_actions on delete cascade,
  completed_at timestamptz default now(),
  note text,
  photo_url text
);

-- ---------- catalog ----------
create table classes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  instructor text not null,
  lesson_count int,
  runtime_minutes int,
  is_new boolean default false
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  num int not null,
  title text not null,
  duration_seconds int
);

create table lesson_progress (
  user_id uuid references profiles on delete cascade,
  lesson_id uuid references lessons on delete cascade,
  seconds int default 0,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  lesson_id uuid references lessons on delete cascade,
  at_seconds int,
  body text not null,
  created_at timestamptz default now()
);

-- ---------- stories ----------
create table stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subject_name text,
  collection text,                         -- Back From Combat | After the Sentence | Starting Over | The First Year
  runtime_minutes int
);

create table story_submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  season text, turn text, standard text,
  consent boolean default false,
  created_at timestamptz default now()
);

-- ---------- circles + orgs ----------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seats int default 25,
  renews_on date
);

create table org_admins (
  org_id uuid references orgs on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (org_id, user_id)
);

create table seats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs on delete cascade,
  email text not null,
  user_id uuid references profiles,
  invited_at timestamptz default now(),
  activated_at timestamptz
);

create table circles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs,
  name text not null,
  meet_dow int,                            -- 0-6
  meet_time time
);

create table circle_members (
  circle_id uuid references circles on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text default 'member' check (role in ('member','leader')),
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);

create table circle_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles on delete cascade,
  user_id uuid references profiles on delete cascade,
  body text not null,
  reported boolean default false,
  created_at timestamptz default now()
);

-- ---------- certificates ----------
create table certificate_courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  hours numeric(4,1) not null,
  price_cents int not null                 -- placeholder pricing pending jurisdiction interviews
);

create table certificate_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  course_id uuid references certificate_courses,
  id_verified_at timestamptz,
  seconds_logged int default 0,
  passed_final boolean default false,
  status text default 'active'             -- active | issued | expired
);

-- Issued ONLY server side (service role) after requirements are met.
create table certificates (
  id uuid primary key default gen_random_uuid(),
  serial text unique not null,             -- FC-2026-004317
  enrollment_id uuid references certificate_enrollments,
  recipient_display text not null,         -- 'Marcus T.' first name, last initial
  course_title text not null,
  hours numeric(4,1) not null,
  issued_at timestamptz default now(),
  revoked boolean default false
);

-- ---------- commerce ----------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  status text default 'active',            -- active | paused | canceled
  price_cents int default 12000,           -- placeholder pending pricing interviews
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text
);

create table gifts (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  to_name text, from_name text, message text,
  deliver_on date,
  method text default 'email',             -- email | printable
  claimed_by uuid references profiles,
  claimed_at timestamptz,
  created_at timestamptz default now()
);

create table sponsorships (
  id uuid primary key default gen_random_uuid(),
  donor_email text not null,
  amount_cents int not null,
  monthly boolean default false,
  seats int default 1,
  created_at timestamptz default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  template text not null,
  to_email text not null,
  resend_id text,
  sent_at timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table profiles enable row level security;
alter table notification_prefs enable row level security;
alter table assessments enable row level security;
alter table assessment_answers enable row level security;
alter table baselines enable row level security;
alter table plans enable row level security;
alter table plan_actions enable row level security;
alter table action_completions enable row level security;
alter table classes enable row level security;
alter table lessons enable row level security;
alter table lesson_progress enable row level security;
alter table notes enable row level security;
alter table stories enable row level security;
alter table story_submissions enable row level security;
alter table orgs enable row level security;
alter table org_admins enable row level security;
alter table seats enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table circle_posts enable row level security;
alter table certificate_courses enable row level security;
alter table certificate_enrollments enable row level security;
alter table certificates enable row level security;
alter table subscriptions enable row level security;
alter table gifts enable row level security;
alter table sponsorships enable row level security;
alter table email_events enable row level security;

-- Own-row access for personal tables
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own prefs" on notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own assessments" on assessments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own answers" on assessment_answers for all
  using (exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid()))
  with check (exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid()));
create policy "own baselines" on baselines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plans" on plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plan actions" on plan_actions for select
  using (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "own completions" on action_completions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes" on notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own enrollments" on certificate_enrollments for select using (user_id = auth.uid());
create policy "own subscription" on subscriptions for select using (user_id = auth.uid());

-- Public catalog reads
create policy "public classes" on classes for select using (true);
create policy "public lessons" on lessons for select using (true);
create policy "public stories" on stories for select using (true);
create policy "public cert courses" on certificate_courses for select using (true);

-- Anonymous story submissions (write only)
create policy "anyone can submit a story" on story_submissions for insert with check (true);

-- Circles: members read and post in their own circle
create policy "circle members read" on circle_posts for select
  using (exists (select 1 from circle_members m where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()));
create policy "circle members post" on circle_posts for insert
  with check (user_id = auth.uid() and exists (select 1 from circle_members m where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()));
create policy "see own memberships" on circle_members for select using (user_id = auth.uid());
create policy "members see their circle" on circles for select
  using (exists (select 1 from circle_members m where m.circle_id = circles.id and m.user_id = auth.uid()));

-- Org admins: participation only. Baselines and answers stay invisible by design.
create policy "admins see their org" on orgs for select
  using (exists (select 1 from org_admins oa where oa.org_id = orgs.id and oa.user_id = auth.uid()));
create policy "admins see seats" on seats for select
  using (exists (select 1 from org_admins oa where oa.org_id = seats.org_id and oa.user_id = auth.uid()));
create policy "admins see own row" on org_admins for select using (user_id = auth.uid());

-- Certificates: base table locked to service role. Public verification goes
-- through a limited view, matching the verify.html contract.
create view public_certificates as
  select serial, recipient_display, course_title, hours, issued_at
  from certificates where revoked = false;
grant select on public_certificates to anon, authenticated;

-- ============================================================
-- Seed : launch catalog + demo certificates (match verify.html)
-- ============================================================
insert into classes (slug, title, instructor, lesson_count, runtime_minutes, is_new) values
 ('fundamentals','The Fundamentals of Fathering','Dr. Ken Canfield',12,130,true),
 ('daughters','Fathering Daughters','TBD instructor',12,118,false),
 ('sons','Fathering Sons','TBD instructor',11,109,false),
 ('teens','Raising Teens','TBD instructor',13,126,false),
 ('first-five','The First Five Years','TBD instructor',10,98,false),
 ('after-divorce','Fathering After Divorce','TBD instructor',11,111,false),
 ('stepfathers','Stepfathers and Blended Families','TBD instructor',10,102,false),
 ('coming-home','Coming Home Present','Ray M.',10,104,false),
 ('grandfathering','Grandfathering','Dr. Ken Canfield',9,82,false);

insert into certificate_courses (slug, title, hours, price_cents) values
 ('fundamentals-cert','Fathering Fundamentals Certificate',10.0,7900),
 ('coparenting-cert','Co-Parenting After Divorce Certificate',8.0,7900),
 ('reentry-cert','Reentry Fatherhood Certificate',12.0,7900),
 ('anger-repair-cert','Anger and Repair Certificate',8.0,7900);

insert into certificates (serial, recipient_display, course_title, hours, issued_at) values
 ('FC-2026-004317','Marcus T.','Fathering Fundamentals Certificate',10.0,'2026-06-02'),
 ('FC-2026-001882','Ray M.','Reentry Fatherhood Certificate',12.0,'2026-04-18');

-- ============================================================
-- v1.1 : live launch additions
-- ============================================================

-- Lesson video sources: YouTube embed URL, Vimeo embed URL, or direct mp4.
alter table lessons add column if not exists video_url text;

-- One inbox for every public form: groups, employers, veterans, newsletter, try-a-class.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  email text,
  payload jsonb,
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "anyone can submit a lead" on leads for insert with check (true);

-- The client creates the plan rows after Keystone; allow inserts on own plan.
create policy "insert own plan actions" on plan_actions for insert
  with check (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));

-- Auto-provision profile + prefs on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  insert into public.notification_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
