-- Super-admin messages to Leaders and Reviewers only.
-- Fathers never receive these. Recipients are snapshotted at send time.
-- Down path: select internal.rollback_platform_staff_messages();

create table if not exists public.platform_staff_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  audience text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint platform_staff_messages_body_len
    check (char_length(body) >= 1 and char_length(body) <= 280),
  constraint platform_staff_messages_audience_check
    check (
      audience in (
        'all_leaders',
        'selected_leaders',
        'all_reviewers',
        'selected_reviewers',
        'all_leaders_and_reviewers'
      )
    )
);

comment on table public.platform_staff_messages is
  'Short Super-admin notes for Leaders and Reviewers. Fathers are never recipients.';

create table if not exists public.platform_staff_message_recipients (
  message_id uuid not null references public.platform_staff_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  recipient_role text not null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id),
  constraint platform_staff_message_recipients_role_check
    check (recipient_role in ('manager', 'reviewer'))
);

comment on table public.platform_staff_message_recipients is
  'Who should see one Super-admin desk message. Dismiss is per person.';

create index if not exists platform_staff_message_recipients_open_idx
  on public.platform_staff_message_recipients (profile_id, created_at desc)
  where dismissed_at is null;

create or replace function internal.platform_staff_message_eligible()
returns table (profile_id uuid, recipient_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (profiles.id)
    profiles.id,
    case
      when profiles.role = 'manager'::public.user_role then 'manager'
      else 'reviewer'
    end
  from public.profiles
  where profiles.deactivated_at is null
    and profiles.role in ('manager'::public.user_role, 'reviewer'::public.user_role)
    and (
      exists (
        select 1
        from public.organization_staff as staff
        where staff.profile_id = profiles.id
          and (
            (
              profiles.role = 'manager'::public.user_role
              and staff.staff_role = 'manager'::public.organization_staff_role
            )
            or (
              profiles.role = 'reviewer'::public.user_role
              and staff.staff_role = 'reviewer'::public.organization_staff_role
            )
          )
      )
      or (
        profiles.role = 'manager'::public.user_role
        and exists (
          select 1
          from public.groups
          where groups.manager_id = profiles.id
        )
      )
      or (
        profiles.role = 'reviewer'::public.user_role
        and profiles.home_group_id is not null
      )
    )
  order by profiles.id;
$$;

create or replace function public.send_platform_staff_message(
  p_body text,
  p_audience text,
  p_profile_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text;
  v_id uuid;
  v_count integer;
begin
  if not internal.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  v_body := trim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'));
  if v_body = '' then
    raise exception 'Write a message first.';
  end if;
  if char_length(v_body) > 280 then
    raise exception 'Keep the message under 280 characters.';
  end if;

  if p_audience not in (
    'all_leaders',
    'selected_leaders',
    'all_reviewers',
    'selected_reviewers',
    'all_leaders_and_reviewers'
  ) then
    raise exception 'Choose who should receive this.';
  end if;

  insert into public.platform_staff_messages (body, audience, created_by)
  values (v_body, p_audience, (select auth.uid()))
  returning id into v_id;

  insert into public.platform_staff_message_recipients (
    message_id, profile_id, recipient_role
  )
  select v_id, eligible.profile_id, eligible.recipient_role
  from internal.platform_staff_message_eligible() as eligible
  where (
    p_audience = 'all_leaders_and_reviewers'
    or (p_audience = 'all_leaders' and eligible.recipient_role = 'manager')
    or (p_audience = 'all_reviewers' and eligible.recipient_role = 'reviewer')
    or (
      p_audience = 'selected_leaders'
      and eligible.recipient_role = 'manager'
      and p_profile_ids is not null
      and eligible.profile_id = any (p_profile_ids)
    )
    or (
      p_audience = 'selected_reviewers'
      and eligible.recipient_role = 'reviewer'
      and p_profile_ids is not null
      and eligible.profile_id = any (p_profile_ids)
    )
  );

  get diagnostics v_count = row_count;
  if coalesce(v_count, 0) < 1 then
    raise exception 'Select at least one Leader or Reviewer.';
  end if;

  return v_id;
end;
$$;

alter table public.platform_staff_messages enable row level security;
alter table public.platform_staff_messages force row level security;
alter table public.platform_staff_message_recipients enable row level security;
alter table public.platform_staff_message_recipients force row level security;

revoke all on table public.platform_staff_messages from public, anon, authenticated;
revoke all on table public.platform_staff_message_recipients from public, anon, authenticated;

grant select on public.platform_staff_messages to authenticated, service_role;
grant select on public.platform_staff_message_recipients to authenticated, service_role;
grant update (dismissed_at) on public.platform_staff_message_recipients
  to authenticated, service_role;
grant insert, update, delete on public.platform_staff_messages to service_role;
grant insert, update, delete on public.platform_staff_message_recipients to service_role;

drop policy if exists platform_staff_messages_select on public.platform_staff_messages;
drop policy if exists platform_staff_message_recipients_select
  on public.platform_staff_message_recipients;
drop policy if exists platform_staff_message_recipients_update
  on public.platform_staff_message_recipients;

create policy platform_staff_messages_select
on public.platform_staff_messages
for select
to authenticated
using (
  (select public.is_super_admin())
  or exists (
    select 1
    from public.platform_staff_message_recipients as recipients
    where recipients.message_id = platform_staff_messages.id
      and recipients.profile_id = (select auth.uid())
  )
);

create policy platform_staff_message_recipients_select
on public.platform_staff_message_recipients
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select public.is_super_admin())
);

create policy platform_staff_message_recipients_update
on public.platform_staff_message_recipients
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

revoke all on function internal.platform_staff_message_eligible() from public, anon, authenticated;
revoke all on function public.send_platform_staff_message(text, text, uuid[]) from public, anon;

grant execute on function internal.platform_staff_message_eligible() to service_role;
grant execute on function public.send_platform_staff_message(text, text, uuid[])
  to authenticated, service_role;

create or replace function internal.rollback_platform_staff_messages()
returns void
language plpgsql
set search_path = ''
as $$
begin
  drop function if exists public.send_platform_staff_message(text, text, uuid[]);
  drop function if exists internal.platform_staff_message_eligible();
  drop table if exists public.platform_staff_message_recipients;
  drop table if exists public.platform_staff_messages;
end;
$$;

revoke all on function internal.rollback_platform_staff_messages()
  from public, anon, authenticated;
grant execute on function internal.rollback_platform_staff_messages() to service_role;
