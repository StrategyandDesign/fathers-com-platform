-- Per-organization locale and optional reviewer home group.
-- Additive only. Existing organizations stay English (locale default 'en').
-- Additional languages are added in the app LOCALES list; no schema change required.

alter table public.groups
  add column if not exists code text;

alter table public.groups
  add column if not exists locale text not null default 'en';

create unique index if not exists groups_code_unique
  on public.groups (code)
  where code is not null;

comment on column public.groups.code is
  'Optional short site code (e.g. IL). Used for photo packs and satellite identity.';
comment on column public.groups.locale is
  'Default UI locale for members of this organization (e.g. en, he).';

alter table public.profiles
  add column if not exists locale text;

alter table public.profiles
  add column if not exists home_group_id uuid references public.groups (id) on delete set null;

create index if not exists profiles_home_group_id_idx
  on public.profiles (home_group_id);

comment on column public.profiles.locale is
  'Optional UI locale override. Null inherits the organization default.';
comment on column public.profiles.home_group_id is
  'Optional home organization. Reviewers with this set are scoped to that group.';
