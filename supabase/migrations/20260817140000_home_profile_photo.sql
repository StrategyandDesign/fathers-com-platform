-- Allow organization photo slot for the Father Home Profile card.

alter table public.organization_photos
  drop constraint if exists organization_photos_slot_check;

alter table public.organization_photos
  add constraint organization_photos_slot_check
  check (slot ~ '^(home_hero|home_profile|training_[a-z0-9]+(-[a-z0-9]+)*)$');

comment on column public.organization_photos.slot is
  'home_hero, home_profile, or training_{slug}.';

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
      ~ '^(home_hero|home_profile|training_[a-z0-9]+(-[a-z0-9]+)*)$'
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
      ~ '^(home_hero|home_profile|training_[a-z0-9]+(-[a-z0-9]+)*)$'
    and internal.is_manager_of_group(public.storage_folder_uuid(object_name));
$$;
