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
<li><a href="participant.html" data-role="admin">Participant</a></li>
<li><a href="studio.html" data-role="author">Studio</a></li>
<li><a href="org.html" data-role="org">Org</a></li>
<li><a href="lead.html" data-role="leader">Facilitate</a></li>
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
'participant': ('Participant', '''
<div class="dash-head"><h1 class="d-36">Participant</h1><p class="lead">Search a father and open his individual snapshot. This is private data; handle with care.</p></div>
<div id="pt-denied" style="display:none"><div class="notice brass">This area needs the admin role.</div></div>
<div id="pt-root">
  <div class="card" style="margin-bottom:20px">
    <div class="row" style="gap:10px;align-items:end;flex-wrap:wrap">
      <div class="field" style="margin:0;flex:1;min-width:240px"><label>Find a father</label><input class="input" id="pt-search" placeholder="Name or email"></div>
      <button class="btn btn-primary btn-sm" id="pt-search-btn">Search</button>
    </div>
    <div id="pt-results" style="margin-top:16px"><p class="fine">Search by name or email to begin.</p></div>
  </div>
  <div class="card" id="pt-detail" style="display:none"></div>
</div>
'''),


'admin': ('Admin', '''
<div class="dash-head"><h1 class="d-36">Admin</h1><p class="lead">People, roles, content, and the audit trail.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="admin-people">--</div><div class="glance-sub">people on the platform</div></div><div class="glance-card"><div class="glance-lbl">THIS WEEK</div><div class="glance-big" data-glance="admin-new">--</div><div class="glance-sub">new sign-ups</div></div><div class="glance-card"><div class="glance-lbl">CONTENT</div><div class="glance-big" data-glance="admin-content">--</div><div class="glance-sub">courses live</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="admin-next">Review pending role requests and new content awaiting approval.</div></div></div>
<div data-tabs>
  <div class="tabs"><button class="active">People &amp; roles</button><button>Content</button><button>Orgs</button><button>Audit</button><button>Certificates</button></div>

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

  <div class="tabpanel">
    <div class="card" style="margin-bottom:20px">
      <div class="row between wrap" style="margin-bottom:18px;gap:12px">
        <h3>Build a course</h3>
        <div class="row" style="gap:10px;align-items:center">
          <select class="input" id="cert-course-select" style="min-width:200px"></select>
          <span class="chip" id="cert-publish-state">Draft</span>
          <button class="btn btn-secondary btn-sm" id="cert-publish">Publish</button>
        </div>
      </div>
      <div id="certs-build">
        <p class="fine" style="margin:0 0 14px">Five videos per course. Each video ends in a Checkpoint; the course closes with the Final Q&amp;A. Completion issues the Certificate of Completion, signed by Dr. Canfield and the leading Certified Facilitator, at no cost to the man.</p>
        <div class="eyebrow" style="margin:0 0 12px">VIDEOS, WITH LENGTH SO WE KNOW IF THEY WATCHED</div>
        <div id="cert-videos" class="fine">Loading&hellip;</div>
        <div class="row wrap" style="gap:10px;margin-top:16px;align-items:end">
          <div class="field" style="margin:0;flex:2;min-width:180px"><label>Video title</label><input class="input" id="cv-title"></div>
          <div class="field" style="margin:0;flex:2;min-width:180px"><label>Vimeo link or ID</label><input class="input" id="cv-url" placeholder="vimeo.com/1198023217 or 1198023217"></div>
          <div class="field" style="margin:0;flex:1;min-width:110px"><label>Length (min)</label><input class="input" id="cv-mins" type="number" min="0" step="0.1"></div>
          <button class="btn btn-primary btn-sm" id="cv-add">Add video</button>
        </div>
      </div>
    </div>

    <div class="card" id="cert-debrief-card" style="margin-bottom:20px;display:none">
      <h3 id="cert-debrief-title" style="margin-bottom:8px">Checkpoint</h3>
      <p class="fine" style="margin-bottom:12px">Ten questions after this video. Fathers see it as a Checkpoint, not a quiz.</p>
      <div id="cert-questions" class="fine">&nbsp;</div>
      <div style="margin-top:16px;border-top:1px solid var(--hairline);padding-top:16px">
        <div class="field" style="margin:0 0 10px"><label>Question</label><input class="input" id="cq-prompt"></div>
        <div class="row wrap" style="gap:10px"><input class="input" id="cq-a" placeholder="Choice A" style="flex:1;min-width:140px"><input class="input" id="cq-b" placeholder="Choice B" style="flex:1;min-width:140px"><input class="input" id="cq-c" placeholder="Choice C" style="flex:1;min-width:140px"><input class="input" id="cq-d" placeholder="Choice D" style="flex:1;min-width:140px"></div>
        <div class="row" style="gap:10px;margin-top:10px;align-items:end"><div class="field" style="margin:0"><label>Correct answer</label><select class="input" id="cq-correct"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div><button class="btn btn-primary btn-sm" id="cq-add">Add question</button></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:6px">Final Q&amp;A</h3>
      <p class="fine" style="margin-bottom:14px">Longform prompts after the fifth video. A man writes his answers and submits them; his facilitator reads them at approval.</p>
      <div id="cert-qa" class="fine">Loading&hellip;</div>
      <div class="row" style="gap:10px;margin-top:14px;align-items:end"><div class="field" style="margin:0;flex:1"><label>Prompt</label><input class="input" id="qa-prompt"></div><button class="btn btn-primary btn-sm" id="qa-add">Add prompt</button></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:6px">Completions to approve</h3>
      <p class="fine" style="margin-bottom:14px">Men who finished. Approve to issue the Certificate of Completion, signed and serialed.</p>
      <div id="cert-approvals" class="fine">Loading&hellip;</div>
    </div>
  </div>
</div>
<script src="assets/js/admin-certs.js"></script>

<div class="eyebrow" style="margin:34px 0 12px">EVERY ROLE VIEW</div>
<p class="fine" style="color:var(--ash);margin-bottom:16px">Open any dashboard on the platform, exactly as that role sees it.</p>
<div class="grid-3">
  <a class="card" href="org.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">Organization</h3><p class="fine" style="color:var(--ash)">The service window: join link, movement, cohorts, roster.</p></a>
  <a class="card" href="studio.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">Studio</h3><p class="fine" style="color:var(--ash)">Courses, films, and publishing.</p></a>
  <a class="card" href="lead.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">Facilitator Desk</h3><p class="fine" style="color:var(--ash)">Cohorts, members, and group life.</p></a>
  <a class="card" href="participant.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">Participant snapshot</h3><p class="fine" style="color:var(--ash)">One man at a time, handled with care.</p></a>
  <a class="card" href="plan.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">Father&rsquo;s Home</h3><p class="fine" style="color:var(--ash)">What every father sees: his baseline, plan, and feed.</p></a>

  <a class="card" href="efficacy-report.html" style="padding:18px 22px;text-decoration:none"><h3 style="margin-bottom:4px">The Efficacy Report</h3><p class="fine" style="color:var(--ash)">What a funder sees: cohort movement, never a man.</p></a>
</div>
'''),

