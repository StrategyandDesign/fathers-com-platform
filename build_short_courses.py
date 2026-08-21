#!/usr/bin/env python3
"""Generate short-session marketing pages for anger / reentry / coparenting / fundamentals.

Reads content/short-course-pages.json and writes:
  - course-steady-under-pressure.html
  - course-coming-home-present.html
  - course-same-team.html
  - course-fathering-fundamentals.html

Also exposes helpers used by build_pages.py so future rebuilds do not wipe
the session bodies. Injects shape stills + practice checkpoints under each slot.
"""
from __future__ import annotations

import html as html_lib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content" / "short-course-pages.json"

COURSE_KEYS = ("anger", "reentry", "coparenting", "fundamentals")

STILL_DIR = {
    "anger": "steady-under-pressure",
    "reentry": "coming-home-present",
    "coparenting": "same-team",
    "fundamentals": "fathering-fundamentals",
}

VIDEO_FOR_SESSION = {
    # (slug, ord) -> relative mp4 path
    ("anger", 1): "assets/video/steady/s01-the-surge-is-a-signal.mp4",
    ("anger", 2): "assets/video/steady/s02-know-your-early-cues.mp4",
    ("anger", 3): "assets/video/steady/s03-six-seconds.mp4",
    ("anger", 4): "assets/video/steady/s04-the-long-exhale.mp4",
    ("anger", 5): "assets/video/steady/s05-step-away-to-come-back.mp4",
    ("anger", 6): "assets/video/steady/s06-the-line-you-leave-on.mp4",
    ("anger", 7): "assets/video/steady/s07-name-the-feeling.mp4",
    ("anger", 8): "assets/video/steady/s08-feelings-without-weapons.mp4",
    ("anger", 9): "assets/video/steady/s09-own-it-same-day.mp4",
    ("anger", 10): "assets/video/steady/s10-the-short-apology.mp4",
    ("anger", 11): "assets/video/steady/s11-sleep-food-movement.mp4",
    ("anger", 12): "assets/video/steady/s12-your-steady-week.mp4",
}


def load_courses():
    with open(CONTENT, encoding="utf-8") as f:
        data = json.load(f)
    return data


def _e(s: str) -> str:
    return html_lib.escape(s or "", quote=False)


def _q(s: str) -> str:
    """Wrap a quote with typographic quotes for HTML bodies."""
    return "&ldquo;" + _e(s) + "&rdquo;"


def practice_html(sess: dict) -> str:
    before = sess.get("before_return")
    after = sess.get("after_return")
    parts = [
        '<div class="card" style="background:rgba(127,127,127,.07);padding:16px 18px;margin-bottom:10px">',
        '    <p class="fine mono" style="margin-bottom:8px;letter-spacing:.06em">THE PRACTICE</p>',
    ]
    if before or after:
        if before:
            parts.append(
                f'    <p class="small" style="margin-bottom:6px"><b>Before the return:</b> {_e(before)}</p>'
            )
        if after:
            parts.append(f'    <p class="small"><b>After the return:</b> {_e(after)}</p>')
    else:
        parts.append(f'    <p class="small">{_e(sess.get("practice", ""))}</p>')
    parts.append(
        '    <p class="fine" style="margin-top:8px;color:var(--ash)">Complete this in the player after you pass the checkpoint. That is when the week counts.</p>'
    )
    parts.append("  </div>")
    return "\n".join(parts)


