-- Keystone v1.6 | Certification P0: state machine, activity heartbeat, append-only audit.
-- Safe and re-runnable. States: enrolled, in_progress, submitted, proctor_review,
-- awarded, signed, expired, revoked, withdrawn, failed_final. "stalled" is computed,
-- never stored: 21 days without activity while enrolled or in_progress.

-- 1. Columns on the pursuit row.
alter table public.certificate_enrollments add column if not exists state text not null default 'enrolled';
alter table public.certificate_enrollments add column if not exists last_activity_at timestamptz not null default now();

-- 2. The append-only audit log. Every state a pursuit has ever held, timestamped and attributed.
create table if not exists public.certificate_events (
  id bigint generated always as identity primary key,
  enrollment_id text,
  user_id uuid not null,
  course_id uuid,
  from_state text,
  to_state text not null,
  actor text not null default 'system',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cert_events_enrollment on public.certificate_events(enrollment_id);
create index if not exists idx_cert_events_user on public.certificate_events(user_id);
alter table public.certificate_events enable row level security;
drop policy if exists cert_events_own_read on public.certificate_events;
create policy cert_events_own_read on public.certificate_events for select using (auth.uid() = user_id);

-- 3. Triggers keep the log honest no matter which client writes.
create or replace function public.tg_cert_enroll_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into certificate_events(enrollment_id, user_id, course_id, from_state, to_state, actor)
  values (new.id::text, new.user_id, new.course_id, null, coalesce(new.state,'enrolled'), 'system');
  return new;
end $$;
drop trigger if exists trg_cert_enroll_insert on public.certificate_enrollments;
create trigger trg_cert_enroll_insert after insert on public.certificate_enrollments
for each row execute function public.tg_cert_enroll_insert();

create or replace function public.tg_cert_enroll_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.state is distinct from old.state then
    insert into certificate_events(enrollment_id, user_id, course_id, from_state, to_state, actor)
    values (new.id::text, new.user_id, new.course_id, old.state, new.state, 'system');
  end if;
  return new;
end $$;
drop trigger if exists trg_cert_enroll_state on public.certificate_enrollments;
create trigger trg_cert_enroll_state after update of state on public.certificate_enrollments
for each row execute function public.tg_cert_enroll_state();

-- Awards drive the pursuit forward: submitted, awarded, signed sync onto the enrollment.
create or replace function public.tg_cert_award_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update certificate_enrollments
     set state = new.status, last_activity_at = now()
   where user_id = new.user_id and course_id = new.course_id
     and state is distinct from new.status;
  return new;
end $$;
drop trigger if exists trg_cert_award_ins on public.certificate_awards;
create trigger trg_cert_award_ins after insert on public.certificate_awards
for each row execute function public.tg_cert_award_sync();
drop trigger if exists trg_cert_award_upd on public.certificate_awards;
create trigger trg_cert_award_upd after update of status on public.certificate_awards
for each row execute function public.tg_cert_award_sync();

-- 4. Backfill existing rows into the machine, then log their current state once.
update public.certificate_enrollments e set state = a.status
  from public.certificate_awards a
 where a.user_id = e.user_id and a.course_id = e.course_id
   and e.state = 'enrolled' and a.status is not null;
-- in_progress is earned by real activity; the coursework heartbeat sets it from here forward.
insert into public.certificate_events(enrollment_id, user_id, course_id, from_state, to_state, actor, note)
select e.id::text, e.user_id, e.course_id, null, e.state, 'backfill', 'v1.6 initial state'
  from public.certificate_enrollments e
 where not exists (select 1 from public.certificate_events ev where ev.enrollment_id = e.id::text);

-- 5. The read model: effective_state computes stalls without storing them.
create or replace view public.certificate_pursuits
with (security_invoker = on) as
select e.*,
  case when e.state in ('enrolled','in_progress') and e.last_activity_at < now() - interval '21 days'
       then 'stalled' else e.state end as effective_state
from public.certificate_enrollments e;

-- 6. Verify. Expect: state_col=1, activity_col=1, events_tbl=1, view_ok=1, triggers=4, events_logged >= enrollments.
select
  (select count(*) from information_schema.columns where table_name='certificate_enrollments' and column_name='state') as state_col,
  (select count(*) from information_schema.columns where table_name='certificate_enrollments' and column_name='last_activity_at') as activity_col,
  (select count(*) from information_schema.tables where table_name='certificate_events') as events_tbl,
  (select count(*) from information_schema.views where table_name='certificate_pursuits') as view_ok,
  (select count(*) from information_schema.triggers where trigger_name like 'trg_cert_%') as triggers,
  (select count(*) from public.certificate_events) as events_logged;
