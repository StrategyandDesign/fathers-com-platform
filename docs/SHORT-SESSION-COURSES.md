# Short-session film courses (12 x ~12 minutes)

## Why this format
Long hour-long film sessions create one distant finish line. Men drop off mid-course. Research on habit formation and microlearning favors more finish lines: one scene, one skill, one practice, and a short checkpoint. Completing a twelve-minute session is a win a father can stack the same week.

## Locked format
- **12 sessions** per course
- **~12 minutes of film** each (`duration_seconds`: 720)
- Structure: one scene, one skill, one practice, short checkpoint (2 to 3 MCQ)
- `vimeo`: `"pending"` until films upload
- Copy: plain, father-facing, facilitator-supported self-paced
- Practices never require contact beyond what a court order allows

## Courses rewritten
1. **Steady Under Pressure** (`slug: anger`) — was 6 x 60 min; now 12 x ~12 min
2. **Coming Home Present** (`slug: reentry`) — was 8 x 60 min; now 12 x ~12 min. Audience: fathers in rehab or treatment preparing to reconnect with children and/or a significant other; service members returning home are the second application of the same skills.
3. **Same Team** (`slug: coparenting`) — was 6 x 60 min; now 12 x ~12 min

Certificate metadata hours for all three: **3.0** (12 x 12 min = 2.4h film, rounded for display).

## Explicitly unchanged
**Fathering Fundamentals** (`content/fundamentals.json` and its pages) is untouched. Session count stays 5. Do not rewrite it in this pass.

## Source of truth
- Player JSON: `content/anger.json`, `content/reentry.json`, `content/coparenting.json`
- Marketing curriculum: `content/short-course-pages.json`
- Generator: `build_short_courses.py` (writes course HTML bodies; `build_pages.py` loads those bodies via shared helpers so a future `python3 build_pages.py` does not restore the old 60-minute pages)

## Rebuild
```bash
python3 build_short_courses.py   # refresh course HTML from short-course-pages.json and keep build_pages wired
python3 build_pages.py           # regenerate site pages; short courses come from the helper
```

## Retention note
More finish lines beat one long lecture. Topics stay spot-on; length changes. A man can finish a session on a break, log the practice, and come back tomorrow for the next win.
