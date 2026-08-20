-- Optional PDF handouts on a training. Super-admin writes. Fathers and
-- Leaders read when they can see the training. Role checks use
-- public.profiles, never user_metadata.

create table if not exists public.training_handouts (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  byte_size integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint training_handouts_file_name_len
    check (char_length(file_name) between 1 and 80),
  constraint training_handouts_byte_size_check
    check (byte_size > 0 and byte_size <= 5242880)
);

comment on table public.training_handouts is
  'Optional PDF handouts for one training. Empty = no attachment shown.';

comment on column public.training_handouts.storage_path is
  'Private object key in the training-handouts bucket, {training_id}/{id}.pdf';

create index if not exists training_handouts_training_id_idx
  on public.training_handouts (training_id);

alter table public.training_handouts enable row level security;
alter table public.training_handouts force row level security;

grant select on public.training_handouts to authenticated, service_role;
grant insert, update, delete on public.training_handouts to authenticated, service_role;
revoke truncate on public.training_handouts from anon, authenticated;

create or replace function internal.touch_training_handouts()
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

drop trigger if exists training_handouts_touch on public.training_handouts;
create trigger training_handouts_touch
  before insert or update
  on public.training_handouts
  for each row
  execute function internal.touch_training_handouts();

revoke all on function internal.touch_training_handouts()
  from public, anon, authenticated;
grant execute on function internal.touch_training_handouts() to service_role;

drop policy if exists training_handouts_select on public.training_handouts;
drop policy if exists training_handouts_insert on public.training_handouts;
drop policy if exists training_handouts_update on public.training_handouts;
drop policy if exists training_handouts_delete on public.training_handouts;

create policy training_handouts_select
on public.training_handouts
for select
to authenticated
using (
  (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role,
    'admin'::public.user_role
  )
  or (select public.is_super_admin())
);

create policy training_handouts_insert
on public.training_handouts
for insert
to authenticated
with check ((select public.is_super_admin()));

create policy training_handouts_update
on public.training_handouts
for update
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy training_handouts_delete
on public.training_handouts
for delete
to authenticated
using ((select public.is_super_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-handouts',
  'training-handouts',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists training_handouts_objects_select on storage.objects;
drop policy if exists training_handouts_objects_insert on storage.objects;
drop policy if exists training_handouts_objects_update on storage.objects;
drop policy if exists training_handouts_objects_delete on storage.objects;

create policy training_handouts_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'training-handouts'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  and (
    (select public.current_user_role()) in (
      'father'::public.user_role,
      'manager'::public.user_role,
      'admin'::public.user_role
    )
    or (select public.is_super_admin())
  )
);

create policy training_handouts_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'training-handouts'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  and (select public.is_super_admin())
);

create policy training_handouts_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'training-handouts'
  and (select public.is_super_admin())
)
with check (
  bucket_id = 'training-handouts'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  and (select public.is_super_admin())
);

create policy training_handouts_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'training-handouts'
  and (select public.is_super_admin())
);
