-- Platform-wide login background. Super-admin writes. Everyone sees it
-- on the sign-in door. Role checks use public.profiles, never user_metadata.

create table if not exists public.platform_photos (
  slot text primary key,
  storage_path text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint platform_photos_slot_check
    check (slot = 'login_background')
);

comment on table public.platform_photos is
  'Platform-wide photo slots. Missing login_background row = default woods photo.';

comment on column public.platform_photos.slot is
  'login_background only. One panoramic photo behind the sign-in window.';

comment on column public.platform_photos.storage_path is
  'Object key in the platform-photos bucket, e.g. login_background';

alter table public.platform_photos enable row level security;
alter table public.platform_photos force row level security;

grant select on public.platform_photos to anon, authenticated, service_role;
grant insert, update, delete on public.platform_photos to authenticated, service_role;
revoke truncate on public.platform_photos from anon, authenticated;

create or replace function internal.touch_platform_photos()
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

drop trigger if exists platform_photos_touch on public.platform_photos;
create trigger platform_photos_touch
  before insert or update
  on public.platform_photos
  for each row
  execute function internal.touch_platform_photos();

revoke all on function internal.touch_platform_photos()
  from public, anon, authenticated;
grant execute on function internal.touch_platform_photos() to service_role;

drop policy if exists platform_photos_select on public.platform_photos;
drop policy if exists platform_photos_insert on public.platform_photos;
drop policy if exists platform_photos_update on public.platform_photos;
drop policy if exists platform_photos_delete on public.platform_photos;

-- The wallpaper path is not secret. Anon read lets the login page load it.
create policy platform_photos_select
on public.platform_photos
for select
to anon, authenticated
using (true);

-- UPDATE needs SELECT. Super-admin writes only.
create policy platform_photos_insert
on public.platform_photos
for insert
to authenticated
with check ((select public.is_super_admin()));

create policy platform_photos_update
on public.platform_photos
for update
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy platform_photos_delete
on public.platform_photos
for delete
to authenticated
using ((select public.is_super_admin()));

-- ---------- public wallpaper bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-photos',
  'platform-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists platform_photos_objects_select on storage.objects;
drop policy if exists platform_photos_objects_insert on storage.objects;
drop policy if exists platform_photos_objects_update on storage.objects;
drop policy if exists platform_photos_objects_delete on storage.objects;

create policy platform_photos_objects_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'platform-photos'
  and name = 'login_background'
);

-- Upsert needs INSERT + SELECT + UPDATE.
create policy platform_photos_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'platform-photos'
  and name = 'login_background'
  and (select public.is_super_admin())
);

create policy platform_photos_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'platform-photos'
  and name = 'login_background'
  and (select public.is_super_admin())
)
with check (
  bucket_id = 'platform-photos'
  and name = 'login_background'
  and (select public.is_super_admin())
);

create policy platform_photos_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'platform-photos'
  and name = 'login_background'
  and (select public.is_super_admin())
);
