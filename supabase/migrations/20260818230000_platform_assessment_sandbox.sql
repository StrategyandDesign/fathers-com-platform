-- Super-admin weighted assessment sandbox.
-- Keystone stays the hardcoded 128-question instrument. These rows are new
-- platform assessments: domains, item weights, interpretation bands, then
-- the existing Ready → Publish → Release → Leader accept/share path.
-- Down path: select internal.rollback_platform_assessment_sandbox();

create table if not exists public.platform_assessments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  assessment_key text not null unique,
  title text not null,
  title_he text,
  description text,
  description_he text,
  working_title text,
  development_notes text,
  development_status text not null default 'draft',
  scoring_method text not null default 'weighted_mean',
  scale_min integer not null default 1,
  scale_max integer not null default 5,
  published boolean not null default false,
  previewed_at timestamptz,
  last_edited_at timestamptz,
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_assessments_slug_check
    check (
      char_length(btrim(slug)) >= 3
      and char_length(slug) <= 32
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and slug <> 'keystone'
    ),
  constraint platform_assessments_key_check
    check (
      char_length(assessment_key) >= 8
      and char_length(assessment_key) <= 64
      and assessment_key <> 'keystone'
    ),
  constraint platform_assessments_title_check
    check (char_length(btrim(title)) >= 1 and char_length(title) <= 120),
  constraint platform_assessments_title_he_check
    check (title_he is null or char_length(title_he) <= 120),
  constraint platform_assessments_description_check
    check (description is null or char_length(description) <= 2000),
  constraint platform_assessments_description_he_check
    check (description_he is null or char_length(description_he) <= 2000),
  constraint platform_assessments_working_title_check
    check (working_title is null or char_length(working_title) <= 120),
  constraint platform_assessments_notes_check
    check (development_notes is null or char_length(development_notes) <= 4000),
  constraint platform_assessments_status_check
    check (development_status in (
      'draft',
      'in_development',
      'ready_for_review',
      'released',
      'archived'
    )),
  constraint platform_assessments_scoring_check
    check (scoring_method in ('weighted_mean')),
  constraint platform_assessments_scale_check
    check (scale_min = 1 and scale_max = 5)
);

comment on table public.platform_assessments is
  'Super-admin authored weighted assessments. Keystone is not stored here.';

comment on column public.platform_assessments.assessment_key is
  'Release key. plat_ plus slug. Used by platform_assessment_releases.';

create table if not exists public.platform_assessment_domains (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null
    references public.platform_assessments (id) on delete cascade,
  domain_key text not null,
  title text not null,
  title_he text,
  description text,
  weight numeric(8, 4) not null default 1,
  sort_order integer not null default 0,
  unique (assessment_id, domain_key),
  unique (assessment_id, sort_order),
  constraint platform_assessment_domains_key_check
    check (char_length(btrim(domain_key)) >= 1 and char_length(domain_key) <= 40),
  constraint platform_assessment_domains_title_check
    check (char_length(btrim(title)) >= 1 and char_length(title) <= 120),
  constraint platform_assessment_domains_title_he_check
    check (title_he is null or char_length(title_he) <= 120),
  constraint platform_assessment_domains_description_check
    check (description is null or char_length(description) <= 2000),
  constraint platform_assessment_domains_weight_check
    check (weight >= 0.01 and weight <= 99.99)
);

create table if not exists public.platform_assessment_items (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null
    references public.platform_assessment_domains (id) on delete cascade,
  prompt text not null,
  prompt_he text,
  reverse_scored boolean not null default false,
  weight numeric(8, 4) not null default 1,
  sort_order integer not null default 0,
  unique (domain_id, sort_order),
  constraint platform_assessment_items_prompt_check
    check (char_length(btrim(prompt)) >= 1 and char_length(prompt) <= 1000),
  constraint platform_assessment_items_prompt_he_check
    check (prompt_he is null or char_length(prompt_he) <= 1000),
  constraint platform_assessment_items_weight_check
    check (weight >= 0.01 and weight <= 99.99)
);

