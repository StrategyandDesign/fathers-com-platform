-- Certificate storage path, notification preferences, and private Storage buckets.
-- Role checks use public.profiles / helper RPCs, never user_metadata.

-- ---------- certificates: persist the private object path ----------
alter table public.certificates
  add column if not exists pdf_storage_path text;

create unique index if not exists certificates_father_training_uidx
  on public.certificates (father_id, training_id);

-- ---------- notification preferences (one row per user) ----------
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  participant_joined boolean not null default true,
  session_completed boolean not null default true,
  training_completed boolean not null default true,
  profile_completed boolean not null default true,
  certificate_sent boolean not null default true,
  weekly_report_ready boolean not null default true,
  account_security_alerts boolean not null default true,
  session_reminders boolean not null default true,
  new_trainings boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

grant select, insert, update, delete on public.notification_preferences
  to authenticated, service_role;

revoke truncate on public.notification_preferences from anon, authenticated;

create policy notification_preferences_own
on public.notification_preferences
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function internal.handle_new_profile_prefs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_prefs on public.profiles;
create trigger on_profile_created_prefs
  after insert on public.profiles
  for each row
  execute function internal.handle_new_profile_prefs();

revoke all on function internal.handle_new_profile_prefs() from public, anon, authenticated;
grant execute on function internal.handle_new_profile_prefs() to service_role;

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- ---------- storage path helper (string parse only) ----------
create or replace function public.storage_folder_uuid(object_name text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function public.storage_folder_uuid(text) from public, anon;
grant execute on function public.storage_folder_uuid(text) to authenticated, service_role;

-- ---------- private buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'certificates',
    'certificates',
    false,
    5242880,
    array['application/pdf']::text[]
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_or_father_id}/{filename}
-- Certificates: manager who manages that father can write; father + that manager can read.
-- Avatars: owner writes; owner + managing manager can read.

drop policy if exists certificates_objects_select on storage.objects;
drop policy if exists certificates_objects_insert on storage.objects;
drop policy if exists certificates_objects_update on storage.objects;
drop policy if exists certificates_objects_delete on storage.objects;
drop policy if exists avatars_objects_select on storage.objects;
drop policy if exists avatars_objects_insert on storage.objects;
drop policy if exists avatars_objects_update on storage.objects;
drop policy if exists avatars_objects_delete on storage.objects;

create policy certificates_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'certificates'
  and (
    public.storage_folder_uuid(name) = (select auth.uid())
    or (select public.manages_father(public.storage_folder_uuid(name)))
  )
);

create policy certificates_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'certificates'
  and (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(public.storage_folder_uuid(name)))
);

create policy certificates_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'certificates'
  and (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(public.storage_folder_uuid(name)))
)
with check (
  bucket_id = 'certificates'
  and (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(public.storage_folder_uuid(name)))
);

create policy certificates_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'certificates'
  and (select public.current_user_role()) = 'manager'::public.user_role
  and (select public.manages_father(public.storage_folder_uuid(name)))
);

create policy avatars_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.storage_folder_uuid(name) = (select auth.uid())
    or (select public.manages_father(public.storage_folder_uuid(name)))
  )
);

create policy avatars_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
);

create policy avatars_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
)
with check (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
);

create policy avatars_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
);
