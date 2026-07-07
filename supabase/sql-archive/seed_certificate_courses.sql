-- Fathers.com: seed certificate courses + enable self-enrollment.
-- Supports the program-code (free) enrollment flow. Safe to run more than once.

-- 1) The five certificate courses. $79 = 7900 cents.
insert into certificate_courses (slug, title, hours, price_cents) values
  ('fundamentals', 'Fathering Fundamentals',     10.0, 7900),
  ('coparenting',  'Co-Parenting After Divorce',  8.0, 7900),
  ('reentry',      'Reentry Fatherhood',         12.0, 7900),
  ('anger',        'Anger and Repair',            8.0, 7900),
  ('legacy',       'Legacy and Presence',         6.0, 7900)
on conflict (slug) do nothing;

-- 2) Record how a father enrolled (which program code, if any).
alter table certificate_enrollments add column if not exists coupon text;

-- 3) Let a signed-in father create his own enrollment.
--    NOTE: soft-launch policy. The program code is checked in the browser, so any
--    signed-in user can create a free enrollment. When real payment or restricted
--    access is added, move enrollment creation server-side and remove this policy.
drop policy if exists "self enroll" on certificate_enrollments;
create policy "self enroll" on certificate_enrollments
  for insert with check (user_id = auth.uid());
