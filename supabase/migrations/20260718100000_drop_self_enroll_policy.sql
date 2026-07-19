-- ============================================================================
-- Keystone v4.0 follow-up | Close the soft-launch enrollment hole.
-- ============================================================================
-- The archived seed (sql-archive/seed_certificate_courses.sql) created an
-- INSERT policy letting any signed-in user create his own enrollment, because
-- back then the program code was checked in the browser. v4.0 moved the gate
-- server side: the checkout edge function verifies the claim and inserts with
-- the service role, which bypasses RLS. A client-side insert path is now a
-- hole around the door, so it closes.
--
-- Safety: no shipped client inserts into certificate_enrollments. The
-- coursework heartbeat only selects and updates. Re-runnable.

drop policy if exists "self enroll" on public.certificate_enrollments;

-- VERIFY. Expect: 0.
select count(*) as self_enroll_policy_0_expected
  from pg_policies
 where schemaname = 'public'
   and tablename  = 'certificate_enrollments'
   and policyname = 'self enroll';
