-- Super-admin intake for researcher-authored assessments.
-- Stores the person, rights, question outline, and a declarative scoring key.
-- Opening a draft compiles those into platform_assessments.instrument.
-- Fathers take a sourced instrument only after a later delivery path is wired.
-- Release to Leaders still requires rights_status = cleared.
--
-- Pilot already has public.platform_assessments from the unused sandbox
-- (20260818154055). CREATE TABLE IF NOT EXISTS cannot add columns, so this
-- migration alters that table in place and only creates it on a fresh database.

create table if not exists public.assessment_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  channel_url text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_sources_name_check
    check (char_length(btrim(name)) >= 1 and char_length(name) <= 120),
  constraint assessment_sources_contact_name_check
    check (
      contact_name is null
      or (char_length(btrim(contact_name)) >= 1 and char_length(contact_name) <= 120)
    ),
  constraint assessment_sources_contact_email_check
    check (
      contact_email is null
      or (char_length(btrim(contact_email)) >= 3 and char_length(contact_email) <= 200)
    ),
  constraint assessment_sources_channel_url_check
    check (
      channel_url is null
      or (char_length(btrim(channel_url)) >= 8 and char_length(channel_url) <= 500)
    ),
  constraint assessment_sources_notes_check
    check (notes is null or char_length(notes) <= 2000)
);

comment on table public.assessment_sources is
  'Researchers or groups Super-admin is bringing an instrument from. Admin-only.';

create table if not exists public.platform_assessments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  assessment_key text not null unique,
  title text not null,
  description text,
  attribution text,
  instrument jsonb,
  development_status text not null default 'draft',
  scoring_method text not null default 'weighted_mean',
  scale_min integer not null default 1,
  scale_max integer not null default 5,
  published boolean not null default false,
  archived boolean not null default false,
  last_edited_at timestamptz default now(),
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  intake_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_assessments_slug_check
    check (
      char_length(btrim(slug)) >= 3
      and char_length(slug) <= 32
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and slug <> 'keystone'
    ),
  constraint platform_assessments_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
      and assessment_key <> 'keystone'
    ),
  constraint platform_assessments_title_check
    check (char_length(btrim(title)) >= 1 and char_length(title) <= 200),
  constraint platform_assessments_description_check
    check (description is null or char_length(description) <= 2000),
  constraint platform_assessments_attribution_check
    check (
      attribution is null
      or (char_length(btrim(attribution)) >= 1 and char_length(attribution) <= 120)
    ),
  constraint platform_assessments_status_check
    check (
      development_status in (
        'draft',
        'in_development',
        'ready_for_review',
        'released',
        'archived'
      )
    ),
  constraint platform_assessments_scoring_check
    check (scoring_method = 'weighted_mean'),
  constraint platform_assessments_scale_check
    check (scale_min = 1 and scale_max = 5)
);

comment on table public.platform_assessments is
  'Catalog instruments besides Keystone. instrument jsonb is the compiled questions plus scoring key.';

alter table public.platform_assessments
  add column if not exists slug text;
alter table public.platform_assessments
  add column if not exists assessment_key text;
alter table public.platform_assessments
  add column if not exists title text;
alter table public.platform_assessments
  add column if not exists description text;
alter table public.platform_assessments
  add column if not exists attribution text;
alter table public.platform_assessments
  add column if not exists instrument jsonb;
alter table public.platform_assessments
  add column if not exists development_status text;
alter table public.platform_assessments
  add column if not exists scoring_method text;
alter table public.platform_assessments
  add column if not exists scale_min integer;
alter table public.platform_assessments
  add column if not exists scale_max integer;
alter table public.platform_assessments
  add column if not exists published boolean;
alter table public.platform_assessments
  add column if not exists archived boolean;
alter table public.platform_assessments
  add column if not exists last_edited_at timestamptz;
alter table public.platform_assessments
  add column if not exists last_edited_by uuid;
alter table public.platform_assessments
  add column if not exists created_by uuid;
alter table public.platform_assessments
  add column if not exists intake_id uuid;
alter table public.platform_assessments
  add column if not exists created_at timestamptz;
alter table public.platform_assessments
  add column if not exists updated_at timestamptz;

update public.platform_assessments
set archived = false
where archived is null;

alter table public.platform_assessments
  alter column archived set default false;
alter table public.platform_assessments
  alter column archived set not null;

