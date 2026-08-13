# Roles, permissions, and dashboards

Permissions are enforced in the database (Postgres RLS), not the UI. If someone bypasses the interface and calls the API directly, the same rules apply. The dashboards only shape what each role sees.

## Roles
DB role keys are stable; display names carry the v4.0 certification positioning (see POSITIONING.md §11).

| Role (DB key) | Positioned as | Can do | Dashboard |
|---|---|---|---|
| admin | NCF Registrar | Everything: grant/revoke roles, create orgs, mint join codes, see all people and content, read the audit log, issue Certificates of Completion, maintain the registry | admin.html |
| instructor | NCF curriculum staff | Build and publish courses (lessons + Vimeo + workbooks + drip), build and publish assessment instruments, issue certificates | studio.html |
| content_reviewer | NCF reviewer | Read drafts before publish (review workflow hook; same read scope as authors) | studio.html (read) |
| org_admin | Certified Organization admin | Manage their organization's seats, invite men, see participation counts (never individual answers or scores). **Must have org_id.** | org.html |
| circle_leader | Certified Facilitator | Support men from the Facilitator Desk: claim seats, see roster and progress. **Must have org_id.** Live cohort co-watch is optional. Public credential status lives in the registry | lead.html |
| member | Participant | Take assessments, work a plan, watch lessons. Pays nothing, ever | plan.html (default) |

Every signed-in user is a member (Participant) by default. Roles are additive and, for org_admin and circle_leader, scoped to a specific org. The Certified Facilitator credential belongs to the person; the circle_leader grant is the per-org operating permission.

## Friday path (Returning Home)
Grant **both** `org_admin` and `circle_leader` to the same person, each with the Returning Home `org_id`. That opens org.html and lead.html. `lead.html` stays circle_leader-gated; do not change that guard. Do not insert those roles without an org. Unscoped circle_leader rows are fixed by re-granting from Admin → Orgs.

Mint join codes from Admin → Orgs. Do not mail Team@ for setup. Do not seed grants from SQL unless the registrar has no UI.

## Who can build what
- Courses, lessons, videos (Vimeo), workbooks, drip schedules: instructor or admin, in Studio.
- Assessment instruments: instructor or admin, in Studio.
- Certificates: issued by instructor or admin through a security-definer function.

## First admin
After you sign in once, run this in the Supabase SQL editor, replacing the email:
```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@fathers.com';
```
From then on, grant every other role from the Admin dashboard.

## Communications (launch scope)
Circle announcements stay dark unless a Circle has meeting time. Triggered email: org-invite from org.js only. Cadence templates are not wired. Direct member-to-member messaging is deferred.
