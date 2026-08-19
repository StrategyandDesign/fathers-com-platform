# Content Pipeline
### The one job left: films and their questions. This is the rail.
AUDIT-V41 WP-J deliverable.

## The format
One JSON per course in `content/`, versioned in git. See
`content/coming-home-present.example.json` for the shape. Rules the importer
enforces: every video carries a real `duration_seconds` greater than zero (no
film, no row); at least three checkpoint questions per video, five
recommended, because eighty percent of two is perfection; `correct_index` in
range; two to five choices; unique `ord`; a non-empty final; and no banned
claim strings inside prompts, because course content obeys the same law as
pages.

## The import
```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  python3 tools/import_content.py content/<course>.json [--create]
```
The service key comes from the project dashboard, lives only in your shell
env, and never enters git or any client bundle. The importer upserts, so
re-running after edits is safe.

## Vimeo hygiene, per film
Set each film to unlisted with domain-level privacy restricted to the
deployment domains. Read `duration_seconds` from the Vimeo video settings and
carry it into the JSON exactly. The player already pins the experience: no
download, no picture-in-picture, no speed control (`pip=0&speed=0&dnt=1` in
the embed).

## The publication rule
A course publishes only when every one of its video rows has a live film.
No film-in-production rows inside a published course; the written sessions
pages carry the interim story instead. This is also what makes the server's
no-film rejection unreachable in production.

## Staging the full flow before films (placeholder mode)
The whole participant workflow can run live before a single film exists:
every session shows its Film in production card with a direct link to the
written session, the checkpoint opens immediately, passing it unlocks the
next session, and the forward and back arrows work throughout. No time is
ever credited against a placeholder, and the certificate record stays
honest: the facilitator attests contact hours; independent minutes read
zero until real films land.

Seed all five courses with real checkpoints and finals:
```
python3 tools/import_content.py content/fundamentals.json --create --allow-placeholders
python3 tools/import_content.py content/reentry.json      --create --allow-placeholders
python3 tools/import_content.py content/anger.json        --create --allow-placeholders
python3 tools/import_content.py content/coparenting.json  --create --allow-placeholders
python3 tools/import_content.py content/manhood.json      --create --allow-placeholders
```
Then open the courses to participants (SQL editor, one line):
```
update certificate_courses set published = true
 where slug in ('fundamentals','reentry','anger','coparenting');
```
Leave manhood unpublished until the course flag flips.

## The video swap, when films arrive
Edit the course JSON: replace "pending" with the real Vimeo id and 0 with
the real duration_seconds, per film. Re-run the importer WITHOUT
--allow-placeholders; the upsert replaces each row in place, the room
starts crediting measured time against that session immediately, and
strict validation guarantees no placeholder survives into a fully
published course. Nothing else changes: same checkpoints, same finals,
same serials, same room.
