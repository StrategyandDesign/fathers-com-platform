#!/usr/bin/env python3
"""Generates the role dashboards. Each is a real Supabase-backed page.
   Permissions are enforced by RLS; these pages shape the UI and call the API."""
import os
import re

# Keep in sync with build_pages.py. CHANGE THIS if the site moves to a custom domain.
SITE_URL = "https://fathers-com-platform.vercel.app"
OG_IMAGE = SITE_URL + "/assets/img/og-image.jpg"


def _esc(s):
    s = re.sub(r'&(?!#?\w+;)', '&amp;', s)
    return s.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def social_meta(page, title):
    """Dashboards are private, so every one is noindex. Full card + icon still emitted for consistency."""
    url = SITE_URL + "/" + page + ".html"
    ttl = _esc(title + " | Fathers.com")
    return (
        '<meta name="robots" content="noindex,follow">\n'
        + f'<link rel="canonical" href="{url}">\n'
        + '<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">\n'
        + '<meta name="theme-color" content="#000000">\n'
        + '<meta property="og:type" content="website">\n'
        + '<meta property="og:site_name" content="Fathers.com">\n'
        + f'<meta property="og:title" content="{ttl}">\n'
        + f'<meta property="og:url" content="{url}">\n'
        + f'<meta property="og:image" content="{OG_IMAGE}">\n'
        + '<meta property="og:image:width" content="1200">\n'
        + '<meta property="og:image:height" content="630">\n'
        + '<meta name="twitter:card" content="summary_large_image">\n'
        + f'<meta name="twitter:image" content="{OG_IMAGE}">'
    )

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Fathers.com</title>
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<script>document.documentElement.dataset.theme=localStorage.getItem("fc_theme")||"dark";</script>
<link rel="stylesheet" href="assets/css/forge.css">
<link rel="stylesheet" href="assets/css/dash.css">
{meta}
</head>
<body data-auth="required">
<nav class="nav"><div class="container nav-inner">
<a class="brand" href="index.html"><img class="lg-dark" src="assets/img/logomark-light.png" alt=""><img class="lg-light" src="assets/img/logomark-dark.png" alt=""><b>Fathers.com</b></a>
<ul class="nav-links">
<li><a href="admin.html" data-role="admin">Admin</a></li>
<li><a href="studio.html" data-role="author">Studio</a></li>
<li><a href="org.html" data-role="org">Org</a></li>
<li><a href="lead.html" data-role="leader">Lead</a></li>
</ul>
<div class="nav-right">
<a href="plan.html">My Plan</a>
<button class="themeswitch" data-themeswitch aria-label="Switch palette"><span class="tsw-dot"></span></button>
<a href="#" data-signout>Sign out</a>
<button class="nav-toggle">MENU</button>
</div>
</div></nav>
<div id="denied" class="container" style="display:none;padding:80px 0"><div class="card" style="max-width:520px;margin:0 auto;text-align:center">
<h2 class="d-28" style="margin-bottom:10px">Not your dashboard</h2>
<p class="small" style="margin-bottom:20px">This area needs a role you do not have. If that is wrong, ask an admin to grant it.</p>
<a class="btn btn-primary" href="plan.html">Back to My Plan</a></div></div>
<div id="demo-note" class="container" style="display:none;padding:24px 0"><div class="notice brass" style="max-width:900px;margin:0 auto">Demo mode. Add Supabase keys in <code>assets/js/config.js</code> to load live data. The controls below show the real interface; writes activate once connected.</div></div>
<main id="app" class="container" style="padding:40px 0 96px;display:none">
'''

FOOT = '''</main>
<div class="toast"></div>
<script src="assets/js/config.js"></script>
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/roles.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/{page}.js"></script>
</body></html>
'''

PAGES = {

'admin': ('Admin', '''
<div class="dash-head"><h1 class="d-36">Admin</h1><p class="lead">People, roles, content, and the audit trail.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="admin-people">--</div><div class="glance-sub">people on the platform</div></div><div class="glance-card"><div class="glance-lbl">THIS WEEK</div><div class="glance-big" data-glance="admin-new">--</div><div class="glance-sub">new sign-ups</div></div><div class="glance-card"><div class="glance-lbl">CONTENT</div><div class="glance-big" data-glance="admin-content">--</div><div class="glance-sub">courses live</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="admin-next">Review pending role requests and new content awaiting approval.</div></div></div>
<div data-tabs>
  <div class="tabs"><button class="active">People &amp; roles</button><button>Content</button><button>Orgs</button><button>Audit</button></div>

  <div class="tabpanel active">
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:14px">Grant a role</h3>
      <div class="grid-3" style="gap:12px;align-items:end">
        <div class="field" style="margin:0"><label>User email</label><input class="input" id="gr-email" placeholder="man@example.com"></div>
        <div class="field" style="margin:0"><label>Role</label><select class="input" id="gr-role">
          <option value="member">member</option><option value="circle_leader">circle_leader</option><option value="org_admin">org_admin</option><option value="content_reviewer">content_reviewer</option><option value="instructor">instructor</option><option value="admin">admin</option></select></div>
        <button class="btn btn-primary" id="gr-go">Grant</button>
      </div>
      <p class="fine" id="gr-msg" style="margin-top:10px">org_admin and circle_leader need an org; pick one under Orgs first, then grant there.</p>
    </div>
    <div class="card"><h3 style="margin-bottom:14px">Everyone</h3><div id="people-table">Loading people…</div></div>
  </div>

  <div class="tabpanel">
    <div class="row between" style="margin-bottom:16px"><h3>All classes</h3><a class="btn btn-primary btn-sm" href="studio.html">Open Studio</a></div>
    <div id="content-table">Loading content…</div>
    <div class="card" style="margin-top:20px"><h3 style="margin-bottom:14px">Instruments</h3><div id="instr-table">Loading instruments…</div></div>
  </div>

  <div class="tabpanel">
    <div class="card" style="margin-bottom:20px"><h3 style="margin-bottom:14px">Create an organization</h3>
      <div class="grid-3" style="gap:12px;align-items:end">
        <div class="field" style="margin:0"><label>Name</label><input class="input" id="org-name" placeholder="Living Hope Church"></div>
        <div class="field" style="margin:0"><label>Seats</label><input class="input" id="org-seats" type="number" value="25"></div>
        <button class="btn btn-primary" id="org-go">Create</button>
      </div></div>
    <div class="card"><h3 style="margin-bottom:14px">Organizations</h3><div id="orgs-table">Loading orgs…</div></div>
  </div>

  <div class="tabpanel"><div class="card"><h3 style="margin-bottom:14px">Audit log</h3><div id="audit-table">Loading audit…</div></div></div>
