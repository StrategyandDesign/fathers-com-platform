# Roles, permissions, and dashboards

Permissions are enforced in the database (Postgres RLS), not the UI. If someone bypasses the interface and calls the API directly, the same rules apply. The dashboards only shape what each role sees.

## Roles
| Role | Can do | Dashboard |
|---|---|---|
| admin | Everything: grant/revoke roles, create orgs, see all people and content, read the audit log, issue certificates | admin.html |
| instructor | Build and publish courses (lessons + Vimeo + workbooks + drip), build and publish assessment instruments, issue certificates | studio.html |
| content_reviewer | Read drafts before publish (review workflow hook; same read scope as authors) | studio.html (read) |
| org_admin | Manage their organization's seats, invite men, see participation counts (never individual answers or scores) | org.html |
| circle_leader | Plan a Circle's weeks, post announcements, moderate posts, see their roster | lead.html |
| member | Take assessments, work a plan, watch lessons, post in their Circle | plan.html (default) |

Every signed-in user is a member by default. Roles are additive and, for org_admin and circle_leader, scoped to a specific org.

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
