-- ============================================================
-- Fathers.com : RBAC + authoring layer (schema v2)
-- Run AFTER schema.sql. This is the permission spine.
-- Every privileged action is gated here, at the database,
-- so the UI cannot be the security boundary.
-- ============================================================

-- ---------- roles ----------
do $$ begin
  create type app_role as enum ('admin','instructor','content_reviewer','org_admin','circle_leader','member');
exception when duplicate_object then null; end $$;

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role app_role not null,
  org_id uuid references orgs on delete cascade,   -- scopes org_admin / circle_leader
  granted_by uuid references auth.users,
  granted_at timestamptz default now(),
  unique (user_id, role, org_id)
);
alter table user_roles enable row level security;

-- SECURITY DEFINER helpers. Marked STABLE, fixed search_path.
-- These are the only way policies test roles, so they cannot recurse into RLS.
create or replace function public.has_role(_role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = _role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_author()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','instructor'));
$$;

create or replace function public.leads_org(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and org_id = _org and role in ('admin','org_admin','circle_leader')
  ) or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.admins_org(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and org_id = _org and role = 'org_admin'
  ) or public.is_admin();
$$;

-- user_roles policies: you can read your own roles; only admins mutate.
create policy "read own roles" on user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy "admin grants roles" on user_roles for insert with check (public.is_admin());
create policy "admin revokes roles" on user_roles for delete using (public.is_admin());

-- Admins can read every profile (for the admin console).
create policy "admin reads all profiles" on profiles for select using (public.is_admin());

-- ---------- authoring: classes & lessons ----------
-- Extend catalog with authoring/publish state.
alter table classes add column if not exists description text;
alter table classes add column if not exists summary text;
alter table classes add column if not exists published boolean default false;
alter table classes add column if not exists author_id uuid references auth.users;
alter table classes add column if not exists drip_weekly boolean default false;  -- lessons unlock by week
alter table classes add column if not exists created_at timestamptz default now();

alter table lessons add column if not exists body text;                 -- rich lesson notes (html)
alter table lessons add column if not exists vimeo_id text;             -- numeric Vimeo id
alter table lessons add column if not exists workbook_url text;         -- PDF in storage
alter table lessons add column if not exists unlock_week int;           -- for drip
alter table lessons add column if not exists published boolean default true;

-- Replace the blanket public-read policies with published-only for members,
-- full access for the author and admins.
drop policy if exists "public classes" on classes;
drop policy if exists "public lessons" on lessons;

create policy "read published or own classes" on classes for select
  using (published = true or author_id = auth.uid() or public.can_author());
create policy "authors insert classes" on classes for insert
  with check (public.can_author() and author_id = auth.uid());
create policy "authors update own classes" on classes for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "authors delete own classes" on classes for delete
  using (author_id = auth.uid() or public.is_admin());

create policy "read lessons of visible classes" on lessons for select
  using (exists (select 1 from classes c where c.id = class_id
    and (c.published = true or c.author_id = auth.uid() or public.can_author())));
create policy "authors write lessons" on lessons for all
  using (exists (select 1 from classes c where c.id = class_id and (c.author_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from classes c where c.id = class_id and (c.author_id = auth.uid() or public.is_admin())));

-- ---------- assessment instrument builder ----------
-- A versioned, auditable instrument. Items, scales, domains, weights, formula.
create table if not exists instruments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  version int default 1,
  status text default 'draft' check (status in ('draft','published','retired')),
  scoring text default 'weighted_mean' check (scoring in ('weighted_mean','sum','mean')),
  author_id uuid references auth.users,
  created_at timestamptz default now(),
  published_at timestamptz
);

create table if not exists instrument_domains (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid references instruments on delete cascade,
  key text not null,                 -- e.g. involvement
  label text not null,
  weight numeric(5,2) default 1.0,   -- domain weight in overall score
  sort int default 0
);

create table if not exists instrument_items (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid references instruments on delete cascade,
  domain_id uuid references instrument_domains on delete set null,
  prompt text not null,
  kind text default 'likert5' check (kind in ('likert5','likert7','binary','choice')),
  choices jsonb,                     -- for kind = choice
  reverse boolean default false,     -- reverse-scored item
  weight numeric(5,2) default 1.0,   -- item weight within its domain
  sort int default 0
);

-- Per-band interpretation text (Strong / Solid / etc) authored per instrument.
create table if not exists instrument_bands (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid references instruments on delete cascade,
  min_score int not null,
  max_score int not null,
  label text not null,
  blurb text
);

-- Responses are immutable once written -> auditable.
create table if not exists instrument_responses (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid references instruments,
  instrument_version int,
  user_id uuid references auth.users on delete cascade,
  submitted_at timestamptz default now(),
  overall numeric(6,2),
  domain_scores jsonb,               -- {involvement: 78, ...}
  gap_domain text
);
create table if not exists instrument_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references instrument_responses on delete cascade,
  item_id uuid references instrument_items,
  raw_value numeric(6,2) not null
);