'studio': ('Studio', '''
<div class="dash-head"><h1 class="d-36">Studio</h1><p class="lead">Build courses and assessments. Publish when ready.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="studio-courses">--</div><div class="glance-sub">courses you own</div></div><div class="glance-card"><div class="glance-lbl">PUBLISHED</div><div class="glance-big" data-glance="studio-live">--</div><div class="glance-sub">live to members</div></div><div class="glance-card"><div class="glance-lbl">IN DRAFT</div><div class="glance-big" data-glance="studio-draft">--</div><div class="glance-sub">not yet published</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="studio-next">Finish a draft, or add lessons to a published course to keep it fresh.</div></div></div>
<div data-tabs>
  <div class="tabs"><button class="active">Courses</button><button>Assessments</button><button>Report</button></div>

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

  <div class="tabpanel">
<div class="card" id="rb-card" style="padding:26px">
  <div class="eyebrow" style="margin-bottom:6px">REPORT BRANDING</div>
  <h3 style="margin-bottom:6px">The written report, in your program&rsquo;s colors</h3>
  <p class="fine" style="color:var(--ash);margin-bottom:20px;max-width:64ch">This is what a course creator can change on the participant report: two logos, the highlight colors, and one photo per section. Changes apply to every report the moment you save.</p>
  <div class="grid-2" style="gap:20px;align-items:start">
    <div>
      <div class="eyebrow" style="font-size:10px;margin-bottom:8px">PRIMARY LOGO</div>
      <div style="border:1px dashed var(--hairline-strong);border-radius:8px;padding:14px;min-height:64px;display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <img id="rb-prev1" alt="" style="display:none;max-height:40px;max-width:180px;object-fit:contain">
        <span id="rb-empty1" class="fine" style="color:var(--ash)">PNG, JPG, SVG, or WebP. Max 300 KB.</span>
      </div>
      <input type="file" id="rb-logo1" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="fine">
      <button class="link ash fine" id="rb-clear1" type="button" style="margin-left:10px;background:none;border:0;cursor:pointer">Remove</button>
    </div>
    <div>
      <div class="eyebrow" style="font-size:10px;margin-bottom:8px">PARTNER LOGO</div>
      <div style="border:1px dashed var(--hairline-strong);border-radius:8px;padding:14px;min-height:64px;display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <img id="rb-prev2" alt="" style="display:none;max-height:40px;max-width:180px;object-fit:contain">
        <span id="rb-empty2" class="fine" style="color:var(--ash)">Optional. Shown top right.</span>
      </div>
      <input type="file" id="rb-logo2" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="fine">
      <button class="link ash fine" id="rb-clear2" type="button" style="margin-left:10px;background:none;border:0;cursor:pointer">Remove</button>
    </div>
  </div>
  <div class="row wrap" style="gap:22px;margin-top:20px;align-items:center">
    <label class="fine" style="display:flex;align-items:center;gap:10px">HIGHLIGHT <input type="color" id="rb-accent" value="#E8E84A" style="width:44px;height:30px;border:1px solid var(--hairline-strong);border-radius:6px;background:none;padding:2px"></label>
    <label class="fine" style="display:flex;align-items:center;gap:10px">SECOND HIGHLIGHT <input type="color" id="rb-accent2" value="#B08D57" style="width:44px;height:30px;border:1px solid var(--hairline-strong);border-radius:6px;background:none;padding:2px"></label>
    <a class="link" href="report.html" target="_blank" rel="noopener">Preview the report &rarr;</a>
  </div>
  <div class="eyebrow" style="font-size:10px;margin:26px 0 8px">SECTION PHOTOS (OPTIONAL)</div>
  <p class="fine" style="color:var(--ash);margin-bottom:14px;max-width:64ch">One image across the top of each chapter. A blank slot shows a designed default, so you can add these anytime. Use web-optimized images. Max 500 KB each.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px">
    <div>
      <div class="eyebrow" style="font-size:10px;margin-bottom:8px">DIMENSIONS</div>
      <div style="border:1px dashed var(--hairline-strong);border-radius:8px;min-height:92px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px;background:var(--coal)">
        <img id="rb-pprev-dim" alt="" style="display:none;width:100%;height:92px;object-fit:cover">
        <span id="rb-pempty-dim" class="fine" style="color:var(--ash);padding:12px;text-align:center">JPG, PNG, or WebP. Max 500 KB.</span>
      </div>
      <input type="file" id="rb-photo-dim" accept="image/png,image/jpeg,image/webp" class="fine">
      <button class="link ash fine" id="rb-pclear-dim" type="button" style="margin-left:8px;background:none;border:0;cursor:pointer">Remove</button>
    </div>
    <div>
      <div class="eyebrow" style="font-size:10px;margin-bottom:8px">PRACTICES</div>
      <div style="border:1px dashed var(--hairline-strong);border-radius:8px;min-height:92px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px;background:var(--coal)">
        <img id="rb-pprev-prac" alt="" style="display:none;width:100%;height:92px;object-fit:cover">
        <span id="rb-pempty-prac" class="fine" style="color:var(--ash);padding:12px;text-align:center">JPG, PNG, or WebP. Max 500 KB.</span>
      </div>
      <input type="file" id="rb-photo-prac" accept="image/png,image/jpeg,image/webp" class="fine">
      <button class="link ash fine" id="rb-pclear-prac" type="button" style="margin-left:8px;background:none;border:0;cursor:pointer">Remove</button>
    </div>
    <div>
      <div class="eyebrow" style="font-size:10px;margin-bottom:8px">SATISFACTION</div>
      <div style="border:1px dashed var(--hairline-strong);border-radius:8px;min-height:92px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px;background:var(--coal)">
        <img id="rb-pprev-sat" alt="" style="display:none;width:100%;height:92px;object-fit:cover">
        <span id="rb-pempty-sat" class="fine" style="color:var(--ash);padding:12px;text-align:center">JPG, PNG, or WebP. Max 500 KB.</span>
      </div>
      <input type="file" id="rb-photo-sat" accept="image/png,image/jpeg,image/webp" class="fine">
      <button class="link ash fine" id="rb-pclear-sat" type="button" style="margin-left:8px;background:none;border:0;cursor:pointer">Remove</button>
    </div>
  </div>
  <div class="row" style="gap:14px;margin-top:24px;align-items:center">
    <button class="btn btn-yellow btn-sm" id="rb-save">Save branding</button>
    <span class="fine" id="rb-msg"></span>
  </div>
</div>
  </div>
</div>
'''),

