# Database migrations

From the baseline onward, every schema change is a timestamped file in this
directory, applied with the Supabase CLI. Hand-run SQL without a migration file
is prohibited: it creates drift that no one can reproduce or roll back.

## One-time adoption (owner, ~10 minutes)

The production database was built by hand-applied SQL (now archived in
../sql-archive/). Take the baseline so history starts from reality:

```bash
npm install -g supabase
supabase login
supabase link --project-ref kemqpiboqeqhbuuldmls
supabase db pull        # snapshots the LIVE schema as the first migration file
git add supabase/migrations && git commit -m "Baseline production schema"
```

## Every change after the baseline

```bash
supabase migration new short_change_name   # creates the timestamped file
# write the SQL in the new file
supabase db push                           # applies pending migrations
```

The migration file ships in the same PR as the code that needs it.