def session_article(course: dict, sess: dict) -> str:
    prefix = course["id_prefix"]
    ord_ = sess["ord"]
    sid = f"{prefix}{ord_}"
    vkey = f"{course['video_prefix']}{ord_}"
    slug = course["slug"]
    demo_href = f"course.html?preview=1&amp;cert={_e(slug)}"
    science = sess.get("science")
    science_html = (
        f'  <p class="fine" style="color:var(--ash)">The science in the room: {_e(science)}</p>\n'
        if science
        else ""
    )
    stills_dir = course.get("stills_dir") or STILL_DIR.get(slug, slug)
    still_src = f"assets/img/session-stills/{stills_dir}/s{int(ord_):02d}.png"
    mp4 = VIDEO_FOR_SESSION.get((slug, int(ord_)))
    if mp4:
        media = (
            '    <div class="vs-media" data-motion="media-fade">\n'
            f'      <video controls playsinline preload="metadata" poster="{_e(still_src)}"'
            f' src="{_e(mp4)}"></video>\n'
            '    </div>\n'
        )
        caption = (
            '    <div class="vs-caption">\n'
            '      <p class="eyebrow brass">SESSION FILM</p>\n'
            '      <p class="fine" style="color:var(--ash)">Watch there, then take the checkpoint and complete this week\'s practice.</p>\n'
            f'      <p style="margin-top:10px"><a class="btn btn-yellow btn-sm" href="{demo_href}">Open in the player</a></p>\n'
            '    </div>\n'
        )
    else:
        media = (
            '    <div class="vs-media" data-motion="media-fade">\n'
            f'      <img src="{_e(still_src)}" alt="{_e(sess["title"])}">\n'
            '    </div>\n'
        )
        caption = (
            '    <div class="vs-caption">\n'
            '      <p class="eyebrow brass">THIS WEEK</p>\n'
            '      <p class="fine" style="color:var(--ash)">The film plays in the player.</p>\n'
            f'      <p style="margin-top:10px"><a class="btn btn-yellow btn-sm" href="{demo_href}">Open in the player</a></p>\n'
            '    </div>\n'
        )
    label = sess.get("session_label") or f"SESSION {ord_}"
    length = sess.get("length_label") or (
        "one session" if slug == "fundamentals" else "~6 MIN"
    )
    return (
        f'<article class="card" style="padding:26px 28px;margin-bottom:18px" id="{sid}">\n'
        f'  <div class="row between" style="margin-bottom:10px"><span class="pill">{_e(label)}</span><span class="fine mono">{_e(length)}</span></div>\n'
        f'  <h3 class="d-28" style="margin-bottom:12px">{_e(sess["title"])}</h3>\n'
        f'  <div class="video-slot vs-still" data-video="{vkey}" data-course="{_e(slug)}" data-session="{ord_}">\n'
        + media + caption +
        '  </div>\n'
        f'  <div class="session-checkpoint" data-session-checkpoint data-course="{_e(slug)}" data-session="{ord_}"></div>\n'
        f'  <p class="lead" style="font-size:17px;margin-bottom:12px">{_q(sess["quote"])}</p>\n'
        f'  <p style="color:var(--ash);margin-bottom:12px"><b>One scene.</b> {_e(sess["scene"])}</p>\n'
        f'  <p style="color:var(--ash);margin-bottom:12px"><b>In the room.</b> {_e(sess["in_room"])}</p>\n'
        f'  <p style="color:var(--ash);margin-bottom:14px"><b>What you leave with.</b> {_e(sess["leave_with"])}</p>\n'
        f'  {practice_html(sess)}\n'
        f'{science_html}</article>'
    )



