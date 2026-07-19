-- ============================================================================
-- Keystone v4.0 | Reposition: participants free, certification registry,
-- program codes as cohort links. Companion to POSITIONING.md and the v4.0
-- site build. Safe and re-runnable.
-- ============================================================================
-- What this changes and why:
--
--   1. PARTICIPANT COURSES GO TO $0. The checkout edge function reads price
--      truth from certificate_courses.price_cents; the site now says Free.
--      This makes it true. No edge function changes are required: at a zero
--      price, checkout's existing free path fulfills every enrollment and the
--      requires_payment branch goes dark for participant courses. Priced
--      professional rows (the facilitator course, $349 launch) remain possible
--      later. Policy: participant-facing rows are always 0.
--
--   2. CLAIMS REPLACE CODES. A participant can only enroll in a course when an
--      active claim exists for him, placed by a Certified Facilitator or a
--      Certified Organization (POSITIONING.md 3). participant_claims is that
--      gate: the checkout function matches on user_id or sign-in email, and
--      enrollments carry claim_id so completions roll up to the cohort the
--      Efficacy Report aggregates. The old coupons machinery is not created
--      and is no longer read anywhere; hand-made coupon tables in production
--      can sit inert or be dropped at the owner's discretion.
--
--   3. THE CERTIFICATION REGISTRY GETS ITS TABLES. organization_certifications
--      and facilitator_credentials, with public verification views that mirror
--      the public_certificates contract. A registry only means something if
--      names can come off it, so suspended and revoked rows stay VISIBLE in
--      the public views with their status. Serial conventions:
--      NCF-O-2026-#### (organizations), NCF-F-2026-#### (facilitators).
--      Certificates of Completion keep FC-2026-######.
--
-- Dormant on purpose, per POSITIONING.md 5: profiles.served and the voice
-- tables. Nothing is dropped.

-- 1. PARTICIPANT PRICING --------------------------------------------------------
alter table public.certificate_courses alter column price_cents set default 0;
update public.certificate_courses set price_cents = 0;

-- 2. PARTICIPANT CLAIMS (the only door into a course) ---------------------------
create table if not exists public.participant_claims (
  id                   uuid primary key default gen_random_uuid(),
  participant_email    text not null,
  user_id              uuid references auth.users(id) on delete set null,
  facilitator_user_id  uuid references auth.users(id) on delete set null,
  org_id               uuid references public.orgs(id) on delete set null,
  circle_id            uuid,
  cohort_id            uuid references public.cohorts(id) on delete set null,
  status               text not null default 'active'
                       check (status in ('active','released')),
  created_at           timestamptz not null default now(),
  released_at          timestamptz
);
create index if not exists idx_claims_email on public.participant_claims(lower(participant_email)) where status = 'active';
create index if not exists idx_claims_user  on public.participant_claims(user_id) where status = 'active';
alter table public.participant_claims enable row level security;

-- Facilitators, org admins, and the registrar place and manage claims.
drop policy if exists claims_staff_insert on public.participant_claims;
create policy claims_staff_insert on public.participant_claims
  for insert with check (
    facilitator_user_id = auth.uid()
    and exists (select 1 from public.user_roles ur
                where ur.user_id = auth.uid()
                  and ur.role in ('circle_leader','org_admin','admin')));
drop policy if exists claims_staff_read on public.participant_claims;
create policy claims_staff_read on public.participant_claims
  for select using (facilitator_user_id = auth.uid());
drop policy if exists claims_staff_update on public.participant_claims;
create policy claims_staff_update on public.participant_claims
  for update using (facilitator_user_id = auth.uid());

-- A man can see his own claim, by account or by his sign-in email.
drop policy if exists claims_own_read on public.participant_claims;
create policy claims_own_read on public.participant_claims
  for select using (
    user_id = auth.uid()
    or lower(participant_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Enrollments record which claim admitted the man.
alter table public.certificate_enrollments
  add column if not exists claim_id uuid references public.participant_claims(id) on delete set null;

-- 2b. FIVE SESSIONS PER COURSE. The flagship film library entry reflects the
-- restructure (12 lessons consolidated into 5 sessions, ~85 minutes of film).
update public.classes set lesson_count = 5, runtime_minutes = 85
  where slug = 'fundamentals' and lesson_count is distinct from 5;

-- 3. THE CERTIFICATION REGISTRY -------------------------------------------------
create table if not exists public.organization_certifications (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.orgs(id) on delete set null,
  org_display    text not null,                       -- the public registry name
  serial         text not null unique,                -- NCF-O-2026-####
  status         text not null default 'active'
                 check (status in ('active','suspended','revoked','expired')),
  tier           text not null default 'site',
  issued_at      date not null default current_date,
  renews_at      date,
  revoked_reason text,
  created_at     timestamptz not null default now()
);
alter table public.organization_certifications enable row level security;
-- Registrar (service role) writes. Org admins may read their own certification
-- row; guarded because org_admins predates the migration baseline.
do $$ begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='org_admins') then
    drop policy if exists org_cert_admin_read on public.organization_certifications;
    create policy org_cert_admin_read on public.organization_certifications
      for select using (exists (
        select 1 from public.org_admins oa
        where oa.org_id = organization_certifications.org_id
          and oa.user_id = auth.uid()));
  end if;
end $$;

create table if not exists public.facilitator_credentials (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete set null,
  display_name         text not null,                 -- the public registry name
  serial               text not null unique,          -- NCF-F-2026-####
  status               text not null default 'active'
                       check (status in ('active','suspended','revoked','expired')),
  issued_at            date not null default current_date,
  renews_at            date,
  supervised_cohort_id uuid references public.cohorts(id) on delete set null,
  revoked_reason       text,
  created_at           timestamptz not null default now()
);
alter table public.facilitator_credentials enable row level security;
drop policy if exists facilitator_own_read on public.facilitator_credentials;
create policy facilitator_own_read on public.facilitator_credentials
  for select using (auth.uid() = user_id);

-- Public registry views: same contract as public_certificates. Status is
-- always exposed. Revocation hidden is revocation theater.
create or replace view public.public_facilitators as
  select serial, display_name, status, issued_at, renews_at
  from public.facilitator_credentials;
grant select on public.public_facilitators to anon, authenticated;

create or replace view public.public_certified_organizations as
  select serial, org_display, status, tier, issued_at, renews_at
  from public.organization_certifications;
grant select on public.public_certified_organizations to anon, authenticated;

-- 4. VERIFY. Expect: 0, 1, 1, 1, 1, 2. ------------------------------------------
select
  (select count(*) from public.certificate_courses where price_cents <> 0)  as priced_rows_0_expected,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='participant_claims')       as claims_1_expected,
  (select count(*) from information_schema.columns
     where table_name='certificate_enrollments' and column_name='claim_id') as claim_col_1_expected,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='facilitator_credentials')  as facilitators_1_expected,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='organization_certifications') as org_certs_1_expected,
  (select count(*) from information_schema.views
     where table_schema='public'
       and table_name in ('public_facilitators','public_certified_organizations')) as registry_views_2_expected;
