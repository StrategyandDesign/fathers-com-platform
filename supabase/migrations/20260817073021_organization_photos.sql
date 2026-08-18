-- Organization-scoped cover photos for Father Home and training cards.
-- Additive only. Does not change progress, certificates, or avatars.
--
-- Tenant key is public.groups.id (Admin "organization"). Paths:
--   {group_id}/{slot}   e.g. {uuid}/home_hero, {uuid}/training_fundamentals
--
-- Role checks use public.profiles / existing helpers, never user_metadata.

-- ---------- membership helper ----------
create or replace function internal.is_member_of_group(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_members.group_id = $1
      and group_members.father_id = (select auth.uid())
  );
$$;

create or replace function public.is_member_of_group(group_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.is_member_of_group($1);
$$;

revoke all on function internal.is_member_of_group(uuid) from public, anon;
revoke all on function public.is_member_of_group(uuid) from public, anon;
grant execute on function internal.is_member_of_group(uuid)
  to authenticated, service_role;
grant execute on function public.is_member_of_group(uuid)
  to authenticated, service_role;

-- ---------- metadata ----------
create table if not exists public.organization_photos (
  group_id uuid not null references public.groups (id) on delete cascade,
  slot text not null,
  storage_path text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (group_id, slot),
  constraint organization_photos_slot_check
    check (slot ~ '^(home_hero|training_[a-z0-9]+(-[a-z0-9]+)*)$')
);

comment on table public.organization_photos is
  'Custom cover overrides for one organization (groups.id). Empty row = platform default.';

comment on column public.organization_photos.slot is
  'home_hero or training_{slug}. Per-training because trainingCover(slug) is already per-training.';

comment on column public.organization_photos.storage_path is
  'Private object key in the org-photos bucket, e.g. {group_id}/{slot}';

create index if not exists organization_photos_updated_at_idx
  on public.organization_photos (updated_at desc);

alter table public.organization_photos enable row level security;
alter table public.organization_photos force row level security;

grant select, insert, update, delete on public.organization_photos
  to authenticated, service_role;
revoke truncate on public.organization_photos from anon, authenticated;

create or replace function internal.touch_organization_photos()
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

drop trigger if exists organization_photos_touch on public.organization_photos;
create trigger organization_photos_touch
  before insert or update
  on public.organization_photos
  for each row
  execute function internal.touch_organization_photos();

revoke all on function internal.touch_organization_photos()
  from public, anon, authenticated;
grant execute on function internal.touch_organization_photos() to service_role;

drop policy if exists organization_photos_select on public.organization_photos;
drop policy if exists organization_photos_insert on public.organization_photos;
drop policy if exists organization_photos_update on public.organization_photos;
drop policy if exists organization_photos_delete on public.organization_photos;
drop policy if exists organization_photos_select_admin on public.organization_photos;

create policy organization_photos_select
on public.organization_photos
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_member_of_group(group_id))
);

create policy organization_photos_insert
on public.organization_photos
for insert
to authenticated
with check ((select public.is_manager_of_group(group_id)));

create policy organization_photos_update
on public.organization_photos
for update
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check ((select public.is_manager_of_group(group_id)));

create policy organization_photos_delete
on public.organization_photos
for delete
to authenticated
using ((select public.is_manager_of_group(group_id)));

create policy organization_photos_select_admin
on public.organization_photos
for select
to authenticated
using ((select public.is_super_admin()));

-- ---------- private bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-photos',
  'org-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function internal.org_photo_slot_name(object_name text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select nullif(split_part(object_name, '/', 2), '');
$$;

revoke all on function internal.org_photo_slot_name(text) from public, anon;
grant execute on function internal.org_photo_slot_name(text)
  to authenticated, service_role;

create or replace function internal.can_read_org_photo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.storage_folder_uuid(object_name) is not null
    and internal.org_photo_slot_name(object_name)
      ~ '^(home_hero|training_[a-z0-9]+(-[a-z0-9]+)*)$'
    and (
      internal.is_manager_of_group(public.storage_folder_uuid(object_name))
      or internal.is_member_of_group(public.storage_folder_uuid(object_name))
      or internal.is_super_admin()
    );
$$;

create or replace function internal.can_write_org_photo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.storage_folder_uuid(object_name) is not null
    and internal.org_photo_slot_name(object_name)
      ~ '^(home_hero|training_[a-z0-9]+(-[a-z0-9]+)*)$'
    and internal.is_manager_of_group(public.storage_folder_uuid(object_name));
$$;

create or replace function public.can_read_org_photo_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.can_read_org_photo_object($1);
$$;

create or replace function public.can_write_org_photo_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.can_write_org_photo_object($1);
$$;

revoke all on function internal.can_read_org_photo_object(text) from public, anon;
revoke all on function internal.can_write_org_photo_object(text) from public, anon;
grant execute on function internal.can_read_org_photo_object(text)
  to authenticated, service_role;
grant execute on function internal.can_write_org_photo_object(text)
  to authenticated, service_role;

revoke all on function public.can_read_org_photo_object(text) from public, anon;
revoke all on function public.can_write_org_photo_object(text) from public, anon;
grant execute on function public.can_read_org_photo_object(text)
  to authenticated, service_role;
grant execute on function public.can_write_org_photo_object(text)
  to authenticated, service_role;

drop policy if exists org_photos_select on storage.objects;
drop policy if exists org_photos_insert on storage.objects;
drop policy if exists org_photos_update on storage.objects;
drop policy if exists org_photos_delete on storage.objects;

create policy org_photos_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'org-photos'
  and (select public.can_read_org_photo_object(name))
);

-- Upsert needs INSERT + SELECT + UPDATE.
create policy org_photos_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'org-photos'
  and (select public.can_write_org_photo_object(name))
);

create policy org_photos_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'org-photos'
  and (select public.can_write_org_photo_object(name))
)
with check (
  bucket_id = 'org-photos'
  and (select public.can_write_org_photo_object(name))
);

create policy org_photos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'org-photos'
  and (select public.can_write_org_photo_object(name))
);