def welcome_html(course: dict) -> str:
    w = course.get("welcome") or {}
    if not (w.get("ken") or w.get("micah") or w.get("title")):
        return ""
    slug = course["slug"]
    demo = f"course.html?preview=1&amp;cert={_e(slug)}&amp;welcome=1"
    skip = f"course.html?preview=1&amp;cert={_e(slug)}"
    video = w.get("video") or f"assets/video/welcomes/{slug}.mp4"
    poster = w.get("poster") or ""
    poster_attr = f' poster="{_e(poster)}"' if poster else ""
    return (
        '<section class="tight course-welcome-band" id="start-here">\n'
        '  <div class="container" style="max-width:var(--max)">\n'
        '    <article class="card course-welcome">\n'
        '      <div class="row between" style="margin-bottom:10px"><span class="pill">START HERE</span><span class="fine mono">OPTIONAL</span></div>\n'
        f'      <h2 class="d-28" style="margin-bottom:8px">{_e(w.get("title") or "Start here")}</h2>\n'
        f'      <p class="fine ash" style="margin:0 0 14px;max-width:52ch">{_e(w.get("speakers") or "Ken Canfield and Micah Canfield")} open this training. You can skip ahead.</p>\n'
        f'      <div class="course-welcome-media"><video controls playsinline preload="metadata"{poster_attr} src="{_e(video)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"></video><div class="cw-placeholder" hidden><p class="small">Ken and Micah open this training when the file is ready.</p></div></div>\n'
        '      <div class="course-welcome-cta">\n'
        f'        <a class="btn btn-yellow" href="{demo}">Open Start here in the player</a>\n'
        f'        <a class="btn btn-secondary" href="{skip}">Skip to session 1</a>\n'
        '      </div>\n'
        '    </article>\n'
        '  </div>\n'
        '</section>\n'
    )


def path_rail_html(course: dict) -> str:
    """Quiet progress pips + collapsed full path. Orientation, not a syllabus dump."""
    sessions = course["sessions"]
    n = len(sessions)
    prefix = course["id_prefix"]
    slug = course["slug"]
    demo_href = f"course.html?preview=1&amp;cert={_e(slug)}"
    pips = "".join(
        f'<span class="course-pip{" is-here" if sess["ord"] == sessions[0]["ord"] else ""}" title="Session {sess["ord"]}"></span>'
        for sess in sessions
    )
    items = []
    if course.get("welcome"):
        items.append(
            '<a class="sag-item sag-welcome" href="#start-here">'
            '<span class="fine mono sag-n">&bull;</span>'
            '<span class="small"><b>Start here</b>'
            ' <span class="ash">&middot; Ken and Micah</span></span></a>'
        )
    for sess in sessions:
        items.append(
            f'<a class="sag-item" href="#{prefix}{sess["ord"]}">'
            f'<span class="fine mono sag-n">{sess["ord"]}</span>'
            f'<span class="small"><b>{_e(sess["title"])}</b>'
            f' <span class="ash">&middot; {_q(sess["quote"])}</span></span></a>'
        )
    first = sessions[0]
    first_ord = int(first["ord"])
    if first_ord > 0:
        eyebrow = f"SESSION {first_ord} OF {n}"
        cta_label = f"Start Session {first_ord} in the player"
    else:
        eyebrow = f"START · {n} SESSIONS"
        cta_label = "Start in the player"
    return (
        '<section class="tight course-focus-band"><div class="container course-focus">'
        f'<div class="eyebrow brass" style="margin-bottom:8px">{eyebrow}</div>'
        f'<h2 class="d-28" style="margin-bottom:8px">{_e(first["title"])}</h2>'
        f'<p class="fine ash" style="margin:0 0 14px;max-width:46ch">{_q(first["quote"])}</p>'
        f'<div class="course-pip-rail" aria-label="Course progress">{pips}</div>'
        '<p class="fine ash" style="margin:10px 0 16px;max-width:46ch">'
        + ('One session at a time. Watch the film, pass the checkpoint, complete the practice. Then the next one opens.</p>'
           if first_ord == 0 else
           'One week at a time. Watch the film, pass the checkpoint, complete the practice. Then the next one opens.</p>')
        + (f'<p class="fine" style="margin:0 0 10px"><a class="link" href="{demo_href}&amp;welcome=1">Start here with Ken and Micah</a></p>' if course.get("welcome") else "") +
        f'<div class="course-focus-cta"><a class="btn btn-yellow" href="{demo_href}">{cta_label}</a></div>'
        f'<details class="course-full-path"><summary class="fine">See the full path ({n} sessions)</summary>'
        + "".join(items)
        + "</details></div></section>"
    )