create table if not exists public.platform_assessment_bands (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null
    references public.platform_assessments (id) on delete cascade,
  min_score numeric(6, 2) not null,
  max_score numeric(6, 2) not null,
  label text not null,
  label_he text,
  description text,
  description_he text,
  sort_order integer not null default 0,
  unique (assessment_id, sort_order),
  constraint platform_assessment_bands_range_check
    check (min_score >= 0 and max_score <= 100 and min_score <= max_score),
  constraint platform_assessment_bands_label_check
    check (char_length(btrim(label)) >= 1 and char_length(label) <= 80),
  constraint platform_assessment_bands_label_he_check
    check (label_he is null or char_length(label_he) <= 80),
  constraint platform_assessment_bands_description_check
    check (description is null or char_length(description) <= 400),
  constraint platform_assessment_bands_description_he_check
    check (description_he is null or char_length(description_he) <= 400)
);

create table if not exists public.platform_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null
    references public.platform_assessments (id) on delete cascade,
  father_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  overall_score numeric(6, 2),
  band_label text,
  band_description text,
  domain_scores jsonb,
  unique (assessment_id, father_id),
  constraint platform_assessment_attempts_status_check
    check (status in ('in_progress', 'completed'))
);

create table if not exists public.platform_assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null
    references public.platform_assessment_attempts (id) on delete cascade,
  item_id uuid not null
    references public.platform_assessment_items (id) on delete cascade,
  value integer not null,
  updated_at timestamptz not null default now(),
  unique (attempt_id, item_id),
  constraint platform_assessment_responses_value_check
    check (value >= 1 and value <= 5)
);

create index if not exists platform_assessments_status_idx
  on public.platform_assessments (development_status, published);

create index if not exists platform_assessments_key_idx
  on public.platform_assessments (assessment_key);

create index if not exists platform_assessment_domains_assessment_idx
  on public.platform_assessment_domains (assessment_id, sort_order);

create index if not exists platform_assessment_items_domain_idx
  on public.platform_assessment_items (domain_id, sort_order);

create index if not exists platform_assessment_bands_assessment_idx
  on public.platform_assessment_bands (assessment_id, sort_order);

create index if not exists platform_assessment_attempts_father_idx
  on public.platform_assessment_attempts (father_id, status);

create index if not exists platform_assessment_attempts_assessment_idx
  on public.platform_assessment_attempts (assessment_id, status);

create index if not exists platform_assessment_responses_attempt_idx
  on public.platform_assessment_responses (attempt_id);

create or replace function internal.stamp_platform_assessment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE'
    and (
      new.title is distinct from old.title
      or new.title_he is distinct from old.title_he
      or new.description is distinct from old.description
      or new.description_he is distinct from old.description_he
      or new.scoring_method is distinct from old.scoring_method
    ) then
    new.previewed_at := null;
  end if;

  new.updated_at := now();
  new.last_edited_at := now();
  new.last_edited_by := auth.uid();
  return new;
end;
$$;

create or replace function internal.touch_platform_assessment_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assessment_id uuid;
begin
  if TG_TABLE_NAME = 'platform_assessment_items' then
    select domain.assessment_id into v_assessment_id
    from public.platform_assessment_domains as domain
    where domain.id = coalesce(new.domain_id, old.domain_id);
  else
    v_assessment_id := coalesce(new.assessment_id, old.assessment_id);
  end if;

  if v_assessment_id is null then
    return coalesce(new, old);
  end if;

  update public.platform_assessments
  set
    previewed_at = null,
    last_edited_at = now(),
    last_edited_by = auth.uid(),
    updated_at = now()
  where id = v_assessment_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists platform_assessments_stamp on public.platform_assessments;
create trigger platform_assessments_stamp
before insert or update on public.platform_assessments
for each row
execute function internal.stamp_platform_assessment();

drop trigger if exists platform_assessment_domains_touch
  on public.platform_assessment_domains;
create trigger platform_assessment_domains_touch
after insert or update or delete on public.platform_assessment_domains
for each row
execute function internal.touch_platform_assessment_parent();

drop trigger if exists platform_assessment_items_touch
  on public.platform_assessment_items;
create trigger platform_assessment_items_touch
after insert or update or delete on public.platform_assessment_items
for each row
execute function internal.touch_platform_assessment_parent();

drop trigger if exists platform_assessment_bands_touch
  on public.platform_assessment_bands;
create trigger platform_assessment_bands_touch
after insert or update or delete on public.platform_assessment_bands
for each row
execute function internal.touch_platform_assessment_parent();

