-- Lightweight training requests. Managers insert only. Super-admin reads and updates status.
-- Completely separate from support_reports. Role checks use public.profiles helpers.

create table if not exists public.training_requests (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  organization_name text,
  topic text not null,
  description text not null,
  audience text,
  status text not null default 'new',
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint training_requests_status_check
    check (status in ('new', 'considering', 'planned', 'declined')),
  constraint training_requests_topic_check
    check (char_length(btrim(topic)) >= 1 and char_length(topic) <= 200),
  constraint training_requests_description_check
    check (char_length(btrim(description)) >= 1 and char_length(description) <= 2000),
  constraint training_requests_audience_check
    check (audience is null or (char_length(btrim(audience)) >= 1 and char_length(audience) <= 200)),
  constraint training_requests_org_name_check
    check (organization_name is null or char_length(organization_name) <= 200),
  constraint training_requests_decided_check
    check (
      (status in ('planned', 'declined') and decided_at is not null)
      or (status not in ('planned', 'declined') and decided_at is null and decided_by is null)
    )
);

comment on table public.training_requests is
  'Manager requests for new trainings. Managers create only. Super-admin reads the inbox.';

create index if not exists training_requests_status_created_idx
  on public.training_requests (status, created_at desc);

create index if not exists training_requests_created_idx
  on public.training_requests (created_at desc);

create or replace function internal.prepare_training_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owned_group_id uuid;
  owned_group_name text;
begin
  if tg_op = 'INSERT' then
    if (select internal.current_user_role()) is distinct from 'manager'::public.user_role then
      raise exception 'Not authorized';
    end if;

    new.manager_id := (select auth.uid());
    new.status := 'new';
    new.decided_at := null;
    new.decided_by := null;
    new.topic := btrim(new.topic);
    new.description := btrim(new.description);
    new.audience := nullif(btrim(coalesce(new.audience, '')), '');
    new.organization_name := null;
    new.group_id := nullif(new.group_id, '00000000-0000-0000-0000-000000000000'::uuid);

    if new.group_id is not null then
      select g.id, g.name
        into owned_group_id, owned_group_name
      from public.groups g
      where g.id = new.group_id
        and g.manager_id = new.manager_id;

      if owned_group_id is null then
        raise exception 'Not authorized';
      end if;

      new.group_id := owned_group_id;
      new.organization_name := left(btrim(coalesce(owned_group_name, '')), 200);
      if new.organization_name = '' then
        new.organization_name := null;
      end if;
    end if;

    return new;
  end if;

  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  new.id := old.id;
  new.manager_id := old.manager_id;
  new.group_id := old.group_id;
  new.organization_name := old.organization_name;
  new.topic := old.topic;
  new.description := old.description;
  new.audience := old.audience;
  new.created_at := old.created_at;

  if new.status in ('planned', 'declined') then
    new.decided_at := coalesce(old.decided_at, now());
    new.decided_by := coalesce(old.decided_by, (select auth.uid()));
  else
    new.decided_at := null;
    new.decided_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists training_requests_prepare on public.training_requests;
create trigger training_requests_prepare
  before insert or update
  on public.training_requests
  for each row
  execute function internal.prepare_training_request();

revoke all on function internal.prepare_training_request()
  from public, anon, authenticated;
grant execute on function internal.prepare_training_request()
  to service_role;

alter table public.training_requests enable row level security;
alter table public.training_requests force row level security;

grant select, insert, update on public.training_requests
  to authenticated, service_role;
revoke delete, truncate on public.training_requests
  from anon, authenticated;

drop policy if exists training_requests_insert on public.training_requests;
drop policy if exists training_requests_select on public.training_requests;
drop policy if exists training_requests_update on public.training_requests;

create policy training_requests_insert
on public.training_requests
for insert
to authenticated
with check (
  manager_id = (select auth.uid())
  and (select public.current_user_role()) = 'manager'::public.user_role
  and status = 'new'
);

create policy training_requests_select
on public.training_requests
for select
to authenticated
using ((select public.is_super_admin()));

create policy training_requests_update
on public.training_requests
for update
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));