alter table public.platform_assessments
  drop constraint if exists platform_assessments_title_check;
alter table public.platform_assessments
  add constraint platform_assessments_title_check
  check (char_length(btrim(title)) >= 1 and char_length(title) <= 200);

alter table public.platform_assessments
  drop constraint if exists platform_assessments_attribution_check;
alter table public.platform_assessments
  add constraint platform_assessments_attribution_check
  check (
    attribution is null
    or (char_length(btrim(attribution)) >= 1 and char_length(attribution) <= 120)
  );

create table if not exists public.assessment_intakes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.assessment_sources (id) on delete cascade,
  platform_assessment_id uuid unique references public.platform_assessments (id) on delete set null,
  title text not null,
  audience text,
  description text,
  questions text,
  scoring text,
  rights_status text not null default 'inquiry',
  rights_notes text,
  status text not null default 'open',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_intakes_title_check
    check (char_length(btrim(title)) >= 1 and char_length(title) <= 200),
  constraint assessment_intakes_audience_check
    check (
      audience is null
      or (char_length(btrim(audience)) >= 1 and char_length(audience) <= 200)
    ),
  constraint assessment_intakes_description_check
    check (description is null or char_length(description) <= 2000),
  constraint assessment_intakes_questions_check
    check (questions is null or char_length(questions) <= 12000),
  constraint assessment_intakes_scoring_check
    check (scoring is null or char_length(scoring) <= 4000),
  constraint assessment_intakes_rights_status_check
    check (rights_status in ('inquiry', 'pending', 'cleared', 'declined')),
  constraint assessment_intakes_rights_notes_check
    check (rights_notes is null or char_length(rights_notes) <= 2000),
  constraint assessment_intakes_status_check
    check (status in ('open', 'drafting', 'released', 'archived'))
);

comment on table public.assessment_intakes is
  'One proposed instrument from a researcher. Compiles to platform_assessments when a sandbox draft opens.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_assessments_intake_fk'
  ) then
    alter table public.platform_assessments
      add constraint platform_assessments_intake_fk
      foreign key (intake_id) references public.assessment_intakes (id) on delete set null;
  end if;
end
$$;

create index if not exists assessment_sources_name_idx
  on public.assessment_sources (lower(name));
create index if not exists assessment_intakes_source_idx
  on public.assessment_intakes (source_id, created_at desc);
create index if not exists assessment_intakes_status_idx
  on public.assessment_intakes (status, created_at desc);
create index if not exists platform_assessments_status_idx
  on public.platform_assessments (archived, last_edited_at desc);

create or replace function internal.touch_assessment_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function internal.touch_assessment_intake()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists assessment_sources_touch on public.assessment_sources;
create trigger assessment_sources_touch
  before update on public.assessment_sources
  for each row
  execute function internal.touch_assessment_source();

drop trigger if exists assessment_intakes_touch on public.assessment_intakes;
create trigger assessment_intakes_touch
  before update on public.assessment_intakes
  for each row
  execute function internal.touch_assessment_intake();

revoke all on function internal.touch_assessment_source()
  from public, anon, authenticated;
revoke all on function internal.touch_assessment_intake()
  from public, anon, authenticated;
grant execute on function internal.touch_assessment_source() to service_role;
grant execute on function internal.touch_assessment_intake() to service_role;

alter table public.assessment_sources enable row level security;
alter table public.assessment_sources force row level security;
alter table public.assessment_intakes enable row level security;
alter table public.assessment_intakes force row level security;
alter table public.platform_assessments enable row level security;
alter table public.platform_assessments force row level security;

grant select, insert, update, delete on public.assessment_sources
  to authenticated, service_role;
grant select, insert, update, delete on public.assessment_intakes
  to authenticated, service_role;
grant select, insert, update, delete on public.platform_assessments
  to authenticated, service_role;
revoke truncate on public.assessment_sources from anon, authenticated;
revoke truncate on public.assessment_intakes from anon, authenticated;
revoke truncate on public.platform_assessments from anon, authenticated;

drop policy if exists assessment_sources_admin_all on public.assessment_sources;
create policy assessment_sources_admin_all
on public.assessment_sources
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists assessment_intakes_admin_all on public.assessment_intakes;
create policy assessment_intakes_admin_all
on public.assessment_intakes
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessments_admin_all on public.platform_assessments;
create policy platform_assessments_admin_all
on public.platform_assessments
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));