'org': ('Organization', '''
<div class="dash-head"><h1 class="d-36">Your program</h1><p class="lead">Your window on the service: men measured, movement, completions. You never see a man's answers or scores.</p></div>
<div id="org-picker" class="row" style="margin-bottom:24px"></div>
<div id="org-body">
  <div class="home-grid">
    <aside>
      <div class="card" style="padding:22px 24px;margin-bottom:16px">
        <div class="eyebrow" style="margin-bottom:8px">YOUR ORGANIZATION</div>
        <div class="d-28" id="orgName">&nbsp;</div>
        <p class="fine" id="orgMeta" style="color:var(--ash);margin-top:4px"></p>
      </div>
      <div class="card" style="padding:22px 24px;margin-bottom:16px">
        <div class="eyebrow" style="margin-bottom:10px">YOUR JOIN LINK</div>
        <div id="orgJoin"><p class="fine" style="color:var(--ash)">Loading&hellip;</p></div>
      </div>
      <div class="card" style="padding:22px 24px">
        <div class="eyebrow" style="margin-bottom:14px">STATISTICS</div>
        <div id="orgStats"><p class="fine" style="color:var(--ash)">Loading&hellip;</p></div>
      </div>
    </aside>
    <div>
      <div id="orgNext"></div>
      <div class="eyebrow" style="margin:6px 0 12px">YOUR COHORTS</div>
      <div id="orgCohorts"><p class="fine" style="color:var(--ash)">Loading&hellip;</p></div>
      <div class="card" style="margin:22px 0 20px;padding:24px 26px">
        <div class="row between" style="margin-bottom:12px"><h3>Invite a man directly</h3></div>
        <p class="fine" style="color:var(--ash);margin-bottom:12px">The join link does this at scale; direct invites are for the one-offs.</p>
        <div class="row" style="max-width:520px"><input class="input" id="inv-email" placeholder="man@example.com"><button class="btn btn-primary btn-sm" id="inv-go">Send invite</button></div>
        <p class="fine" id="inv-msg" style="margin-top:8px"></p>
      </div>
      <details class="card" style="padding:20px 26px">
        <summary style="cursor:pointer"><b>Roster</b> <span class="fine" style="color:var(--ash)">seat-by-seat participation</span></summary>
        <div id="roster-table" style="margin-top:16px"><p class="fine">Loading&hellip;</p></div>
      </details>
    </div>
  </div>
</div>
'''),

