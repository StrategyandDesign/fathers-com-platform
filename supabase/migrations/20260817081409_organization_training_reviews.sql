-- Manager review of newly released trainings.
-- Legacy published trainings (released_at is null) stay assignable with no review.
-- Role checks use public.profiles helpers, never user_metadata.

alter table public.trainings
  add column if not exists released_at timestamptz;

alter table public.trainings
  add column if not exists first_published_at timestamptz;

comment on column public.trainings.released_at is
  'Set when an admin first releases a training to organizations. Null = legacy catalog, no review required.';

comment on column public.trainings.first_published_at is
  'First time this training was published. Existing catalog rows are stamped at migration so republish does not gate them.';

update public.trainings
set first_published_at = now()
where published is true
  and first_published_at is null;

alter table public.notification_preferences
  add column if not exists training_releases boolean not null default true;

comment on column public.notification_preferences.training_releases is
  'Managers: email when a new training is released for review.';

-- ---------- reviews ----------
create table if not exists public.organization_training_reviews (
  group_id uuid not null references public.groups (id) on delete cascade,
  training_id uuid not null references public.trainings (id) on delete cascade,
  status text not null default 'pending',
  decline_reason text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, training_id),
  constraint organization_training_reviews_status_check
    check (status in ('pending', 'accepted', 'declined')),
  constraint organization_training_reviews_reason_check
    check (decline_reason is null or char_length(decline_reason) <= 400)
);

comment on table public.organization_training_reviews is
  'Per-organization accept/decline of a released training. Pending and declined stay hidden from assign and fathers.';

create index if not exists organization_training_reviews_training_idx
  on public.organization_training_reviews (training_id, status);

create index if not exists organization_training_reviews_group_status_idx
  on public.organization_training_reviews (group_id, status);

alter table public.organization_training_reviews enable row level security;
alter table public.organization_training_reviews force row level security;

grant select, update on public.organization_training_reviews
  to authenticated, service_role;
revoke insert, delete, truncate on public.organization_training_reviews
  from anon, authenticated;

-- ---------- in-app notifications ----------
create table if not exists public.manager_notifications (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  training_id uuid references public.trainings (id) on delete cascade,
  kind text not null default 'training_release',
  title text not null,
  body text,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint manager_notifications_kind_check
    check (kind in ('training_release'))
);

comment on table public.manager_notifications is
  'In-app notices for managers. Training-release rows link to the review screen.';

create index if not exists manager_notifications_manager_created_idx
  on public.manager_notifications (manager_id, created_at desc);

alter table public.manager_notifications enable row level security;
alter table public.manager_notifications force row level security;

grant select, update on public.manager_notifications
  to authenticated, service_role;
revoke insert, delete, truncate on public.manager_notifications
  from anon, authenticated;

