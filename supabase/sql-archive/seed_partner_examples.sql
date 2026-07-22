-- OPTIONAL partner seed. Review before running. Run after
-- 20260722180000_partner_config_foundation.sql.
--
-- Creates the two pilot partners as orgs, each with a slug, a visibility, an
-- assessment set, and an empty branding row you then fill from Studio. Idempotent.
-- Does NOT seed the Arkansas Army National Guard. Add that one privately with
-- visibility = 'private' so it never appears in any public listing.

-- Returning Home: reentry, substance-use treatment (CRI), and alternative
-- sentencing (CAP). The father and manhood tracks already fit these populations.
insert into public.orgs (name, slug, short_name, visibility, status)
values ('Returning Home, Inc.', 'returning-home', 'Returning Home', 'public', 'active')
on conflict (slug) where slug is not null do nothing;

-- Loving Choices: women's center whose wedge into fathering is its Support for
-- Dads and parenting tracks. Starts on the father profile; a new-and-expectant
-- father variant can be authored later and added to its set with one row.
insert into public.orgs (name, slug, short_name, visibility, status)
values ('Loving Choices', 'loving-choices', 'Loving Choices', 'public', 'active')
on conflict (slug) where slug is not null do nothing;

-- Assessment sets (catalog slugs from the registry).
insert into public.org_assessments (org_id, assessment_slug, sort, required)
select o.id, x.slug, x.sort, x.required
from public.orgs o
join (values
  ('returning-home', 'keystone-father-profile',  10, true),
  ('returning-home', 'keystone-manhood-profile', 20, false),
  ('loving-choices', 'keystone-father-profile',  10, true)
) as x(org_slug, slug, sort, required) on o.slug = x.org_slug
on conflict (org_id, assessment_slug) do nothing;

-- Empty branding rows to fill from Studio (logos, colors, section photos).
insert into public.org_branding (org_id)
select id from public.orgs where slug in ('returning-home', 'loving-choices')
on conflict (org_id) do nothing;

select 'partner examples seeded' as status,
  (select count(*) from public.orgs where slug in ('returning-home','loving-choices')) as partner_orgs,
  (select count(*) from public.org_assessments a
     join public.orgs o on o.id = a.org_id
     where o.slug in ('returning-home','loving-choices')) as assessment_assignments;