def billboard_html(course: dict) -> str:
    n = len(course["sessions"])
    minutes = "8 LESSONS" if course.get("slug") == "fundamentals" else "12 WEEKS"
    notes = []
    if course.get("fine2"):
        notes.append(_e(course["fine2"]))
    if course.get("disclaimer"):
        notes.append(_e(course["disclaimer"]))
    notes_html = ""
    if notes:
        body = " ".join(notes)
        notes_html = (
            '      <details class="course-hero-notes">\n'
            '        <summary class="fine">Important notes</summary>\n'
            f'        <p class="fine" style="color:var(--ash);margin:8px 0 0;line-height:1.55">{body}</p>\n'
            '      </details>\n'
        )
    return (
        '\n<section class="band course-hero"><div class="container">\n'
        '  <a class="link ash" href="certificates.html" style="font-size:13px;display:inline-block;margin-bottom:20px">&larr; All courses</a>\n'
        '  <div class="course-intro">\n'
        '    <div class="course-intro-copy">\n'
        f'      <div class="eyebrow brass" style="margin-bottom:14px">FILM COURSE &middot; {n} SESSIONS &middot; {minutes}</div>\n'
        f'      <h1 class="d-36" style="margin-bottom:14px">{_e(course["title"])}</h1>\n'
        f'      <p class="fine mono" style="letter-spacing:.08em;margin-bottom:10px;color:var(--ash)">{_e(course["eyebrow_track"])}</p>\n'
        f'      <p class="lead" style="margin-bottom:12px" data-motion="fade-up">{_e(course["lead"])}</p>\n'
        f'      <p class="fine" style="color:var(--ash);margin-bottom:16px;line-height:1.55">{_e(course["fine1"])}</p>\n'
        f'      <div class="course-hero-cta"><a class="btn btn-yellow" href="profile.html">Start with free Profile</a><a class="btn btn-secondary" href="course.html?preview=1&amp;cert={_e(course["slug"])}">Watch the preview player</a></div>\n'
        '      <p class="fine course-hero-note">Preview is practice only. Earn proof through a Certified Organization.</p>\n'
        f'{notes_html}'
        '    </div>\n'
        '    <div class="course-billboard" aria-hidden="true">\n'
        f'      <img src="{_e(course["photo"])}" alt="">\n'
        '      <div class="cb-shade"></div>\n'
        f'      <div class="cb-copy"><div class="eyebrow">FILM COURSE &middot; {n} SESSIONS</div><h2>{_e(course["title"])}</h2></div>\n'
        '    </div>\n'
        '  </div>\n'
        '</div></section>\n'
    )



def cta_html() -> str:
    return '''
<section class="band"><div class="container" style="max-width:var(--max);text-align:center">
  <h2 class="d-28" style="margin-bottom:10px">Start free. Train on film.</h2>
  <p style="color:var(--ash);max-width:56ch;margin:0 auto 20px">Start with the Keystone Father Profile and your twelve-week plan, or bring this course to the men your organization serves. Facilitator-supported, self-paced.</p>
  <div class="row" style="gap:12px;justify-content:center"><a class="btn btn-primary" href="profile.html">Start with the Profile</a><a class="btn btn-secondary" href="organizations.html">Bring it to your organization</a></div>
</div></section>
'''


def render_course_body(course: dict) -> str:
    sessions = course["sessions"]
    first = session_article(course, sessions[0])
    rest = "\n".join(session_article(course, s) for s in sessions[1:])
    outlines = ""
    if rest:
        rest_sess = sessions[1:]
        a = rest_sess[0]["ord"]
        b = rest_sess[-1]["ord"]
        label = f"Session outlines ({a}–{b})" if a != b else f"Session outlines ({a})"
        outlines = (
            f'<details class="course-outlines">'
            f'<summary class="fine">{label}</summary>\n'
            f'{rest}\n'
            f'</details>\n'
        )
    return (
        billboard_html(course)
        + path_rail_html(course)
        + welcome_html(course)
        + '\n<section><div class="container" style="max-width:var(--max)">\n'
        + first
        + outlines
        + "</div></section>"
        + cta_html()
    )


