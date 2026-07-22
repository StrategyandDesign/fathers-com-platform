-- Partner configuration foundation. Additive and idempotent.
--
-- Purpose: let each pilot partner (Returning Home, Loving Choices, and later a
-- discreet Arkansas Army National Guard engagement) carry its own report
-- branding, its own set of assessments, and its own set of courses, resolved at
-- render time from the org a participant already belongs to. Nothing here changes
-- live behavior on its own. It is the layer the report renderer, the participant
-- dashboard, and the Studio branding editor read once wired.
--
-- Canonical tenant table is public.orgs. public.organizations is legacy; the v2
-- reconcile migration re-points foreign keys to orgs. This file only touches orgs.

-- 1. ORG PROFILE FIELDS --------------------------------------------------------
-- slug is the stable public handle for per-partner URLs and deep links.
-- visibility governs discretion: public partners can appear anywhere, unlisted and
-- private partners never leak by slug and are hidden from non-members.
alter table public.orgs add column if not exists slug       text;
alter table public.orgs add column if not exists short_name text;
alter table public.orgs add column if not exists visibility text not null default 'unlisted'
  check (visibility in ('public','unlisted','private'));
alter table public.orgs add column if not exists status     text not null default 'active'
  check (status in ('active','paused','ended'));
create unique index if not exists uq_orgs_slug on public.orgs (slug) where slug is not null;

-- 2. PER-PARTNER REPORT BRANDING ----------------------------------------------
-- Same field set as the global report_branding row, keyed by org instead of the
-- single id=1. The renderer resolves the viewer's org here first and falls back to
-- report_branding when a partner has no row.
create table if not exists public.org_branding (
  org_id             uuid primary key references public.orgs(id) on delete cascade,
  logo_primary       text,
  logo_secondary     text,
  accent             text not null default '#E8E84A',
  accent2            text not null default '#B08D57',
  photo_cover        text,
  photo_footer       text,
  photo_dimensions   text,
  photo_practices    text,
  photo_satisfaction text,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
alter table public.org_branding enable row level security;

-- 3. PER-PARTNER ASSESSMENT SET ------------------------------------------------
-- The client registry is the CATALOG of assessments that exist. This table is the
-- ASSIGNMENT: which of them a partner offers, in what order, which are required.
-- assessment_slug matches the registry slug and keystone_results.assessment_slug.
create table if not exists public.org_assessments (
  org_id          uuid not null references public.orgs(id) on delete cascade,
  assessment_slug text not null,
  label_override  text,
  sort            int  not null default 0,
  active          boolean not null default true,
  required        boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (org_id, assessment_slug)
);
alter table public.org_assessments enable row level security;

-- 4. PER-PARTNER COURSE SET (staged; table ready, not yet consumed) ------------
create table if not exists public.org_courses (
  org_id         uuid not null references public.orgs(id) on delete cascade,
  course_ref     text not null,          -- class or course slug in the existing catalog
  label_override text,
  sort           int  not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  primary key (org_id, course_ref)
);
alter table public.org_courses enable row level security;

-- 5. ROW LEVEL SECURITY --------------------------------------------------------
-- Read: a row is visible if its org is public, OR the caller is an admin of that
--   org, OR the caller is an active participant claimed into that org. This hides
--   an unlisted or private partner from anon and from non-members.
-- Write: an admin of the org, or a platform admin or instructor.
-- Predicates are inlined because the live baseline uses org_admins and has_role
-- directly rather than the archived admins_org and leads_org helpers.
do $$
declare tbl text;
begin
  foreach tbl in array array['org_branding','org_assessments','org_courses'] loop
    execute format('drop policy if exists %I on public.%I', tbl||'_read',  tbl);
    execute format('drop policy if exists %I on public.%I', tbl||'_write', tbl);

    execute format($f$
      create policy %1$I on public.%2$I for select to anon, authenticated
      using (
        exists (select 1 from public.orgs o where o.id = %2$I.org_id and o.visibility = 'public')
        or exists (select 1 from public.org_admins oa
                   where oa.org_id = %2$I.org_id and oa.user_id = auth.uid())
        or exists (select 1 from public.participant_claims pc
                   where pc.org_id = %2$I.org_id and pc.status = 'active'
                     and (pc.user_id = auth.uid()
                          or lower(pc.participant_email) = lower(coalesce(auth.jwt() ->> 'email',''))))
      )
    $f$, tbl||'_read', tbl);

    execute format($f$
      create policy %1$I on public.%2$I for all to authenticated
      using (
        public.has_role('admin') or public.has_role('instructor')
        or exists (select 1 from public.org_admins oa
                   where oa.org_id = %2$I.org_id and oa.user_id = auth.uid())
      )
      with check (
        public.has_role('admin') or public.has_role('instructor')
        or exists (select 1 from public.org_admins oa
                   where oa.org_id = %2$I.org_id and oa.user_id = auth.uid())
      )
    $f$, tbl||'_write', tbl);
  end loop;
end $$;

grant select on public.org_branding, public.org_assessments, public.org_courses to anon, authenticated;
grant insert, update, delete on public.org_branding, public.org_assessments, public.org_courses to authenticated;

-- 6. CLIENT RESOLVER -----------------------------------------------------------
-- One call the report renderer and the participant dashboard use to theme and to
-- list a partner's assessments by slug. Returns nothing for an unlisted or private
-- partner unless the caller belongs to it, so a discreet engagement never leaks.
create or replace function public.get_org_report_config(p_slug text)
returns table (
  org_id uuid, name text, short_name text, slug text, visibility text,
  branding jsonb, assessments jsonb
)
language plpgsql security definer set search_path = public as $$
declare v_org public.orgs%rowtype;
begin
  select * into v_org from public.orgs where slug = p_slug;
  if not found then return; end if;

  if v_org.visibility <> 'public'
     and not exists (select 1 from org_admins oa where oa.org_id = v_org.id and oa.user_id = auth.uid())
     and not exists (select 1 from participant_claims pc
                     where pc.org_id = v_org.id and pc.status = 'active'
                       and (pc.user_id = auth.uid()
                            or lower(pc.participant_email) = lower(coalesce(auth.jwt() ->> 'email',''))))
     and not public.has_role('admin') and not public.has_role('instructor')
  then
    return;  -- discreet: no config unless you belong to it
  end if;

  return query
  select v_org.id, v_org.name, v_org.short_name, v_org.slug, v_org.visibility,
         (select to_jsonb(b) - 'org_id' - 'updated_at' - 'updated_by'
            from org_branding b where b.org_id = v_org.id),
         coalesce((select jsonb_agg(jsonb_build_object(
                     'slug',     a.assessment_slug,
                     'label',    a.label_override,
                     'sort',     a.sort,
                     'required', a.required) order by a.sort, a.assessment_slug)
                   from org_assessments a where a.org_id = v_org.id and a.active), '[]'::jsonb);
end $$;
revoke all on function public.get_org_report_config(text) from public;
grant execute on function public.get_org_report_config(text) to anon, authenticated;

select 'partner_config_foundation ready' as status,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='orgs' and column_name='slug') as orgs_slug_col,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name in ('org_branding','org_assessments','org_courses')) as new_tables;
