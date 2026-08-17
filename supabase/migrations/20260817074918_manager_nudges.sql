-- Manager outreach log. Preference-aware nudges only — not a messaging inbox.
-- Role checks use public.profiles / existing helpers, never user_metadata.

create table if not exists public.manager_nudges (
  id uuid primary key default gen_random_uuid(),
  father_id uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid not null references public.profiles (id) on delete restrict,
  template_key text not null,
  status text not null,
  sent_at timestamptz not null default now(),
  constraint manager_nudges_template_check
    check (template_key in ('continue', 'encouragement', 'welcome_back')),
  constraint manager_nudges_status_check
    check (status in ('sent', 'skipped_pref', 'failed'))
);

comment on table public.manager_nudges is
  'One row per manager nudge attempt. Email is sent only when session_reminders is on.';

create index if not exists manager_nudges_father_sent_idx
  on public.manager_nudges (father_id, sent_at desc);

create index if not exists manager_nudges_manager_sent_idx
  on public.manager_nudges (manager_id, sent_at desc);

alter table public.manager_nudges enable row level security;
alter table public.manager_nudges force row level security;

grant select, insert on public.manager_nudges
  to authenticated, service_role;
revoke update, delete, truncate on public.manager_nudges
  from anon, authenticated;

drop policy if exists manager_nudges_select on public.manager_nudges;
drop policy if exists manager_nudges_insert on public.manager_nudges;

create policy manager_nudges_select
on public.manager_nudges
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select public.manages_father(father_id))
);

create policy manager_nudges_insert
on public.manager_nudges
for insert
to authenticated
with check (
  manager_id = (select auth.uid())
  and (select public.manages_father(father_id))
);
