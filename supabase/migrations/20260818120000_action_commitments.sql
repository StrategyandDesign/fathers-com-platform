-- Action commitment loop: named moment, completion, father-only outcome note.
-- Down path: select internal.rollback_action_commitments();

create table if not exists public.action_commitments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  intention_label text not null check (
    intention_label in (
      'tonight',
      'this_weekend',
      'bedtime',
      'drive',
      'next_time',
      'custom'
    )
  ),
  intention_at timestamptz,
  committed_at timestamptz not null default now(),
  completed_at timestamptz,
  closed_at timestamptz,
  outcome_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id),
  check (outcome_note is null or char_length(outcome_note) <= 140)
);

create index if not exists action_commitments_user_idx
  on public.action_commitments (user_id);

comment on table public.action_commitments is
  'Father-only Action commitment and outcome. Staff roles have no policy.';
comment on column public.action_commitments.intention_label is
  'Preset the father tapped, or custom when he picked a day and time.';
comment on column public.action_commitments.intention_at is
  'Resolved local moment in UTC. Relative options are mapped to a future clock.';
comment on column public.action_commitments.outcome_note is
  'Optional one-line behavioral report. Visible to the father only.';

alter table public.action_commitments enable row level security;
alter table public.action_commitments force row level security;

drop policy if exists action_commitments_own on public.action_commitments;
create policy action_commitments_own
on public.action_commitments
for all
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
)
with check (
  user_id = (select auth.uid())
  and (select public.current_user_role()) = 'father'::public.user_role
);

revoke all on table public.action_commitments from public, anon;
grant select, insert, update on public.action_commitments to authenticated;
grant select, insert, update on public.action_commitments to service_role;
revoke delete, truncate on public.action_commitments from anon, authenticated;

update public.notification_outbox as outbox
set canceled_at = now()
where outbox.type = 'action'
  and outbox.processed_at is null
  and outbox.canceled_at is null
  and not exists (
    select 1
    from public.action_commitments as commitment
    where commitment.user_id = outbox.user_id
      and commitment.completed_at is null
      and commitment.closed_at is null
      and outbox.dedupe_key = concat('action:', commitment.user_id, ':', commitment.session_id)
  );

create or replace function internal.rollback_action_commitments()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop table if exists public.action_commitments;
end;
$$;

revoke all on function internal.rollback_action_commitments() from public, anon, authenticated;
grant execute on function internal.rollback_action_commitments() to service_role;