'lead': ('Facilitator Desk', '''
<div class="dash-head"><h1 class="d-36">Facilitator Desk</h1><p class="lead">Plan the weeks, post to your men, keep the standard. Your Certified Facilitator status lives in the public registry.</p></div><div class="glance"><div class="glance-card"><div class="glance-lbl">YOUR WORLD</div><div class="glance-big" data-glance="lead-men">--</div><div class="glance-sub">men in your Circle</div></div><div class="glance-card"><div class="glance-lbl">THIS WEEK</div><div class="glance-big" data-glance="lead-watched">--</div><div class="glance-sub">watched the film</div></div><div class="glance-card"><div class="glance-lbl">NEXT MEETING</div><div class="glance-big glance-sm" data-glance="lead-next-meet">--</div><div class="glance-sub">stay ready</div></div><div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt" data-glance="lead-next">Post this week's question, and check who hasn't watched yet.</div></div></div>
<div id="circle-picker" class="row" style="margin-bottom:24px"></div>
<div id="lead-body" data-tabs>
  <div class="tabs"><button class="active">This week</button><button>Plan weeks</button><button>Announce</button><button>Roster</button><button>Claims</button></div>
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
  <div class="tabpanel"><div class="card"><h3 style="margin-bottom:6px">Claim a participant</h3>
    <p class="fine" style="margin-bottom:14px">A man can only enroll in the courses once you claim him. Enter the email he signs in with. He pays nothing; his completion counts in your cohort.</p>
    <div class="row wrap" style="gap:10px;align-items:end">
      <div class="field" style="margin:0;flex:2;min-width:220px"><label>Participant email</label><input class="input" id="claim-email" type="email" placeholder="him@example.com"></div>
      <button class="btn btn-primary btn-sm" id="claim-add">Claim</button>
    </div>
    <p class="fine" id="claim-msg" style="margin-top:10px;min-height:16px"></p>
    <div class="eyebrow" style="margin:20px 0 10px">YOUR ACTIVE CLAIMS</div>
    <div id="claim-list" class="fine">Loading&hellip;</div>
  </div></div>
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
