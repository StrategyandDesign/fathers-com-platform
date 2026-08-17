-- In-progress Father Profile answers. Completed results stay on father_profiles.

create table public.father_profile_drafts (
  father_id uuid primary key references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  current_index integer not null default 1 check (current_index >= 1),
  updated_at timestamptz not null default now()
);

alter table public.father_profile_drafts enable row level security;
alter table public.father_profile_drafts force row level security;

grant select, insert, update, delete on public.father_profile_drafts
  to authenticated, service_role;
revoke truncate on public.father_profile_drafts from anon, authenticated;

create policy father_profile_drafts_own_or_managed
on public.father_profile_drafts
for all
to authenticated
using (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
)
with check (
  (
    father_id = (select auth.uid())
    and (select public.current_user_role()) = 'father'::public.user_role
  )
  or (select public.manages_father(father_id))
);