-- ---------- release / seed ----------
create or replace function internal.release_training_to_organizations(p_training_id uuid)
returns table (manager_id uuid, group_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_published boolean;
  v_group record;
  v_inserted integer;
  v_notify boolean;
begin
  select trainings.title, trainings.published
    into v_title, v_published
  from public.trainings
  where trainings.id = p_training_id;

  if v_title is null or v_published is not true then
    return;
  end if;

  update public.trainings
    set released_at = coalesce(released_at, now()),
        first_published_at = coalesce(first_published_at, now())
  where id = p_training_id;

  for v_group in
    select groups.id, groups.manager_id
    from public.groups
    where groups.manager_id is not null
  loop
    insert into public.organization_training_reviews (group_id, training_id, status)
    values (v_group.id, p_training_id, 'pending')
    on conflict (group_id, training_id) do nothing;

    get diagnostics v_inserted = row_count;
    is_new := v_inserted > 0;
    manager_id := v_group.manager_id;
    group_id := v_group.id;

    if v_inserted > 0 then
      select coalesce(prefs.training_releases, true)
        into v_notify
      from public.notification_preferences as prefs
      where prefs.user_id = v_group.manager_id;

      if coalesce(v_notify, true) then
        insert into public.manager_notifications (
          manager_id, group_id, training_id, kind, title, body, href
        ) values (
          v_group.manager_id,
          v_group.id,
          p_training_id,
          'training_release',
          'A new training is available for your review',
          v_title,
          '/manager/reviews/' || p_training_id::text
        );
      end if;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function internal.seed_group_training_reviews(p_group_id uuid)
returns table (manager_id uuid, group_id uuid, training_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager uuid;
  v_training record;
  v_inserted integer;
  v_notify boolean;
begin
  select groups.manager_id into v_manager
  from public.groups
  where groups.id = p_group_id;

  if v_manager is null then
    return;
  end if;

  for v_training in
    select trainings.id, trainings.title
    from public.trainings
    where trainings.published is true
      and trainings.released_at is not null
  loop
    insert into public.organization_training_reviews (group_id, training_id, status)
    values (p_group_id, v_training.id, 'pending')
    on conflict (group_id, training_id) do nothing;

    get diagnostics v_inserted = row_count;
    is_new := v_inserted > 0;
    manager_id := v_manager;
    group_id := p_group_id;
    training_id := v_training.id;

    if v_inserted > 0 then
      select coalesce(prefs.training_releases, true)
        into v_notify
      from public.notification_preferences as prefs
      where prefs.user_id = v_manager;

      if coalesce(v_notify, true) then
        insert into public.manager_notifications (
          manager_id, group_id, training_id, kind, title, body, href
        ) values (
          v_manager,
          p_group_id,
          v_training.id,
          'training_release',
          'A new training is available for your review',
          v_training.title,
          '/manager/reviews/' || v_training.id::text
        );
      end if;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.release_training_to_organizations(p_training_id uuid)
returns table (manager_id uuid, group_id uuid, is_new boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select internal.is_super_admin()) then
    raise exception 'Not authorized';
  end if;
  return query select * from internal.release_training_to_organizations(p_training_id);
end;
$$;

create or replace function public.seed_group_training_reviews(p_group_id uuid)
returns table (manager_id uuid, group_id uuid, training_id uuid, is_new boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (
    (select internal.is_super_admin())
    or (select internal.is_manager_of_group(p_group_id))
  ) then
    raise exception 'Not authorized';
  end if;
  return query select * from internal.seed_group_training_reviews(p_group_id);
end;
$$;

create or replace function internal.my_accepted_training_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct reviews.training_id), '{}'::uuid[])
  from public.organization_training_reviews as reviews
  join public.group_members as members
    on members.group_id = reviews.group_id
  where members.father_id = (select auth.uid())
    and reviews.status = 'accepted';
$$;

create or replace function public.my_accepted_training_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.my_accepted_training_ids();
$$;

revoke all on function internal.release_training_to_organizations(uuid)
  from public, anon;
revoke all on function internal.seed_group_training_reviews(uuid)
  from public, anon;
revoke all on function public.release_training_to_organizations(uuid)
  from public, anon;
revoke all on function public.seed_group_training_reviews(uuid)
  from public, anon;
revoke all on function internal.my_accepted_training_ids()
  from public, anon;
revoke all on function public.my_accepted_training_ids()
  from public, anon;

grant execute on function internal.release_training_to_organizations(uuid)
  to authenticated, service_role;
grant execute on function internal.seed_group_training_reviews(uuid)
  to authenticated, service_role;
grant execute on function public.release_training_to_organizations(uuid)
  to authenticated, service_role;
grant execute on function public.seed_group_training_reviews(uuid)
  to authenticated, service_role;
grant execute on function internal.my_accepted_training_ids()
  to authenticated, service_role;
grant execute on function public.my_accepted_training_ids()
  to authenticated, service_role;

-- ---------- RLS ----------
drop policy if exists organization_training_reviews_select on public.organization_training_reviews;
drop policy if exists organization_training_reviews_update on public.organization_training_reviews;
drop policy if exists manager_notifications_select on public.manager_notifications;
drop policy if exists manager_notifications_update on public.manager_notifications;

create policy organization_training_reviews_select
on public.organization_training_reviews
for select
to authenticated
using (
  (select public.is_manager_of_group(group_id))
  or (select public.is_super_admin())
);

create policy organization_training_reviews_update
on public.organization_training_reviews
for update
to authenticated
using ((select public.is_manager_of_group(group_id)))
with check ((select public.is_manager_of_group(group_id)));

create policy manager_notifications_select
on public.manager_notifications
for select
to authenticated
using (manager_id = (select auth.uid()));

create policy manager_notifications_update
on public.manager_notifications
for update
to authenticated
using (manager_id = (select auth.uid()))
with check (manager_id = (select auth.uid()));

-- Admin can look up manager email prefs when releasing a training.
create or replace function internal.notification_recipient(
  target_user_id uuid,
  pref_key text
)
returns table (email text, allowed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed_pref boolean;
  recipient_email text;
begin
  if target_user_id is null or pref_key is null then
    return;
  end if;

  if pref_key not in (
    'participant_joined',
    'session_completed',
    'training_completed',
    'profile_completed',
    'certificate_sent',
    'weekly_report_ready',
    'account_security_alerts',
    'session_reminders',
    'new_trainings',
    'training_releases'
  ) then
    return;
  end if;

  if (select auth.uid()) is distinct from target_user_id
     and not internal.manages_father(target_user_id)
     and not internal.is_super_admin() then
    return;
  end if;

  select u.email::text
    into recipient_email
  from auth.users as u
  where u.id = target_user_id;

  if recipient_email is null or recipient_email = '' then
    return;
  end if;

  execute format(
    'select %I from public.notification_preferences where user_id = $1',
    pref_key
  )
  into allowed_pref
  using target_user_id;

  email := recipient_email;
  allowed := coalesce(allowed_pref, true);
  return next;
end;
$$;
