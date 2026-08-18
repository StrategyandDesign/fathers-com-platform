-- Remaining clean-pilot features: certificate PDFs, notification
-- preferences, and profile avatars.
--
-- Extends tables/buckets already created by the core schema and
-- certs_prefs_avatars. Does not recreate those objects.
--
-- Authorization in this file reads auth.jwt() -> app_metadata.role
-- only (father | manager | reviewer). Never user_metadata.
--
-- Storage path convention (already used by the app):
--   certificates: {father_id}/{serial}.pdf
--   avatars:      {user_id}/avatar

-- ---------- jwt role helper ----------
-- Invoker: uses the caller's JWT. Lives in public like the other
-- policy wrappers. Not a privilege check by itself.

create or replace function public.jwt_app_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.jwt()) -> 'app_metadata' ->> 'role';
$$;

revoke all on function public.jwt_app_role() from public, anon;
grant execute on function public.jwt_app_role() to authenticated, service_role;

-- Signup currently leaves app_metadata.role empty; the app treats that
-- as father. Stamp the claim on new users and backfill existing ones
-- from public.profiles.role. JWTs refresh on the next sign-in.

create or replace function internal.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    'father'::public.user_role
  );

  if coalesce(new.raw_app_meta_data ->> 'role', '') not in (
    'father',
    'manager',
    'reviewer',
    'admin'
  ) then
    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"father"}'::jsonb
    where id = new.id;
  end if;

  return new;
end;
$$;

update auth.users
set raw_app_meta_data =
  coalesce(auth.users.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', profiles.role::text)
from public.profiles
where profiles.id = auth.users.id
  and coalesce(auth.users.raw_app_meta_data ->> 'role', '') not in (
    'father',
    'manager',
    'reviewer',
    'admin'
  );

-- =====================================================================
-- 1. Certificates — persist the generated PDF in private Storage
-- =====================================================================
-- Existing: id, father_id, training_id, serial_number, issued_at,
-- issued_by, pdf_url, pdf_storage_path.
-- pdf_path is the canonical object key. pdf_storage_path is the
-- earlier name; keep both in sync below.

alter table public.certificates
  add column if not exists pdf_path text;

alter table public.certificates
  add column if not exists pdf_generated_at timestamptz;

update public.certificates
set pdf_path = pdf_storage_path
where pdf_path is null
  and pdf_storage_path is not null;

comment on column public.certificates.pdf_path is
  'Private object key in the certificates bucket, e.g. {father_id}/{serial}.pdf';

comment on column public.certificates.pdf_generated_at is
  'When the PDF was last written to Storage.';

-- Keep pdf_path and pdf_storage_path aligned when either is written.
create or replace function internal.sync_certificate_pdf_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.pdf_path is distinct from old.pdf_path then
    new.pdf_storage_path := new.pdf_path;
  elsif tg_op = 'UPDATE'
     and new.pdf_storage_path is distinct from old.pdf_storage_path then
    new.pdf_path := new.pdf_storage_path;
  else
    new.pdf_path := coalesce(new.pdf_path, new.pdf_storage_path);
    new.pdf_storage_path := coalesce(new.pdf_storage_path, new.pdf_path);
  end if;

  if new.pdf_path is not null
     and (tg_op = 'INSERT' or new.pdf_path is distinct from old.pdf_path) then
    new.pdf_generated_at := coalesce(new.pdf_generated_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists certificates_sync_pdf_path on public.certificates;
create trigger certificates_sync_pdf_path
  before insert or update of pdf_path, pdf_storage_path
  on public.certificates
  for each row
  execute function internal.sync_certificate_pdf_path();

revoke all on function internal.sync_certificate_pdf_path()
  from public, anon, authenticated;
grant execute on function internal.sync_certificate_pdf_path() to service_role;

-- Table policies: father reads own; manager who issued or who
-- manages the father's group reads/writes. Reviewer: none.
drop policy if exists certificates_own_or_managed on public.certificates;
drop policy if exists certificates_select on public.certificates;
drop policy if exists certificates_insert on public.certificates;
drop policy if exists certificates_update on public.certificates;
drop policy if exists certificates_delete on public.certificates;

create policy certificates_select
on public.certificates
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (
    (select public.jwt_app_role()) = 'manager'
    and (
      issued_by = (select auth.uid())
      or (select public.manages_father(father_id))
    )
  )
);

create policy certificates_insert
on public.certificates
for insert
to authenticated
with check (
  (select public.jwt_app_role()) = 'manager'
  and (select public.manages_father(father_id))
);

create policy certificates_update
on public.certificates
for update
to authenticated
using (
  (select public.jwt_app_role()) = 'manager'
  and (
    issued_by = (select auth.uid())
    or (select public.manages_father(father_id))
  )
)
with check (
  (select public.jwt_app_role()) = 'manager'
  and (
    issued_by = (select auth.uid())
    or (select public.manages_father(father_id))
  )
);

create policy certificates_delete
on public.certificates
for delete
to authenticated
using (
  (select public.jwt_app_role()) = 'manager'
  and (
    issued_by = (select auth.uid())
    or (select public.manages_father(father_id))
  )
);

-- Storage: private `certificates` bucket already exists.
-- SELECT needs a security-definer lookup so an issuer can still
-- match the object after certificates RLS is applied.

create or replace function internal.can_read_certificate_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.storage_folder_uuid(object_name) is not null
    and (
      public.storage_folder_uuid(object_name) = (select auth.uid())
      or (
        ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'manager'
        and (
          internal.manages_father(public.storage_folder_uuid(object_name))
          or exists (
            select 1
            from public.certificates
            where certificates.issued_by = (select auth.uid())
              and (
                certificates.pdf_path = object_name
                or certificates.pdf_storage_path = object_name
                or certificates.father_id = public.storage_folder_uuid(object_name)
              )
          )
        )
      )
    );
$$;

create or replace function internal.can_write_certificate_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'manager'
    and public.storage_folder_uuid(object_name) is not null
    and (
      internal.manages_father(public.storage_folder_uuid(object_name))
      or exists (
        select 1
        from public.certificates
        where certificates.issued_by = (select auth.uid())
          and (
            certificates.pdf_path = object_name
            or certificates.pdf_storage_path = object_name
            or certificates.father_id = public.storage_folder_uuid(object_name)
          )
      )
    );
$$;

create or replace function public.can_read_certificate_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.can_read_certificate_object($1);
$$;

create or replace function public.can_write_certificate_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.can_write_certificate_object($1);
$$;

revoke all on function internal.can_read_certificate_object(text) from public, anon;
revoke all on function internal.can_write_certificate_object(text) from public, anon;
grant execute on function internal.can_read_certificate_object(text)
  to authenticated, service_role;
grant execute on function internal.can_write_certificate_object(text)
  to authenticated, service_role;

revoke all on function public.can_read_certificate_object(text) from public, anon;
revoke all on function public.can_write_certificate_object(text) from public, anon;
grant execute on function public.can_read_certificate_object(text)
  to authenticated, service_role;
grant execute on function public.can_write_certificate_object(text)
  to authenticated, service_role;

drop policy if exists certificates_objects_select on storage.objects;
drop policy if exists certificates_objects_insert on storage.objects;
drop policy if exists certificates_objects_update on storage.objects;
drop policy if exists certificates_objects_delete on storage.objects;
drop policy if exists certificates_select on storage.objects;
drop policy if exists certificates_insert on storage.objects;
drop policy if exists certificates_update on storage.objects;
drop policy if exists certificates_delete on storage.objects;

create policy certificates_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'certificates'
  and (select public.can_read_certificate_object(name))
);

