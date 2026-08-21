#!/usr/bin/env bash
# Cold-start a fresh Supabase project from this repo (AUDIT-V42 PL-2).
# The base schema predates the migrations directory; this script applies it
# in order, then hands off to `supabase db push` for the ordered migrations.
# Usage:  SUPABASE_DB_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres' \
#         bash tools/bootstrap_db.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the project's Postgres connection string}"
here="$(cd "$(dirname "$0")/.." && pwd)"
for f in \
  supabase/schema.sql \
  supabase/schema_rbac.sql \
  supabase/schema_keystone.sql \
  supabase/sql-archive/certificate_accountability.sql \
  supabase/sql-archive/circles_setup.sql \
  supabase/sql-archive/seed_certificate_courses.sql
do
  echo "== applying $f"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/$f"
done
echo "== base schema applied; now run: supabase db push && supabase functions deploy"