alter table instruments enable row level security;
alter table instrument_domains enable row level security;
alter table instrument_items enable row level security;
alter table instrument_bands enable row level security;
alter table instrument_responses enable row level security;
alter table instrument_answers enable row level security;

-- Members see published instruments; authors see their own drafts.
create policy "read published instruments" on instruments for select
  using (status = 'published' or author_id = auth.uid() or public.can_author());
create policy "authors write instruments" on instruments for all
  using (author_id = auth.uid() or public.is_admin())
  with check ((author_id = auth.uid() and public.can_author()) or public.is_admin());

-- Instrument children readable when parent is; writable by author.
create policy "read instrument domains" on instrument_domains for select
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.status='published' or i.author_id=auth.uid() or public.can_author())));
create policy "write instrument domains" on instrument_domains for all
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())))
  with check (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())));
create policy "read instrument items" on instrument_items for select
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.status='published' or i.author_id=auth.uid() or public.can_author())));
create policy "write instrument items" on instrument_items for all
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())))
  with check (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())));
create policy "read instrument bands" on instrument_bands for select
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.status='published' or i.author_id=auth.uid() or public.can_author())));
create policy "write instrument bands" on instrument_bands for all
  using (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())))
  with check (exists (select 1 from instruments i where i.id = instrument_id and (i.author_id=auth.uid() or public.is_admin())));

-- Responses: a member writes and reads only their own. No update/delete -> immutable audit trail.
create policy "own responses read" on instrument_responses for select using (user_id = auth.uid());
create policy "own responses insert" on instrument_responses for insert with check (user_id = auth.uid());
create policy "own answers read" on instrument_answers for select
  using (exists (select 1 from instrument_responses r where r.id = response_id and r.user_id = auth.uid()));
create policy "own answers insert" on instrument_answers for insert
  with check (exists (select 1 from instrument_responses r where r.id = response_id and r.user_id = auth.uid()));

-- ---------- org roster + participation (privacy-safe) ----------
-- org_members links a member to an org via a claimed seat.
alter table seats add column if not exists role_note text;

-- Participation view: counts only. Never exposes answers or scores.
create or replace view org_participation as
  select
    s.org_id,
    s.email,
    s.user_id,
    (s.activated_at is not null) as activated,
    exists (select 1 from instrument_responses r where r.user_id = s.user_id) as took_baseline,
    (select count(*) from lesson_progress lp where lp.user_id = s.user_id and lp.completed) as lessons_done,
    (select max(lp.updated_at) from lesson_progress lp where lp.user_id = s.user_id) as last_active
  from seats s;
-- View inherits invoker rights; underlying seats policy gates org visibility.
create policy "org leaders read seats" on seats for select using (public.leads_org(org_id));
create policy "org admins write seats" on seats for all using (public.admins_org(org_id)) with check (public.admins_org(org_id));
grant select on org_participation to authenticated;

-- ---------- circles: leader authoring + member visibility ----------
create policy "leaders write circles" on circles for all
  using (org_id is null or public.leads_org(org_id))
  with check (org_id is null or public.leads_org(org_id));

-- Circle announcements (leader -> cohort), distinct from threaded posts.
create table if not exists circle_announcements (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles on delete cascade,
  author_id uuid references auth.users,
  body text not null,
  created_at timestamptz default now()
);
alter table circle_announcements enable row level security;
create policy "members read announcements" on circle_announcements for select
  using (exists (select 1 from circle_members m where m.circle_id = circle_announcements.circle_id and m.user_id = auth.uid()));
create policy "leaders post announcements" on circle_announcements for insert
  with check (exists (select 1 from circle_members m where m.circle_id = circle_announcements.circle_id and m.user_id = auth.uid() and m.role = 'leader') or public.is_admin());

-- Let leaders moderate (delete) posts in their circle.
create policy "leaders moderate posts" on circle_posts for delete
  using (exists (select 1 from circle_members m where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid() and m.role='leader') or public.is_admin());