-- Upsert needs INSERT + SELECT + UPDATE.
create policy certificates_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'certificates'
  and (select public.can_write_certificate_object(name))
);

create policy certificates_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'certificates'
  and (select public.can_write_certificate_object(name))
)
with check (
  bucket_id = 'certificates'
  and (select public.can_write_certificate_object(name))
);

create policy certificates_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'certificates'
  and (select public.can_write_certificate_object(name))
);

-- =====================================================================
-- 2. Notification preferences — one row per user, explicit toggles
-- =====================================================================
-- Table already exists. Add Higgsfield-named columns; keep the
-- earlier names so in-progress app writes still land.

alter table public.notification_preferences
  add column if not exists new_participant_joins boolean not null default true;

alter table public.notification_preferences
  add column if not exists profile_taken boolean not null default true;

alter table public.notification_preferences
  add column if not exists action_pending boolean not null default true;

alter table public.notification_preferences
  add column if not exists security_alerts boolean not null default true;

update public.notification_preferences
set
  new_participant_joins = participant_joined,
  profile_taken = profile_completed,
  security_alerts = account_security_alerts;

comment on column public.notification_preferences.new_participant_joins is
  'Manager: a father joined the group. Alias of participant_joined.';
comment on column public.notification_preferences.profile_taken is
  'Manager: Father Profile completed. Alias of profile_completed.';
comment on column public.notification_preferences.action_pending is
  'Manager: a session action is waiting.';
comment on column public.notification_preferences.security_alerts is
  'All roles: sign-in and account changes. Alias of account_security_alerts.';