def page_meta(course: dict) -> dict:
    return dict(
        title=f'{course["title"]}: the sessions',
        desc=course["desc"],
        active="The Courses",
        mode="public",
        body=render_course_body(course),
    )


def sess_peek_ol(course: dict) -> str:
    items = []
    for sess in course["sessions"]:
        items.append(
            f'<li style="margin:5px 0"><b>{_e(sess["title"])}</b> '
            f'<span style="color:var(--ash)">&middot; {_q(sess["quote"])}</span></li>'
        )
    return (
        '<ol class="small" style="margin:8px 0 2px;padding-left:18px">'
        + "".join(items)
        + "</ol>"
    )


def sess_visible_ol(course: dict, n: int = 3) -> str:
    items = []
    for sess in course["sessions"][:n]:
        items.append(
            f'<li><b>{_e(sess["title"])}</b> <span>&middot; {_q(sess["quote"])}</span></li>'
        )
    return '<ol class="sess-visible">\n        ' + "\n        ".join(items) + "\n      </ol>"


def cert_card_html(course: dict) -> str:
    """Static catalog card fragment for certificates.html / build_pages."""
    slug = course["slug"]
    title = course["title"]
    n = len(course["sessions"])
    href = course["html"]
    photo = course["photo"]
    hours = "2.4"
    if slug == "reentry":
        blurb = "Rehab and treatment reconnect first: body, kids and partner, deposits, reunion. Twelve short sessions. Facilitator support when claimed."
        data_desc = "For fathers preparing to reconnect. Self-paced film with a Certified Facilitator available for questions, checkpoints, and a public serial. Whether a court or program accepts it is their call."
    elif slug == "anger":
        blurb = "Steadiness on film: the pause, the repair, and the habits underneath. Twelve short sessions. Facilitator available for questions."
        data_desc = "Steadiness, trained on film: the pause, the repair, and the habits underneath them. Self-paced, with a Certified Facilitator available for questions. Sessions logged, checkpoints, and a final assessment at eighty percent to pass."
    elif slug == "fundamentals":
        blurb = "Seven Secrets assessment and course: intro plus seven secrets. Self-paced film, checkpoints, and a Certified Facilitator available for questions."
        data_desc = "The Seven Secrets of Effective Fathers Assessment and Course. Self-paced sessions with checkpoints, a free assessment, and a Certified Facilitator available for questions."
        hours = "1.1"
    else:
        blurb = "Co-parenting on film. One team for your children, whatever the arrangement. Twelve short sessions. Facilitator available for questions."
        data_desc = "Co-parenting, trained on film. One team for your children, whatever the arrangement between you. Self-paced, with a Certified Facilitator available for questions. Sessions logged, checkpoints, and a final assessment at eighty percent to pass."

    disc = ""
    if course.get("disclaimer"):
        disc = (
            f'      <p class="fine" style="color:var(--ash);margin-top:0;margin-bottom:10px">{_e(course["disclaimer"])}</p>\n'
        )

    peek = sess_peek_ol(course)
    visible = sess_visible_ol(course)
    return f'''    <div class="cert-card" style="cursor:default" data-motion="fade-up" data-cert="{slug}" data-title="{_e(title)}" data-hours="{hours}" data-desc="{_e(data_desc)}">
      <div class="course-card-media">
        <img src="{_e(photo)}" alt="">
        <div class="ccm-overlay"></div>
        <div class="ccm-badges"><span class="pill">Film course</span><span class="ccm-n">{n} sessions</span></div>
      </div>
      <h3>{_e(title)}</h3>
      <p>{_e(blurb)}</p>
{disc}      {visible}
      <details class="sess-peek" style="margin-top:4px"><summary class="fine" style="cursor:pointer;color:var(--brass,#c9a227)">All {n} sessions</summary>{peek}<p class="fine" style="margin:6px 0 0"><a class="link" href="{href}">Open the course &rarr;</a></p></details>
      <div class="cert-card-foot"><span class="mono">Free</span><a class="cert-card-go" href="{href}">Open the course &rarr;</a></div>
    </div>'''


