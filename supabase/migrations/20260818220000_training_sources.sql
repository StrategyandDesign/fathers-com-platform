-- Super-admin intake for trainings sourced outside the platform.
-- Does not scrape or import automatically. Super-admin records the person,
-- rights, and an outline, then opens a normal sandbox draft. Release still
-- uses the existing Ready → Publish → Release → Leader include/remove path.

alter table public.trainings
  add column if not exists attribution text;

comment on column public.trainings.attribution is
  'Public credit for an outside teacher. Shown to Leaders. Super-admin only edits.';

alter table public.trainings
  drop constraint if exists trainings_attribution_check;

alter table public.trainings
  add constraint trainings_attribution_check
  check (
    attribution is null
    or (char_length(btrim(attribution)) >= 1 and char_length(attribution) <= 120)
  );

create table if not exists public.training_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  channel_url text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_sources_name_check
    check (char_length(btrim(name)) >= 1 and char_length(name) <= 120),
  constraint training_sources_contact_name_check
    check (
      contact_name is null
      or (char_length(btrim(contact_name)) >= 1 and char_length(contact_name) <= 120)
    ),
  constraint training_sources_contact_email_check
    check (
      contact_email is null
      or (char_length(btrim(contact_email)) >= 3 and char_length(contact_email) <= 200)
    ),
  constraint training_sources_channel_url_check
    check (
      channel_url is null
      or (char_length(btrim(channel_url)) >= 8 and char_length(channel_url) <= 500)
    ),
  constraint training_sources_notes_check
    check (notes is null or char_length(notes) <= 2000)
);

comment on table public.training_sources is
  'Outside teachers or groups Super-admin is bringing work from. Admin-only.';

create table if not exists public.training_intakes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.training_sources (id) on delete cascade,
  training_id uuid unique references public.trainings (id) on delete set null,
  request_id uuid references public.training_requests (id) on delete set null,
  title text not null,
  audience text,
  outline text,
  rights_status text not null default 'inquiry',
  rights_notes text,
  status text not null default 'open',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_intakes_title_check
    check (char_length(btrim(title)) >= 1 and char_length(title) <= 200),
  constraint training_intakes_audience_check
    check (
      audience is null
      or (char_length(btrim(audience)) >= 1 and char_length(audience) <= 200)
    ),
  constraint training_intakes_outline_check
    check (outline is null or char_length(outline) <= 8000),
  constraint training_intakes_rights_status_check
    check (rights_status in ('inquiry', 'pending', 'cleared', 'declined')),
  constraint training_intakes_rights_notes_check
    check (rights_notes is null or char_length(rights_notes) <= 2000),
  constraint training_intakes_status_check
    check (status in ('open', 'drafting', 'released', 'archived'))
);

comment on table public.training_intakes is
  'One proposed training from an outside source. Becomes a sandbox draft, then follows the normal release path.';

comment on column public.training_intakes.rights_status is
  'inquiry, pending, cleared, or declined. Cleared is required before first release.';

create index if not exists training_sources_name_idx
  on public.training_sources (lower(name));

create index if not exists training_intakes_source_idx
  on public.training_intakes (source_id, created_at desc);

create index if not exists training_intakes_status_idx
  on public.training_intakes (status, created_at desc);

create or replace function internal.touch_training_source()
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

create or replace function internal.touch_training_intake()
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

drop trigger if exists training_sources_touch on public.training_sources;
create trigger training_sources_touch
  before update on public.training_sources
  for each row
  execute function internal.touch_training_source();

drop trigger if exists training_intakes_touch on public.training_intakes;
create trigger training_intakes_touch
  before update on public.training_intakes
  for each row
  execute function internal.touch_training_intake();

revoke all on function internal.touch_training_source()
  from public, anon, authenticated;
revoke all on function internal.touch_training_intake()
  from public, anon, authenticated;
grant execute on function internal.touch_training_source() to service_role;
grant execute on function internal.touch_training_intake() to service_role;

alter table public.training_sources enable row level security;
alter table public.training_sources force row level security;
alter table public.training_intakes enable row level security;
alter table public.training_intakes force row level security;

grant select, insert, update, delete on public.training_sources
  to authenticated, service_role;
grant select, insert, update, delete on public.training_intakes
  to authenticated, service_role;
revoke truncate on public.training_sources from anon, authenticated;
revoke truncate on public.training_intakes from anon, authenticated;

drop policy if exists training_sources_admin_all on public.training_sources;
create policy training_sources_admin_all
on public.training_sources
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists training_intakes_admin_all on public.training_intakes;
create policy training_intakes_admin_all
on public.training_intakes
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));