create or replace function internal.assessment_release_title(p_assessment_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_assessment_key = 'keystone' then 'Keystone Assessment'
    else coalesce(
      (
        select assessments.title
        from public.platform_assessments as assessments
        where assessments.assessment_key = p_assessment_key
      ),
      p_assessment_key
    )
  end;
$$;

revoke all on function internal.stamp_platform_assessment()
  from public, anon, authenticated;
revoke all on function internal.touch_platform_assessment_parent()
  from public, anon, authenticated;
revoke all on function internal.assessment_release_title(text)
  from public, anon, authenticated;
grant execute on function internal.stamp_platform_assessment() to service_role;
grant execute on function internal.touch_platform_assessment_parent() to service_role;
grant execute on function internal.assessment_release_title(text) to service_role;

alter table public.platform_assessments enable row level security;
alter table public.platform_assessments force row level security;
alter table public.platform_assessment_domains enable row level security;
alter table public.platform_assessment_domains force row level security;
alter table public.platform_assessment_items enable row level security;
alter table public.platform_assessment_items force row level security;
alter table public.platform_assessment_bands enable row level security;
alter table public.platform_assessment_bands force row level security;
alter table public.platform_assessment_attempts enable row level security;
alter table public.platform_assessment_attempts force row level security;
alter table public.platform_assessment_responses enable row level security;
alter table public.platform_assessment_responses force row level security;

grant select, insert, update, delete on
  public.platform_assessments,
  public.platform_assessment_domains,
  public.platform_assessment_items,
  public.platform_assessment_bands,
  public.platform_assessment_attempts,
  public.platform_assessment_responses
to authenticated, service_role;

revoke truncate on
  public.platform_assessments,
  public.platform_assessment_domains,
  public.platform_assessment_items,
  public.platform_assessment_bands,
  public.platform_assessment_attempts,
  public.platform_assessment_responses
from anon, authenticated;

drop policy if exists platform_assessments_admin_all on public.platform_assessments;
create policy platform_assessments_admin_all
on public.platform_assessments
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessments_published_select
  on public.platform_assessments;
create policy platform_assessments_published_select
on public.platform_assessments
for select
to authenticated
using (published is true);

drop policy if exists platform_assessment_domains_admin_all
  on public.platform_assessment_domains;
create policy platform_assessment_domains_admin_all
on public.platform_assessment_domains
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessment_domains_published_select
  on public.platform_assessment_domains;
create policy platform_assessment_domains_published_select
on public.platform_assessment_domains
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_assessments as assessments
    where assessments.id = platform_assessment_domains.assessment_id
      and assessments.published is true
  )
);

drop policy if exists platform_assessment_items_admin_all
  on public.platform_assessment_items;
create policy platform_assessment_items_admin_all
on public.platform_assessment_items
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessment_items_published_select
  on public.platform_assessment_items;
create policy platform_assessment_items_published_select
on public.platform_assessment_items
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_assessment_domains as domains
    join public.platform_assessments as assessments
      on assessments.id = domains.assessment_id
    where domains.id = platform_assessment_items.domain_id
      and assessments.published is true
  )
);

drop policy if exists platform_assessment_bands_admin_all
  on public.platform_assessment_bands;
create policy platform_assessment_bands_admin_all
on public.platform_assessment_bands
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessment_bands_published_select
  on public.platform_assessment_bands;
create policy platform_assessment_bands_published_select
on public.platform_assessment_bands
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_assessments as assessments
    where assessments.id = platform_assessment_bands.assessment_id
      and assessments.published is true
  )
);

drop policy if exists platform_assessment_attempts_admin_all
  on public.platform_assessment_attempts;
create policy platform_assessment_attempts_admin_all
on public.platform_assessment_attempts
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessment_attempts_select
  on public.platform_assessment_attempts;
create policy platform_assessment_attempts_select
on public.platform_assessment_attempts
for select
to authenticated
using (
  father_id = (select auth.uid())
  or (select internal.manages_father(father_id))
);

drop policy if exists platform_assessment_attempts_insert
  on public.platform_assessment_attempts;
create policy platform_assessment_attempts_insert
on public.platform_assessment_attempts
for insert
to authenticated
with check (
  father_id = (select auth.uid())
  and exists (
    select 1
    from public.platform_assessments as assessments
    where assessments.id = platform_assessment_attempts.assessment_id
      and assessments.published is true
  )
);