def replace_cert_card(html: str, course: dict) -> str:
    """Replace one catalog card by data-cert, matching nested div depth."""
    slug = course["slug"]
    card = cert_card_html(course)
    if not card.endswith("\n"):
        card += "\n"
    marker = 'data-cert="%s"' % slug
    pos = html.find(marker)
    if pos < 0:
        return html
    start = html.rfind("<div", 0, pos)
    if start < 0:
        return html
    i = start
    depth = 0
    while i < len(html):
        if html.startswith("<div", i):
            depth += 1
            gt = html.find(">", i)
            if gt < 0:
                break
            i = gt + 1
            continue
        if html.startswith("</div>", i):
            depth -= 1
            i += len("</div>")
            if depth == 0:
                if i < len(html) and html[i] == "\n":
                    i += 1
                return html[:start] + card + html[i:]
            continue
        i += 1
    return html


def apply_to_build_pages(build_pages_path: Path, courses: dict) -> None:
    """Replace giant PAGES[...] body strings with helper-loaded bodies."""
    text = build_pages_path.read_text(encoding="utf-8")

    if "from build_short_courses import" not in text:
        # Insert import after the standard library imports block near top
        m = re.search(r"^(import |from )", text, flags=re.M)
        # Place after VERSION / feature flags area: right before PAGES = {}
        if "PAGES = {}" in text:
            text = text.replace(
                "PAGES = {}",
                "from build_short_courses import load_courses as _load_short_courses, page_meta as _short_course_page_meta, cert_card_html as _short_cert_card\n\n"
                "_SHORT_COURSES = _load_short_courses()\n\n"
                "PAGES = {}",
                1,
            )
        else:
            raise SystemExit("Could not find PAGES = {} in build_pages.py")

    # Replace each course page assignment with helper meta
    for key in COURSE_KEYS:
        course = courses[key]
        fname = course["html"]
        pattern = re.compile(
            r"PAGES\['" + re.escape(fname) + r"'\] = dict\([\s\S]*?\)\n(?=PAGES\[|SHOW_|# |def |if __name__|for fname)",
            re.M,
        )
        replacement = (
            f"PAGES['{fname}'] = _short_course_page_meta(_SHORT_COURSES['{key}'])\n"
        )
        new_text, n = pattern.subn(replacement, text, count=1)
        if n != 1:
            # Fallback: line-anchored replace of the assignment start through next PAGES[
            start = text.find(f"PAGES['{fname}'] = dict(")
            if start < 0:
                if f"PAGES['{fname}'] = _short_course_page_meta" in text:
                    continue
                raise SystemExit(f"Could not find PAGES['{fname}'] assignment")
            # Find matching end: next line that starts with PAGES[ after this one,
            # scanning carefully because body has nested quotes. The assignment ends
            # with ")\n" after the closing of dict(... body='...').
            # Use a simpler approach: find start, then find "\nPAGES[" after a line that is just ")"
            rest = text[start:]
            # Each of these is one long line historically; match until newline after closing )
            m2 = re.match(
                r"PAGES\['" + re.escape(fname) + r"'\] = dict\(.*\)\n",
                rest,
                flags=re.S,
            )
            if not m2:
                # multi-line already replaced?
                if f"PAGES['{fname}'] = _short_course_page_meta" in text:
                    continue
                raise SystemExit(f"Could not parse assignment for {fname}")
            text = text[:start] + replacement + rest[m2.end():]
        else:
            text = new_text

    # Patch catalog session counts / hours / cards inside certificates body
    replacements = [
        ('data-cert="fundamentals" data-title="Fathering Fundamentals" data-hours="10.0"',
         'data-cert="fundamentals" data-title="Fathering Fundamentals" data-hours="1.1"'),
        ('data-cert="reentry" data-title="Coming Home Present" data-hours="8.0"',
         'data-cert="reentry" data-title="Coming Home Present" data-hours="2.4"'),
        ('data-cert="reentry" data-title="Coming Home Present" data-hours="3.0"',
         'data-cert="reentry" data-title="Coming Home Present" data-hours="2.4"'),
        ('data-cert="anger" data-title="Steady Under Pressure" data-hours="6.0"',
         'data-cert="anger" data-title="Steady Under Pressure" data-hours="2.4"'),
        ('data-cert="anger" data-title="Steady Under Pressure" data-hours="3.0"',
         'data-cert="anger" data-title="Steady Under Pressure" data-hours="2.4"'),
        ('data-cert="coparenting" data-title="Same Team" data-hours="6.0"',
         'data-cert="coparenting" data-title="Same Team" data-hours="2.4"'),
        ('data-cert="coparenting" data-title="Same Team" data-hours="3.0"',
         'data-cert="coparenting" data-title="Same Team" data-hours="2.4"'),
        ("var SESS = {fundamentals:'5', reentry:'8', anger:'6', coparenting:'6', manhood:'6'};",
         "var SESS = {fundamentals:'8', reentry:'12', anger:'12', coparenting:'12', manhood:'6'};"),
        ("var SESS = {fundamentals:'5', reentry:'12', anger:'12', coparenting:'12', manhood:'6'};",
         "var SESS = {fundamentals:'8', reentry:'12', anger:'12', coparenting:'12', manhood:'6'};"),
        ("var SESS = {fundamentals:'8', reentry:'12', anger:'12', coparenting:'12', manhood:'6'};",
         "var SESS = {fundamentals:'8', reentry:'12', anger:'12', coparenting:'12', manhood:'6'};"),
        ('<span class="fine mono">5 sessions</span></div>\n        <h3 style="margin-bottom:6px">Fathering Fundamentals</h3>',
         '<span class="fine mono">8 sessions</span></div>\n        <h3 style="margin-bottom:6px">Fathering Fundamentals</h3>'),
        ('<span class="fine mono">6 sessions</span></div>\n        <h3 style="margin-bottom:6px">Steady Under Pressure</h3>',
         '<span class="fine mono">12 sessions</span></div>\n        <h3 style="margin-bottom:6px">Steady Under Pressure</h3>'),
        ('<span class="fine mono">8 sessions</span></div>\n        <h3 style="margin-bottom:6px">Coming Home Present</h3>',
         '<span class="fine mono">12 sessions</span></div>\n        <h3 style="margin-bottom:6px">Coming Home Present</h3>'),
        ('<div class="mono small">5 sessions &middot; facilitator-verified</div>',
         '<div class="mono small">8 sessions &middot; facilitator-verified</div>'),
        ('enroll.html?cert=fundamentals&amp;title=Fathering%20Fundamentals&amp;hours=10.0',
         'course-fathering-fundamentals.html'),
    ]
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)

    # Replace entire cert cards for the four courses inside PAGES['certificates.html']
    for key in COURSE_KEYS:
        before = text
        text = replace_cert_card(text, courses[key])
        if text == before:
            print(f"warn: cert card for {courses[key]['slug']} not replaced in build_pages.py")

    # Preview title for Steady Under Pressure
    text = text.replace(
        '<h3>The Alarm System</h3>\n        <p>&ldquo;The surge is a signal, not an order.&rdquo;</p>',
        '<h3>The Surge Is a Signal</h3>\n        <p>&ldquo;The surge is a signal, not an order.&rdquo;</p>',
    )

    # class.html metas if present
    text = text.replace(
        'data-metas="6 sessions &middot; Certificate of Completion|8 sessions &middot; Certificate of Completion|6 sessions &middot; Certificate of Completion"',
        'data-metas="12 sessions &middot; Certificate of Completion|12 sessions &middot; Certificate of Completion|12 sessions &middot; Certificate of Completion"',
    )

    build_pages_path.write_text(text, encoding="utf-8")
    print("patched", build_pages_path)