-- Circle weekly plan authored by leader (film + question + action).
create table if not exists circle_weeks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles on delete cascade,
  week int not null,
  class_slug text,
  lesson_num int,
  question text,
  action text,
  meets_on date
);
alter table circle_weeks enable row level security;
create policy "members read circle weeks" on circle_weeks for select
  using (exists (select 1 from circle_members m where m.circle_id = circle_weeks.circle_id and m.user_id = auth.uid()));
create policy "leaders write circle weeks" on circle_weeks for all
  using (exists (select 1 from circle_members m where m.circle_id = circle_weeks.circle_id and m.user_id = auth.uid() and m.role='leader') or public.is_admin())
  with check (exists (select 1 from circle_members m where m.circle_id = circle_weeks.circle_id and m.user_id = auth.uid() and m.role='leader') or public.is_admin());

-- ---------- certificate issuance via authenticated author, audited ----------
-- Admins/instructors may issue a certificate to a member. Serial auto-generated.
create or replace function public.issue_certificate(_enrollment uuid, _display text, _course text, _hours numeric)
returns text language plpgsql security definer set search_path = public as $$
declare _serial text;
begin
  if not public.can_author() then raise exception 'not authorized'; end if;
  _serial := 'FC-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*900000)+100000)::text, 6, '0');
  insert into certificates (serial, enrollment_id, recipient_display, course_title, hours)
    values (_serial, _enrollment, _display, _course, _hours);
  return _serial;
end $$;

-- ---------- audit log ----------
create table if not exists audit_log (
  id bigserial primary key,
  actor uuid references auth.users,
  action text not null,
  target text,
  detail jsonb,
  at timestamptz default now()
);
alter table audit_log enable row level security;
create policy "admin reads audit" on audit_log for select using (public.is_admin());
create policy "any writes audit" on audit_log for insert with check (auth.uid() is not null);

-- ---------- bootstrap first admin ----------
-- After first sign-in, run ONCE in the SQL editor, replacing the email:
--   insert into user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@fathers.com';

-- ============================================================
-- Seed: a starter Keystone instrument (DRAFT).
-- Structure is real; the WEIGHTS AND BANDS are placeholders.
-- An instructor opens it in Studio, sets the validated weights
-- and cut scores from the Keystone valuation document, then
-- publishes. Publishing is what makes it live to members.
-- ============================================================
do $$
declare _iid uuid; _inv uuid; _con uuid; _awa uuid; _nur uuid;
begin
  insert into instruments (slug, title, description, status, scoring)
    values ('keystone-father-profile','The Keystone Father Profile',
            'Measures four domains of fathering presence: Involvement, Consistency, Awareness, Nurturance.',
            'draft','weighted_mean')
    returning id into _iid;

  insert into instrument_domains (instrument_id, key, label, weight, sort) values
    (_iid,'involvement','Involvement',1.0,0) returning id into _inv;
  insert into instrument_domains (instrument_id, key, label, weight, sort) values
    (_iid,'consistency','Consistency',1.0,1) returning id into _con;
  insert into instrument_domains (instrument_id, key, label, weight, sort) values
    (_iid,'awareness','Awareness',1.0,2) returning id into _awa;
  insert into instrument_domains (instrument_id, key, label, weight, sort) values
    (_iid,'nurturance','Nurturance',1.0,3) returning id into _nur;

  insert into instrument_items (instrument_id, domain_id, prompt, kind, weight, sort) values
    (_iid,_inv,'I spend focused one-on-one time with each of my kids every week.','likert5',1,0),
    (_iid,_inv,'I know the names of my kids'' closest friends.','likert5',1,1),
    (_iid,_con,'My kids can predict when they will next see me.','likert5',1,2),
    (_iid,_con,'I keep the commitments I make to my kids.','likert5',1,3),
    (_iid,_awa,'I notice mood changes in my kids before they say anything.','likert5',1,4),
    (_iid,_awa,'I know what my kids are worried about right now.','likert5',1,5),
    (_iid,_nur,'My kids hear me say what I value, not just what I forbid.','likert5',1,6),
    (_iid,_nur,'When I get it wrong with my kids, I go back and repair it.','likert5',1,7);

  insert into instrument_bands (instrument_id, min_score, max_score, label, blurb) values
    (_iid,0,49,'A starting point.','Real work ahead, and a clear place to begin.'),
    (_iid,50,69,'Workable. Gaps.','A solid base with specific gaps to close.'),
    (_iid,70,84,'Solid. Uneven.','Strong in places, uneven in others.'),
    (_iid,85,100,'Strong.','Consistent presence across the board.');
end $$;
