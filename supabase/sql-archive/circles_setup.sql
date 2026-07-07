-- Fathers.com: make Circles real. Posts, replies, join, report. Safe to run more than once.

-- 1) A reply is a post with a parent.
alter table circle_posts add column if not exists parent_id uuid references circle_posts on delete cascade;

-- 2) Let a signed-in father browse circles (needed to find one to join).
drop policy if exists "browse circles" on circles;
create policy "browse circles" on circles for select using (auth.uid() is not null);

-- 3) Let a father join a circle himself (soft-launch: open join).
drop policy if exists "self join circle" on circle_members;
create policy "self join circle" on circle_members for insert
  with check (user_id = auth.uid());

-- 4) Let a member flag a post in his circle (used for Report).
drop policy if exists "members flag posts" on circle_posts;
create policy "members flag posts" on circle_posts for update
  using (exists (select 1 from circle_members m where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()))
  with check (exists (select 1 from circle_members m where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()));

-- 5) A default circle for the soft launch, if none exists.
insert into circles (name, meet_dow, meet_time)
select 'Living Hope Men', 2, '06:00'
where not exists (select 1 from circles);