def _chrome_from_existing(sample_path: Path):
    """Reuse head/nav/trust-bar/footer from an existing forged course page."""
    raw = sample_path.read_text(encoding="utf-8")
    # Split: head through trust-bar end, then footer through scripts
    m = re.search(r"(?s)^(.*?)(?=<section class=\"band\">)", raw)
    if not m:
        # trust-bar closes then blank line then section
        m = re.search(r"(?s)(^.*?<div class=\"trust-bar\"[\s\S]*?</div></div>\n)", raw)
    if not m:
        raise SystemExit("Could not locate chrome prefix in %s" % sample_path)
    prefix = m.group(1)
    fm = re.search(r"(?s)(<footer>[\s\S]*)</html>\s*$", raw)
    if not fm:
        raise SystemExit("Could not locate footer in %s" % sample_path)
    suffix = fm.group(1) + "\n</html>\n"
    return prefix, suffix


def _retitle_prefix(prefix: str, title: str, desc: str, fname: str) -> str:
    prefix = re.sub(r"<title>.*?</title>", f"<title>{title} | Fathers.com</title>", prefix, count=1)
    # Some titles already include | Fathers.com in page_meta title
    prefix = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", prefix, count=1)
    prefix = re.sub(
        r'<meta name="description" content=".*?">',
        f'<meta name="description" content="{desc}">',
        prefix,
        count=1,
    )
    prefix = re.sub(
        r'<link rel="canonical" href="https://fathers-com-platform\.vercel\.app/.*?">',
        f'<link rel="canonical" href="https://fathers-com-platform.vercel.app/{fname}">',
        prefix,
        count=1,
    )
    for prop, val in [
        ("og:title", title),
        ("og:description", desc),
        ("og:url", f"https://fathers-com-platform.vercel.app/{fname}"),
        ("twitter:title", title),
        ("twitter:description", desc),
    ]:
        prefix = re.sub(
            rf'<meta property="{prop}" content=".*?">',
            f'<meta property="{prop}" content="{val}">',
            prefix,
            count=1,
        )
        prefix = re.sub(
            rf'<meta name="{prop}" content=".*?">',
            f'<meta name="{prop}" content="{val}">',
            prefix,
            count=1,
        )
    return prefix


