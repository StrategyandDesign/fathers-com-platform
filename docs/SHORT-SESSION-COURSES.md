# Short-session film courses (12 weeks)

## Why this format
A long lecture creates one distant finish line. Men drop off mid-course. Research on habit formation and microlearning favors more finish lines: one short film, one checkpoint, one lived practice. Completing a week is a win a father can stack. This is a twelve-week loop, not a twelve-hour lecture.

## Locked format
Each week of Steady Under Pressure, Coming Home Present, and Same Team:

1. Watch one teaching film (about six minutes)
2. Pass the checkpoint
3. Complete the lived practice (required for the week to count)
4. Optional 60 to 90 second practice replay if a URL is present (hidden if missing)

Session complete, and certificate complete, means film plus checkpoint plus practice. Not seat time.

- **12 cycles** per course
- Suggested week, sequential unlock is fine, self-paced is fine
- `vimeo`: `"pending"` until films upload
- Copy: plain, father-facing, facilitator-supported self-paced
- Practices never require contact beyond what a court order allows
- Do not invent duration numbers. `duration_seconds` stays measured from the film.

## Hours copy
Talk about **12 weeks** and a **short film**, not a 12-hour lecture. Certificate metadata hours remain the measured film total already on the course record. Do not pad them.

## Courses on this loop
1. **Steady Under Pressure** (`slug: anger`)
2. **Coming Home Present** (`slug: reentry`). Audience: fathers in rehab or treatment preparing to reconnect with children and/or a significant other.
3. **Same Team** (`slug: coparenting`)

Optional practice replay paths for Steady look like `assets/video/steady/s01-practice-replay.mp4`. The player hides the control when the path is missing and tolerates a 404.

## Facilitator surfaces
Completion flags only: film, checkpoint, practice. No answers, no scores, no practice log text on the Desk.

## Start here
Each course has one Ken and Micah face intro before Session 1. Optional. Not a week and not counted toward the certificate. The player hides the mp4 slot if the file 404s and still shows the two spoken blocks. After the film ends, or Skip, Session 1. The welcome does not play before weeks 2 through 12.

## Explicitly unchanged
**Fathering Fundamentals** session count stays as shipped (nine sessions, not the 12-week film loop). It still gets the same Start here welcome. Do not rewrite it into 12 weeks.

## Source of truth
- Player JSON: `content/anger.json`, `content/reentry.json`, `content/coparenting.json` (each video carries `practice` `{title, prompt, how}` and optional `practice_replay`)
- Marketing curriculum: `content/short-course-pages.json`
- Generator: `build_short_courses.py` (writes course HTML bodies; `build_pages.py` loads those bodies via shared helpers so a future `python3 build_pages.py` does not restore the old 60-minute pages)
- Player: `assets/js/coursework.js`
- Preview catalog: `assets/js/course-demo-data.js` (localStorage in preview)

## Rebuild
```bash
python3 build_short_courses.py   # refresh course HTML from short-course-pages.json and keep build_pages wired
python3 build_pages.py           # regenerate site pages; short courses come from the helper
```

## Retention note
More finish lines beat one long lecture. A man can finish a short film on a break, log the practice, and come back next week for the next win.