-- Bidirectional alias sync + touch updated_at.
-- Defaults are true, so on INSERT a false on either side of an
-- alias pair wins (someone turned the toggle off).
create or replace function internal.touch_notification_preferences()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.new_participant_joins is distinct from old.new_participant_joins then
    new.participant_joined := new.new_participant_joins;
  elsif tg_op = 'UPDATE'
     and new.participant_joined is distinct from old.participant_joined then
    new.new_participant_joins := new.participant_joined;
  else
    new.new_participant_joins := new.new_participant_joins and new.participant_joined;
    new.participant_joined := new.new_participant_joins;
  end if;

  if tg_op = 'UPDATE'
     and new.profile_taken is distinct from old.profile_taken then
    new.profile_completed := new.profile_taken;
  elsif tg_op = 'UPDATE'
     and new.profile_completed is distinct from old.profile_completed then
    new.profile_taken := new.profile_completed;
  else
    new.profile_taken := new.profile_taken and new.profile_completed;
    new.profile_completed := new.profile_taken;
  end if;

  if tg_op = 'UPDATE'
     and new.security_alerts is distinct from old.security_alerts then
    new.account_security_alerts := new.security_alerts;
  elsif tg_op = 'UPDATE'
     and new.account_security_alerts is distinct from old.account_security_alerts then
    new.security_alerts := new.account_security_alerts;
  else
    new.security_alerts := new.security_alerts and new.account_security_alerts;
    new.account_security_alerts := new.security_alerts;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_touch on public.notification_preferences;
create trigger notification_preferences_touch
  before insert or update
  on public.notification_preferences
  for each row
  execute function internal.touch_notification_preferences();

revoke all on function internal.touch_notification_preferences()
  from public, anon, authenticated;
grant execute on function internal.touch_notification_preferences() to service_role;

-- Own row only. No delete policy (row is created with the profile).
drop policy if exists notification_preferences_own on public.notification_preferences;
drop policy if exists notification_preferences_select on public.notification_preferences;
drop policy if exists notification_preferences_insert on public.notification_preferences;
drop policy if exists notification_preferences_update on public.notification_preferences;

create policy notification_preferences_select
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_preferences_insert
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_preferences_update
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select, insert, update on public.notification_preferences
  to authenticated, service_role;
revoke delete, truncate on public.notification_preferences
  from anon, authenticated;

-- =====================================================================
-- 3. Avatars — Storage object key on the existing profiles row
-- =====================================================================
-- profiles is keyed by auth user id and already has avatar_url.
-- avatar_path is the object key ({user_id}/avatar). avatar_url may
-- hold the same path or a later signed/public URL.

alter table public.profiles
  add column if not exists avatar_path text;

update public.profiles
set avatar_path = avatar_url
where avatar_path is null
  and avatar_url is not null
  and avatar_url like '%/%';

comment on column public.profiles.avatar_path is
  'Private object key in the avatars bucket, e.g. {user_id}/avatar';

create or replace function internal.sync_profile_avatar_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.avatar_path is distinct from old.avatar_path then
    if new.avatar_url is not distinct from old.avatar_url
       or new.avatar_url is null
       or new.avatar_url like '%/%' then
      new.avatar_url := new.avatar_path;
    end if;
  elsif tg_op = 'UPDATE'
     and new.avatar_url is distinct from old.avatar_url
     and new.avatar_url like '%/%' then
    new.avatar_path := new.avatar_url;
  elsif tg_op = 'INSERT' then
    new.avatar_path := coalesce(new.avatar_path, new.avatar_url);
    if new.avatar_url is null or new.avatar_url like '%/%' then
      new.avatar_url := coalesce(new.avatar_url, new.avatar_path);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_avatar_path on public.profiles;
create trigger profiles_sync_avatar_path
  before insert or update of avatar_path, avatar_url
  on public.profiles
  for each row
  execute function internal.sync_profile_avatar_path();

revoke all on function internal.sync_profile_avatar_path()
  from public, anon, authenticated;
grant execute on function internal.sync_profile_avatar_path() to service_role;

-- Storage: private `avatars` bucket already exists.
-- Write own {user_id}/* (upsert = insert + select + update).
-- Read own, or a manager reading a father they manage.
-- Reviewers do not read other people's photos (insights stay anonymous).
-- App uses signed URLs; those still require this SELECT policy.

drop policy if exists avatars_objects_select on storage.objects;
drop policy if exists avatars_objects_insert on storage.objects;
drop policy if exists avatars_objects_update on storage.objects;
drop policy if exists avatars_objects_delete on storage.objects;
drop policy if exists avatars_select on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

create policy avatars_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) is not null
  and (
    public.storage_folder_uuid(name) = (select auth.uid())
    or (
      (select public.jwt_app_role()) = 'manager'
      and (select public.manages_father(public.storage_folder_uuid(name)))
    )
  )
);

create policy avatars_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
);

create policy avatars_update
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

create policy avatars_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_folder_uuid(name) = (select auth.uid())
);
