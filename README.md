# Fathers.com Platform

Static HTML on Vercel. Postgres, Auth, and secrets on Supabase.
The browser reports. The server decides. Row-level security is the boundary.

Live: https://fathers-com-platform.vercel.app
Repo: this tree is the app. `python3 tools/check_release.py` fails if a referenced file is missing.

## How a change becomes the site

1. Edit sources, not generated HTML.
   - Pages: `build_pages.py`
   - Dashboards: `build_dashboards.py`
   - Short courses: `build_short_courses.py`
   - Emails: `build_emails.py`
   - Course JSON: `content/*.json` via `tools/import_content.py`
2. Rebuild: `python3 build_pages.py && python3 build_dashboards.py && python3 build_short_courses.py`
3. Gate: `python3 tools/check_release.py` (determinism, claim bans, asset manifest)
4. PR to `main`. Vercel serves the committed HTML. Hobby plan: weekday production window 9:15 CT.

Doctrine: `POSITIONING.md`. Process: `CONTRIBUTING.md`. System: `ARCHITECTURE.md`. Roles: `ROLES.md`. Launch: `LAUNCH.md`. Deferred: `docs/DEFERRED.md`.

## Hidden infrastructure

| Layer | Where | Rule |
|---|---|---|
| Pages | generated `*.html` | never hand-edit; CI fails drift |
| Client | `assets/js/` | UX only; no prices, no eligibility, no secrets |
| Public config | `assets/js/config.js` | anon key is public by design; never put a service role here |
| Schema | `supabase/migrations/` | `supabase db push`. No dashboard SQL without a file |
| Historical SQL | `supabase/sql-archive/` | record of hand-applied SQL. Do not run again |
| Secrets / money / grades | `supabase/functions/` | service role, explicit auth. Browser never holds the token |
| Release | `tools/check_release.py` | repo is the whole app |

Edge functions in play: `checkout`, `checkout-hook`, `checkpoint_submit`, `progress_beat`, `submit_award`, `review_award`, `issue-certificate`, `send-email`, `esign-bridge`, `verify_serial`. Deploy with `supabase functions deploy`.

Auth is email + password. Magic link is retired. `SHOW_MILITARY` and `SHOW_MANHOOD_COURSE` ship surfaces dark.

## Local

```bash
python3 build_pages.py && python3 build_dashboards.py && python3 build_short_courses.py
python3 tools/check_release.py
for f in assets/js/*.js; do node --check "$f"; done
```

Fresh database: `SUPABASE_DB_URL=... bash tools/bootstrap_db.sh`, then `supabase db push` and `supabase functions deploy`.

Upload zips (`fathers-com_NN.zip`) are diffs of a release, not the tree. Auditing a zip alone will report missing files by design.

## What a Friday reader should hold

- RLS is security. Client checks are UX.
- A father never pays. Claims gate certificates, not the Profile or the films.
- Facilitators see progress Y/N and counts, never answers or scores.
- Practices must not require a child visit.
- Previews currently read production `config.js`. Do not use a preview to mutate prod data.
