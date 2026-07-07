# SQL archive (historical record)

These files were applied by hand to production before migration discipline was
adopted. They are kept for the record and are the reference for what the
baseline migration should contain. Do not run them again blindly; most are
idempotent, but the source of truth going forward is supabase/migrations/.

Applied set: schema.sql, schema_keystone.sql, schema_rbac.sql,
veterans_schema.sql, circles_setup.sql, seed_certificate_courses.sql,
certificate_accountability.sql.