</div>
'''),

'studio': ('Studio', '''
<div class="dash-head"><h1 class="d-36">Studio</h1><p class="lead">Build courses and assessments. Publish when ready.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="studio-courses">--</div><div class="glance-sub">courses you own</div></div><div class="glance-card"><div class="glance-lbl">PUBLISHED</div><div class="glance-big" data-glance="studio-live">--</div><div class="glance-sub">live to members</div></div><div class="glance-card"><div class="glance-lbl">IN DRAFT</div><div class="glance-big" data-glance="studio-draft">--</div><div class="glance-sub">not yet published</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="studio-next">Finish a draft, or add lessons to a published course to keep it fresh.</div></div></div>
<div data-tabs>
  <div class="tabs"><button class="active">Courses</button><button>Assessments</button></div>

  <div class="tabpanel active">
    <div class="row between" style="margin-bottom:16px">
      <h3>Your courses</h3>
      <button class="btn btn-primary btn-sm" id="new-course">New course</button>
    </div>
    <div id="course-list">Loading…</div>
    <div id="course-editor" class="card" style="display:none;margin-top:20px"></div>
  </div>

  <div class="tabpanel">
    <div class="row between" style="margin-bottom:16px">
      <h3>Assessment instruments</h3>
      <button class="btn btn-primary btn-sm" id="new-instr">New instrument</button>
    </div>
    <div id="instr-list">Loading…</div>
    <div id="instr-editor" class="card" style="display:none;margin-top:20px"></div>
  </div>
