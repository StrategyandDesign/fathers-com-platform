# Roles, permissions, and dashboards

Permissions are enforced in the database (Postgres RLS), not the UI. If someone bypasses the interface and calls the API directly, the same rules apply. The dashboards only shape what each role sees.

## Roles
DB role keys are stable; display names carry the v4.0 certification positioning (see POSITIONING.md §11).

| Role (DB key) | Positioned as | Can do | Dashboard |
|---|---|---|---|
| admin | NCF Registrar | Everything: grant/revoke roles, create orgs, see all people and content, read the audit log, issue Certificates of Completion, maintain the registry | admin.html |
| instructor | NCF curriculum staff | Build and publish courses (lessons + Vimeo + workbooks + drip), build and publish assessment instruments, issue certificates | studio.html |
| content_reviewer | NCF reviewer | Read drafts before publish (review workflow hook; same read scope as authors) | studio.html (read) |
| org_admin | Certified Organization admin | Manage their organization's seats, invite men, see participation counts (never individual answers or scores) | org.html |
| circle_leader | Certified Facilitator | Run cohorts from the Facilitator Desk: plan the weeks, post announcements, moderate, see their roster. Public credential status lives in the registry | lead.html |
| member | Participant | Take assessments, work a plan, watch lessons, post in their Circle. Pays nothing, ever | plan.html (default) |

Every signed-in user is a member (Participant) by default. Roles are additive and, for org_admin and circle_leader (Certified Organization admin and Certified Facilitator), scoped to a specific org. The Certified Facilitator credential itself belongs to the person and follows them across organizations; the circle_leader grant is the per-org operating permission.

## Who can build what
- Courses, lessons, videos (Vimeo), workbooks, drip schedules: instructor or admin, in Studio.
- Assessment instruments (items, response scales, domains, domain and item weights, reverse-scoring, scoring formula, interpretation bands): instructor or admin, in Studio. Publishing an instrument makes it the live assessment on the Keystone page. Responses are immutable once submitted, so results are auditable.
- Certificates: issued by instructor or admin through a security-definer function that stamps a unique serial and writes an auditable row. Public verification reads a limited view.

## Measurable and auditable
- Instrument responses store the overall score, per-domain scores, the gap domain, and every raw item answer, with a timestamp. No update or delete policy exists on responses, so the record cannot be altered after the fact.
- Privileged actions (role grants, publishes, org creation, certificate issuance) write to `audit_log`, readable only by admins.

## First admin
After you sign in once, run this in the Supabase SQL editor, replacing the email:
```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@fathers.com';
```
From then on, grant every other role from the Admin dashboard.

## Communications (launch scope)
- Circle discussion threads (member to member, within a Circle).
- Circle announcements (leader to cohort).
- Triggered email via Resend (welcome, weekly plan, invite, certificate, and the rest in `emails/`).
Direct member-to-member messaging and real-time chat are deliberately deferred.
