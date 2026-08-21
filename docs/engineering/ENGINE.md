# The Engine: opening the spine to partner verticals

The certification infrastructure is content-agnostic by design: instruments
and courses are Studio data, and organizations, facilitators, claims,
certificates, verification, revocation, and Efficacy Reports never depend on
the subject being fatherhood in any particular context. This document tracks
the five requirements for handing the engine to an outside subject-matter
authority, what shipped, and what remains.

## Status of the five requirements

1. Signatory parameterization. SHIPPED (v4.7.0). certificates rows carry
   signatory_name and signatory_title. The issue-certificate function
   resolves them from the course's vertical; with no vertical it signs
   Dr. Ken Canfield, Founder, National Center for Fathering, exactly as
   before. Renderers print the row's signatory when present; the sample
   certificate on marketing pages stays NCF's by design.
2. Serial namespacing. SHIPPED for certificates (v4.7.0). Each vertical
   carries a unique cert_prefix in platform_verticals; the function mints
   PREFIX-YYYY-NNNNNN. FC remains NCF's. Phase two: per-vertical facilitator
   and organization prefixes (today NCF-F and NCF-O certify people and orgs
   under NCF's registry for every vertical, which is also a legitimate
   governance choice: one registrar, many standards).
3. Track routing. SHIPPED as mechanism (v4.7.0). VERTICALS in build_pages.py
   renders an entry page per vertical as a page-set: headline, blurb,
   authority line, measure-train-prove, contact. Empty by default; zero
   output change until a vertical is added. Subdomain routing is a Vercel
   setting on top of the same pages when wanted.
4. Norms authority. SHIPPED at the data layer (v4.7.0). instruments carries
   norms_authority and norms_statement; platform_verticals carries
   authority_statement. Studio and the report renderer print them when
   present. The engine hosts the instrument; the authority owns its
   validity, the way Dr. Canfield owns Keystone's.
5. Governance and license. DRAFTED. partner-kit/engine-license-outline.md is
   the counsel-review skeleton. The three invariants are non-negotiable in
   every license: the participant document is always a Certificate of
   Completion; verification is always public with revocation always shown;
   the education line always holds.

## Launching a vertical: the checklist

1. Sign the license (counsel finalizes from the outline).
2. Registrar inserts the platform_verticals row: slug, name, unique
   cert_prefix, authority name and title, authority statement, active=true.
3. Studio: build the vertical's instrument under its own slug; set
   norms_authority and norms_statement. Publish when its authority signs
   off, the same bar Keystone holds.
4. Studio: build the course set; set vertical_id on each course.
5. Builder: add the VERTICALS entry in build_pages.py; regenerate; upload.
6. Certify the vertical's first organization and facilitators through the
   standard runbook (docs/ORG-ONBOARDING.md), supervised first cohort
   included. The supervision requirement transfers to every vertical.
7. Report branding per assessment (migration 20260723) carries the
   vertical's identity on its reports.

## Deployment order for v4.7.0 (owner: Alon)

1. Apply supabase/migrations/20260810120000_roster_verification_export.sql
   and 20260810140000_engine_verticals.sql.
2. Deploy the updated issue-certificate function. The migration must land
   first; the function writes the new columns.
3. Upload the regenerated pages (fathers-com_26).

## Phase two, honest list

1. Per-vertical facilitator and organization serial prefixes and registries.
2. Per-vertical email templates and sender identity.
3. Entry-page routing straight into the vertical's instrument once
   multi-instrument routing on the profile page ships from Studio.
4. Signatory display in the issued-certificate renderer and printed
   ceremony certificate.
5. Subdomain per vertical (Vercel domain mapping onto the same pages).