</div>
'''),

'org': ('Organization', '''
<div class="dash-head"><h1 class="d-36">Organization</h1><p class="lead">Seats, roster, and participation. You never see a man's answers or scores.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="org-members">--</div><div class="glance-sub">men on your roster</div></div><div class="glance-card"><div class="glance-lbl">ACTIVE</div><div class="glance-big" data-glance="org-active">--</div><div class="glance-sub">took their baseline</div></div><div class="glance-card"><div class="glance-lbl">SEATS OPEN</div><div class="glance-big" data-glance="org-seats">--</div><div class="glance-sub">left to invite</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="org-next">Invite the men who haven't started, and check participation this month.</div></div></div>
<div id="org-picker" class="row" style="margin-bottom:24px"></div>
<div id="org-body">
  <div class="grid-4" id="org-stats" style="margin-bottom:28px"></div>
  <div class="card" style="margin-bottom:20px">
    <div class="row between" style="margin-bottom:14px"><h3>Invite a man</h3></div>
    <div class="row" style="max-width:520px"><input class="input" id="inv-email" placeholder="man@example.com"><button class="btn btn-primary btn-sm" id="inv-go">Send invite</button></div>
    <p class="fine" id="inv-msg" style="margin-top:10px"></p>
  </div>
  <div class="card"><h3 style="margin-bottom:14px">Roster</h3><div id="roster-table">Pick an organization…</div></div>
</div>
'''),

'lead': ('Lead a Circle', '''
<div class="dash-head"><h1 class="d-36">Lead a Circle</h1><p class="lead">Plan the weeks, post to your men, keep the standard.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="lead-men">--</div><div class="glance-sub">men in your Circle</div></div><div class="glance-card"><div class="glance-lbl">THIS WEEK</div><div class="glance-big" data-glance="lead-watched">--</div><div class="glance-sub">watched the film</div></div><div class="glance-card"><div class="glance-lbl">NEXT MEETING</div><div class="glance-big glance-sm" data-glance="lead-next-meet">--</div><div class="glance-sub">stay ready</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="lead-next">Post this week's question, and check who hasn't watched yet.</div></div></div>
<div id="circle-picker" class="row" style="margin-bottom:24px"></div>
<div id="lead-body" data-tabs>
  <div class="tabs"><button class="active">This week</button><button>Plan weeks</button><button>Announce</button><button>Roster</button></div>
  <div class="tabpanel active"><div id="lead-thisweek">Pick a Circle…</div></div>
  <div class="tabpanel"><div class="card"><h3 style="margin-bottom:14px">Set a week</h3>
    <div class="grid-4" style="gap:12px;align-items:end">
      <div class="field" style="margin:0"><label>Week</label><input class="input" id="cw-week" type="number" value="1"></div>
      <div class="field" style="margin:0"><label>Class slug</label><input class="input" id="cw-class" placeholder="fundamentals"></div>
      <div class="field" style="margin:0"><label>Lesson #</label><input class="input" id="cw-lesson" type="number" value="1"></div>
      <div class="field" style="margin:0"><label>Meets on</label><input class="input" id="cw-date" type="date"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Discussion question</label><input class="input" id="cw-q"></div>
    <div class="field"><label>Shared action</label><input class="input" id="cw-action"></div>
    <button class="btn btn-primary btn-sm" id="cw-go">Save week</button>
    <div id="cw-list" style="margin-top:20px"></div>
  </div></div>
  <div class="tabpanel"><div class="card"><h3 style="margin-bottom:14px">Announce to your Circle</h3>
    <textarea class="input" id="ann-body" placeholder="Say it straight."></textarea>
    <button class="btn btn-primary btn-sm" id="ann-go" style="margin-top:12px">Post announcement</button>
    <div id="ann-list" style="margin-top:20px"></div>
  </div></div>
  <div class="tabpanel"><div class="card"><h3 style="margin-bottom:14px">Members</h3><div id="lead-roster"></div></div></div>
</div>
'''),
}

if __name__ == '__main__':
    out = os.path.dirname(os.path.abspath(__file__))
    for page, (title, body) in PAGES.items():
        html = HEAD.format(title=title, meta=social_meta(page, title)) + body + FOOT.format(page=page)
        with open(os.path.join(out, page + '.html'), 'w') as f:
            f.write(html)
        print('wrote', page + '.html')
