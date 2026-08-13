# SQL archive (historical record)

Hand-applied to production before `supabase/migrations/` became the only path.
Kept so a reviewer can see what the baseline contains.

**Do not run these files.** Apply schema through `supabase db push` only.

| File | What it was |
|---|---|
| schema.sql | Original public schema |
| schema_keystone.sql | Keystone instruments and results |
| schema_rbac.sql | `user_roles` and RLS |
| circles_setup.sql | Circles, weeks, announcements |
| certificate_accountability.sql | Awards, serials, checkpoints |
| seed_certificate_courses.sql | Course seed |
| seed_partner_examples.sql | Partner examples |
| veterans_schema.sql | Veteran hub (surface is dark: `SHOW_MILITARY=False`) |

Live migrations: `../migrations/`.