def _ensure_checkpoint_scripts(html: str) -> str:
    """Ensure guide pages load the shared checkpoint pack + mount JS."""
    tags = [
        '<script src="assets/js/session-checkpoints-data.js"></script>',
        '<script src="assets/js/session-checkpoint.js"></script>',
        '<script src="assets/js/vendor/anime.min.js"></script>',
        '<script src="assets/js/motion.js"></script>',
    ]
    for tag in tags:
        if tag not in html:
            html = html.replace('</body>', tag + '\n</body>', 1)
    return html



def write_course_html_files(courses: dict) -> None:
    """Write standalone HTML using chrome cloned from an existing course page."""
    sample = ROOT / "course-steady-under-pressure.html"
    prefix0, suffix = _chrome_from_existing(sample)
    for key in COURSE_KEYS:
        course = courses[key]
        meta = page_meta(course)
        fname = course["html"]
        # page_meta title already includes ": the sessions"
        title = f"{meta['title']} | Fathers.com" if "| Fathers.com" not in meta["title"] else meta["title"]
        # Existing pages use "Title: the sessions | Fathers.com"
        title = f"{course['title']}: the sessions | Fathers.com"
        prefix = _retitle_prefix(prefix0, title, meta["desc"], fname)
        html = prefix + "\n" + meta["body"] + suffix
        # Ensure Courses nav stays active
        html = html.replace('href="certificates.html" >', 'href="certificates.html" class="active">')
        html = _ensure_checkpoint_scripts(html)
        out = ROOT / fname
        out.write_text(html, encoding="utf-8")
        print("wrote", out)


def main():
    courses = load_courses()
    apply_to_build_pages(ROOT / "build_pages.py", courses)
    write_course_html_files(courses)
    print("done")


if __name__ == "__main__":
    main()