drop policy if exists platform_assessment_attempts_update
  on public.platform_assessment_attempts;
create policy platform_assessment_attempts_update
on public.platform_assessment_attempts
for update
to authenticated
using (
  father_id = (select auth.uid())
  and status = 'in_progress'
)
with check (father_id = (select auth.uid()));

drop policy if exists platform_assessment_responses_admin_all
  on public.platform_assessment_responses;
create policy platform_assessment_responses_admin_all
on public.platform_assessment_responses
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists platform_assessment_responses_select
  on public.platform_assessment_responses;
create policy platform_assessment_responses_select
on public.platform_assessment_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_assessment_attempts as attempts
    where attempts.id = platform_assessment_responses.attempt_id
      and (
        attempts.father_id = (select auth.uid())
        or (select internal.manages_father(attempts.father_id))
      )
  )
);

drop policy if exists platform_assessment_responses_write
  on public.platform_assessment_responses;
create policy platform_assessment_responses_write
on public.platform_assessment_responses
for all
to authenticated
using (
  exists (
    select 1
    from public.platform_assessment_attempts as attempts
    where attempts.id = platform_assessment_responses.attempt_id
      and attempts.father_id = (select auth.uid())
      and attempts.status = 'in_progress'
  )
)
with check (
  exists (
    select 1
    from public.platform_assessment_attempts as attempts
    where attempts.id = platform_assessment_responses.attempt_id
      and attempts.father_id = (select auth.uid())
      and attempts.status = 'in_progress'
  )
);

create or replace function internal.rollback_platform_assessment_sandbox()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop policy if exists platform_assessment_responses_write
    on public.platform_assessment_responses;
  drop policy if exists platform_assessment_responses_select
    on public.platform_assessment_responses;
  drop policy if exists platform_assessment_responses_admin_all
    on public.platform_assessment_responses;
  drop policy if exists platform_assessment_attempts_update
    on public.platform_assessment_attempts;
  drop policy if exists platform_assessment_attempts_insert
    on public.platform_assessment_attempts;
  drop policy if exists platform_assessment_attempts_select
    on public.platform_assessment_attempts;
  drop policy if exists platform_assessment_attempts_admin_all
    on public.platform_assessment_attempts;
  drop policy if exists platform_assessment_bands_published_select
    on public.platform_assessment_bands;
  drop policy if exists platform_assessment_bands_admin_all
    on public.platform_assessment_bands;
  drop policy if exists platform_assessment_items_published_select
    on public.platform_assessment_items;
  drop policy if exists platform_assessment_items_admin_all
    on public.platform_assessment_items;
  drop policy if exists platform_assessment_domains_published_select
    on public.platform_assessment_domains;
  drop policy if exists platform_assessment_domains_admin_all
    on public.platform_assessment_domains;
  drop policy if exists platform_assessments_published_select
    on public.platform_assessments;
  drop policy if exists platform_assessments_admin_all
    on public.platform_assessments;

  drop trigger if exists platform_assessment_bands_touch
    on public.platform_assessment_bands;
  drop trigger if exists platform_assessment_items_touch
    on public.platform_assessment_items;
  drop trigger if exists platform_assessment_domains_touch
    on public.platform_assessment_domains;
  drop trigger if exists platform_assessments_stamp
    on public.platform_assessments;

  drop table if exists public.platform_assessment_responses;
  drop table if exists public.platform_assessment_attempts;
  drop table if exists public.platform_assessment_bands;
  drop table if exists public.platform_assessment_items;
  drop table if exists public.platform_assessment_domains;
  drop table if exists public.platform_assessments;

  drop function if exists internal.touch_platform_assessment_parent();
  drop function if exists internal.stamp_platform_assessment();

  create or replace function internal.assessment_release_title(p_assessment_key text)
  returns text
  language sql
  immutable
  as $title$
    select case
      when p_assessment_key = 'keystone' then 'Keystone Assessment'
      else p_assessment_key
    end;
  $title$;
end;
$$;

revoke all on function internal.rollback_platform_assessment_sandbox()
  from public, anon, authenticated;
grant execute on function internal.rollback_platform_assessment_sandbox()
  to service_role;
