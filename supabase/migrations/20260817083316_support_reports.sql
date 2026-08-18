-- Minimal support reports. Submitters insert only. Super-admin reads and updates status.
-- Role checks use public.profiles helpers, never user_metadata.

create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references public.profiles (id) on delete cascade,
  submitter_role public.user_role not null,
  category text not null,
  page text,
  message text not null,
  screenshot_path text,
  status text not null default 'new',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint support_reports_role_check
    check (
      submitter_role in (
        'father'::public.user_role,
        'manager'::public.user_role,
        'reviewer'::public.user_role
      )
    ),
  constraint support_reports_category_check
    check (category in ('bug', 'not_working', 'question', 'other')),
  constraint support_reports_status_check
    check (status in ('new', 'looking', 'resolved')),
  constraint support_reports_message_check
    check (char_length(btrim(message)) >= 1 and char_length(message) <= 2000),
  constraint support_reports_page_check
    check (page is null or char_length(page) <= 200),
  constraint support_reports_screenshot_check
    check (
      screenshot_path is null
      or screenshot_path like (submitter_id::text || '/%')
    ),
  constraint support_reports_resolved_check
    check (
      (status = 'resolved' and resolved_at is not null)
      or (status <> 'resolved' and resolved_at is null and resolved_by is null)
    )
);

comment on table public.support_reports is
  'Lightweight problem reports. Submitters create only. Super-admin reads the inbox.';

create index if not exists support_reports_status_created_idx
  on public.support_reports (status, created_at desc);

create index if not exists support_reports_created_idx
  on public.support_reports (created_at desc);

create or replace function internal.prepare_support_report()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  role public.user_role;
begin
  if tg_op = 'INSERT' then
    role := internal.current_user_role();
    if role is distinct from 'father'::public.user_role
      and role is distinct from 'manager'::public.user_role
      and role is distinct from 'reviewer'::public.user_role then
      raise exception 'Not authorized';
    end if;

    new.submitter_id := (select auth.uid());
    new.submitter_role := role;
    new.status := 'new';
    new.resolved_at := null;
    new.resolved_by := null;
    new.page := nullif(btrim(coalesce(new.page, '')), '');
    new.message := btrim(new.message);
    return new;
  end if;

  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  new.id := old.id;
  new.submitter_id := old.submitter_id;
  new.submitter_role := old.submitter_role;
  new.category := old.category;
  new.page := old.page;
  new.message := old.message;
  new.screenshot_path := old.screenshot_path;
  new.created_at := old.created_at;

  if new.status = 'resolved' then
    new.resolved_at := coalesce(old.resolved_at, now());
    new.resolved_by := coalesce(old.resolved_by, (select auth.uid()));
  else
    new.resolved_at := null;
    new.resolved_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists support_reports_prepare on public.support_reports;
create trigger support_reports_prepare
  before insert or update
  on public.support_reports
  for each row
  execute function internal.prepare_support_report();

revoke all on function internal.prepare_support_report()
  from public, anon, authenticated;
grant execute on function internal.prepare_support_report()
  to service_role;

alter table public.support_reports enable row level security;
alter table public.support_reports force row level security;

grant select, insert, update on public.support_reports
  to authenticated, service_role;
revoke delete, truncate on public.support_reports
  from anon, authenticated;

drop policy if exists support_reports_insert on public.support_reports;
drop policy if exists support_reports_select on public.support_reports;
drop policy if exists support_reports_update on public.support_reports;

create policy support_reports_insert
on public.support_reports
for insert
to authenticated
with check (
  submitter_id = (select auth.uid())
  and submitter_role = (select public.current_user_role())
  and submitter_role in (
    'father'::public.user_role,
    'manager'::public.user_role,
    'reviewer'::public.user_role
  )
  and status = 'new'
);

create policy support_reports_select
on public.support_reports
for select
to authenticated
using ((select public.is_super_admin()));

create policy support_reports_update
on public.support_reports
for update
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-screenshots',
  'support-screenshots',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists support_screenshots_insert on storage.objects;
drop policy if exists support_screenshots_select on storage.objects;
drop policy if exists support_screenshots_delete on storage.objects;

create policy support_screenshots_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'support-screenshots'
  and public.storage_folder_uuid(name) = (select auth.uid())
  and (select public.current_user_role()) in (
    'father'::public.user_role,
    'manager'::public.user_role,
    'reviewer'::public.user_role
  )
);

create policy support_screenshots_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'support-screenshots'
  and (select public.is_super_admin())
);

create policy support_screenshots_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'support-screenshots'
  and (
    public.storage_folder_uuid(name) = (select auth.uid())
    or (select public.is_super_admin())
  )
);
