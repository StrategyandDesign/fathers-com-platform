#!/usr/bin/env python3
"""Page generator for the Fathers.com static platform. Shared chrome, per-page bodies."""
import os

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Fathers.com</title>
<meta name="description" content="{desc}">
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<script>document.documentElement.dataset.theme=localStorage.getItem("fc_theme")||"dark";</script>
<link rel="stylesheet" href="assets/css/forge.css">
</head>
<body>
'''

def nav(active='', mode='public'):
    links = [('Classes','classes.html'),('Stories','stories.html'),('Certificates','certificates.html'),('For Groups','groups.html'),('For Veterans','veterans.html')]
    if mode=='app':
        links = [('My Plan','plan.html')] + links[:2] + [('Circles','circles.html'),('Certificates','certificates.html')]
    lis = ''.join(f'<li><a href="{h}" {"class=\"active\"" if t==active else ""}>{t}</a></li>' for t,h in links)
    right = ('<a href="gift.html" class="hide-m">Gifts</a><a href="login.html" class="hide-m">Log in</a><a class="btn btn-yellow btn-sm" href="profile.html">Get your baseline</a>'
             if mode=='public' else
             '<a href="#" data-open-search class="hide-m">Search</a><a href="gift.html" class="hide-m">Gifts</a><a href="account.html" class="avatarchip" title="Account" style="text-decoration:none">M</a>')
    return f'''<nav class="nav"><div class="container nav-inner">
<a class="brand" href="index.html"><img class="lg-dark" src="assets/img/logomark-light.png" alt="Fathers.com logomark"><img class="lg-light" src="assets/img/logomark-dark.png" alt="Fathers.com logomark"><b>Fathers.com</b></a>
<ul class="nav-links">{lis}</ul>
<div class="nav-right">{right}<button class="themeswitch" data-themeswitch aria-label="Switch palette" title="Switch palette"><span class="tsw-dot"></span></button><button class="nav-toggle">MENU</button></div>
</div></nav>
'''

FOOT = '''<footer><div class="container">
<div class="footgrid">
  <div><a class="brand" href="index.html" style="margin-bottom:16px"><img class="lg-dark" src="assets/img/logomark-light.png" alt="" style="height:34px"><img class="lg-light" src="assets/img/logomark-dark.png" alt="" style="height:34px"><b>Fathers.com</b></a>
    <p class="small" style="margin-top:14px;max-width:32ch">Presence is a skill. Train it.</p>
    <p class="fine" style="margin-top:14px">PO Box 996, Tontitown, AR 72770<br>Team@Fathers.com</p></div>
  <div><h4>Train</h4><ul><li><a href="classes.html">Classes</a></li><li><a href="stories.html">Stories</a></li><li><a href="profile.html">The Keystone Profile</a></li><li><a href="certificates.html">Certificates</a></li></ul></div>
  <div><h4>Programs</h4><ul><li><a href="groups.html">For Groups</a></li><li><a href="veterans.html">For Veterans</a></li><li><a href="employers.html">For Employers</a></li><li><a href="sponsor.html">Sponsor a Father</a></li></ul></div>
  <div><h4>Company</h4><ul><li><a href="#">About NCF</a></li><li><a href="#">Research</a></li><li><a href="gift.html">Gifts</a></li><li><a href="#">Contact</a></li></ul></div>
  <div><h4>Legal</h4><ul><li><a href="#">Terms</a></li><li><a href="#">Privacy</a></li><li><a href="verify.html">Verify a certificate</a></li></ul></div>
</div>
<div style="margin-top:48px;max-width:420px"><h4 style="font-family:var(--font-mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ash);margin-bottom:12px">One useful thing for fathers, weekly</h4>
<form class="row" data-lead="newsletter" data-done="You are on the list. One useful thing, weekly."><input class="input" name="email" type="email" required placeholder="Email address"><button class="btn btn-secondary btn-sm">Send it</button></form></div>
<div class="footbottom"><span class="fine">Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit.</span><span class="fine">© <span data-year></span> National Center for Fathering</span></div>
</div></footer>
<script src="assets/js/config.js"></script>
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/roles.js"></script>
<script src="assets/js/app.js"></script>
'''

PAGES = {}

# ================================================== index.html (P1)
PAGES['index.html'] = dict(title='Learn fatherhood from men who lived it', desc='Take the twelve-minute Keystone Profile and get your ninety-day plan.', active='', mode='public', body='''
<header class="hero"><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:18px">FATHERS.COM</div>
    <h1 class="d-64">Learn fatherhood from men who lived it.</h1>
    <p class="lead" style="margin:22px 0 34px">Every class taught by a father who has been through it. Take the twelve-minute Keystone Profile and get your ninety-day plan.</p>
    <div class="row wrap"><a class="btn btn-primary" href="profile.html">Get your baseline</a><a class="link" href="classes.html">Explore classes first</a></div>
  </div>
  <div class="heromarquee" aria-hidden="true">
    <div class="hm-col hm-col-a">
      <div class="hm-track">
        <figure class="hm-card"><img src="assets/img/photos/hero-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-03.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-05.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/testimonial-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-03.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-05.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/testimonial-01.jpg" alt=""></figure>
      </div>
    </div>
    <div class="hm-col hm-col-b">
      <div class="hm-track hm-track-slow">
        <figure class="hm-card hm-play"><img src="assets/img/photos/hero-02.jpg" alt=""><span class="hm-tri"></span></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-06.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-04.jpg" alt=""></figure>
        <figure class="hm-card hm-play"><img src="assets/img/photos/hero-02.jpg" alt=""><span class="hm-tri"></span></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-06.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-04.jpg" alt=""></figure>
      </div>
    </div>
  </div>
</div></header>

<section class="band tight" id="membership"><div class="container split" style="align-items:start">
  <div>
    <h2 style="font-family:var(--font-ui);font-weight:600;font-size:22px;margin-bottom:22px">What's in a Fathers.com membership?</h2>
    <div class="row wrap"><a class="btn btn-primary" href="profile.html">Get your baseline</a><a class="btn btn-secondary" href="gift.html">Give a gift</a></div>
  </div>
  <div class="stack-16">
    <div class="check"><span class="checkmark">✓</span><span>Every class and every workbook</span></div>
    <div class="check"><span class="checkmark">✓</span><span>New classes every month</span></div>
    <div class="check"><span class="checkmark">✓</span><span>Audio mode for the drive</span></div>
    <div class="check"><span class="checkmark">✓</span><span>Downloads for offline</span></div>
    <div class="check"><span class="checkmark">✓</span><span>Your Keystone baseline and ninety-day plan</span></div>
    <div class="check"><span class="checkmark">✓</span><span>30-day money-back guarantee</span></div>
  </div>
</div></section>

<section><div class="container">
  <div class="billboard">
    <div class="slot r-21x9 play-overlay" data-slot="IMG-P1-BILL-01"><span class="tri"></span></div>
    <div class="overlay">
      <span class="pill pill-new" style="margin-bottom:14px">New</span>
      <h2 class="d-36" style="margin:10px 0 8px">The Fundamentals of Fathering</h2>
      <p class="small" style="margin-bottom:18px">The flagship class on presence, taught by Dr. Ken Canfield.</p>
      <a class="btn btn-secondary play" href="class.html">Watch trailer</a>
    </div>
  </div>
</div></section>

<section class="tight"><div class="container">
  <h2 class="d-28" style="margin-bottom:20px">Classes for the father you are right now.</h2>
  <div class="chiprow" style="margin-bottom:28px">
    <a class="chip selected" data-toggle="single" href="#">All</a><a class="chip" data-toggle="single" href="#">New Dads</a><a class="chip" data-toggle="single" href="#">Fathering Daughters</a><a class="chip" data-toggle="single" href="#">Fathering Sons</a><a class="chip" data-toggle="single" href="#">Teens</a><a class="chip" data-toggle="single" href="#">After Divorce</a><a class="chip" data-toggle="single" href="#">Stepfathers</a><a class="chip" data-toggle="single" href="#">Back From Combat</a><a class="chip" data-toggle="single" href="#">After the Sentence</a><a class="chip" data-toggle="single" href="#">Grandfathers</a>
  </div>
  <div class="rowscroll" data-repeat="5" data-prefix="IMG-P1-CAT-" data-ratio="r-2x3" data-href="class.html"
    data-titles="Dr. Ken Canfield|Coming Home Present|Fathering Daughters|Fathering After Divorce|Raising Teens"
    data-subs="The Fundamentals of Fathering|Presence after deployment|For the dad she needs|Presence across two homes|Keeping the line open"
    data-metas="12 lessons · 2h 10m|10 lessons · 1h 44m|12 lessons · 1h 58m|11 lessons · 1h 51m|13 lessons · 2h 06m"></div>
  <p style="margin-top:20px"><a class="link" href="classes.html">See all classes</a></p>
</div></section>

<section class="band"><div class="container split">
  <div>
    <h2 class="d-36">Know your baseline in twelve minutes.</h2>
    <p style="color:var(--ash);margin:18px 0 28px;max-width:52ch">The Keystone Father Profile measures four things: involvement, consistency, awareness, nurturance. You get a score, a read on where you stand, and a ninety-day plan built from it. Before you pay anything.</p>
    <a class="btn btn-primary" href="profile.html">Start the Profile</a>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">YOUR PRESENCE BASELINE</div>
    <div class="bigscore" style="font-size:72px;margin-bottom:24px">71</div>
    <div class="domain"><div class="row1"><span>Involvement</span><span class="score">78</span></div><div class="bar"><span style="width:78%"></span></div></div>
    <div class="domain gap"><div class="row1"><span>Consistency</span><span class="score">55</span></div><div class="bar"><span style="width:55%"></span></div></div>
    <div class="domain"><div class="row1"><span>Awareness</span><span class="score">74</span></div><div class="bar"><span style="width:74%"></span></div></div>
    <div class="domain" style="margin-bottom:0"><div class="row1"><span>Nurturance</span><span class="score">77</span></div><div class="bar"><span style="width:77%"></span></div></div>
  </div>
</div></section>

<section class="band-brass"><div class="container split">
  <div>
    <div class="eyebrow brass" style="margin-bottom:14px">FATHERS.COM VERIFIED CERTIFICATES</div>
    <h2 class="d-36" style="font-size:32px">Proof you did the work.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:50ch">Verified hours, identity-checked, with a serial any court, program, or employer can confirm online.</p>
    <a class="btn btn-brass" href="certificates.html">Explore Certificates</a>
  </div>
  <div class="card brass-card">
    <div class="row" style="gap:20px">
      <div class="slot r-1x1" data-slot="IMG-P0-CARD-03" style="flex:0 0 84px"></div>
      <div><h3 style="margin-bottom:6px">Fathering Fundamentals Certificate</h3>
        <div class="mono small">10.0 verified hours</div>
        <div class="mono fine" style="margin-top:8px">FC-2026-000000</div></div>
    </div>
  </div>
</div></section>

<section><div class="container split">
  <div class="slot r-4x3" data-slot="IMG-P1-GRP-01"></div>
  <div>
    <h2 class="d-36" style="font-size:32px">Better together. Bring your men.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:48ch">Circles for churches, teams, and crews. One film a week, one discussion guide, one standard.</p>
    <a class="btn btn-secondary" href="groups.html">For groups</a>
    <p class="fine" style="margin-top:16px">Also for <a class="link ash" href="employers.html" style="font-size:12px">employers</a> and <a class="link ash" href="veterans.html" style="font-size:12px">veteran programs</a>.</p>
  </div>
</div></section>

<section class="tight"><div class="container center" style="max-width:760px">
  <p class="quote">"I stopped guessing. I had a baseline and a plan, and my kids felt the difference in a month."</p>
  <div class="row" style="justify-content:center;margin-top:24px"><div class="slot r-1x1 filled" data-slot="IMG-P1-TST-01" style="width:44px;border-radius:50%"><img src="assets/img/photos/testimonial-01.jpg" alt="Marcus"></div><span class="small">Marcus, father of three, Circle member</span></div>
  <div class="row" style="justify-content:center;gap:8px;margin-top:22px"><span class="dot on"></span><span class="dot"></span><span class="dot"></span></div>
</div></section>

<section class="band tight"><div class="container split">
  <div><h2 class="d-28">Try a class on us.</h2>
    <p class="small" style="margin-top:10px;max-width:44ch">Enter your email and we will send you one full lesson and one week of The Daily.</p></div>
  <div><form class="row" data-lead="try-a-class" data-done="Sent. Check your email for the lesson."><input class="input" name="email" type="email" required placeholder="Email address"><button class="btn btn-primary">Send it</button></form>
    <p class="fine" style="margin-top:12px">One email a week at most. Unsubscribe any time. <a class="link ash" href="#" style="font-size:12px">Privacy</a></p></div>
</div></section>

<section><div class="container" style="max-width:820px">
  <h2 class="d-28" style="margin-bottom:24px">Frequently asked questions</h2>
  <details open><summary>What is Fathers.com?</summary><div class="body">Fathers.com is a training platform from the National Center for Fathering. Classes taught by fathers who lived it, a validated baseline, and a plan you work weekly.</div></details>
  <details><summary>What's included in a membership?</summary><div class="body">Every class, every workbook, your Keystone baseline and ninety-day plan, The Daily, audio mode, and downloads. $120 a year, billed annually, with a 30-day money-back guarantee.</div></details>
  <details><summary>How does the Keystone Profile work?</summary><div class="body">About 40 questions in twelve minutes. You get four domain scores, an overall baseline, and a plan built from your gap. Your results are yours. We never share them.</div></details>
  <details><summary>How much does it cost?</summary><div class="body">$120 a year. That's $10 a month, billed once annually. Verified Certificates are priced separately.</div></details>
  <details><summary>Are the Certificates accepted by courts?</summary><div class="body">Certificates carry verified hours, identity checks, and a public verification page. Acceptance is decided by each court or program, so confirm with yours before enrolling.</div></details>
  <details><summary>Is this religious?</summary><div class="body">No. Faith is an optional lens you can switch on during the Profile. It changes which classes and actions we recommend. Nothing else.</div></details>
</div></section>
''')

# ================================================== profile.html (P2)
PAGES['profile.html'] = dict(title='The Keystone Father Profile', desc='Twelve minutes. Four scores. One plan.', active='', mode='public', nochrome=True, body='''
<div class="assess" id="keystone"></div>
<p class="center fine" style="padding:0 0 28px"><a class="link ash" href="index.html" style="font-size:12px">Back to Fathers.com</a></p>
''')

# ================================================== stories.html (P3)
PAGES['stories.html'] = dict(title='Stories', desc='Epic fatherhood films. Origin, crisis, the turn, the standard.', active='Stories', mode='public', body='''
<section class="tight" style="padding-top:48px"><div class="container">
  <div class="billboard">
    <div class="slot r-21x9 play-overlay" data-slot="IMG-P3-BILL-01"><span class="tri"></span></div>
    <div class="overlay">
      <div class="eyebrow" style="margin-bottom:12px">STORIES</div>
      <h1 class="d-48" style="margin-bottom:8px">From Combat to the Kitchen Table</h1>
      <p class="small" style="margin-bottom:18px">Nineteen years in. Two tours. One promise to his son.</p>
      <div class="row"><a class="btn btn-primary play" href="story.html">Watch</a><a class="btn btn-secondary" href="story.html">Trailer</a><span class="tag">24 min</span></div>
    </div>
  </div>
</div></section>

<section class="tight"><div class="container stack-32">
  <div><h2 class="d-22" style="font-family:var(--font-display);font-size:24px;margin-bottom:18px">Back From Combat</h2>
  <div class="rowscroll" data-repeat="6" data-prefix="IMG-P3-ROW1-" data-ratio="r-16x9" data-href="story.html"
    data-titles="The Longest Deployment|Base Housing|What the Silence Said|Two Flags|Reveille at Home|The Handoff"
    data-metas="24 min|18 min|21 min|26 min|17 min|22 min"></div></div>
  <div><h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:18px">After the Sentence</h2>
  <div class="rowscroll" data-repeat="6" data-prefix="IMG-P3-ROW2-" data-ratio="r-16x9" data-href="story.html"
    data-titles="Visitation Day|Eight Years, Every Letter|The First Pickup|Walking Papers|The Long Way Back|Signed Out"
    data-metas="22 min|19 min|25 min|20 min|23 min|18 min"></div></div>
  <div><h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:18px">Starting Over</h2>
  <div class="rowscroll" data-repeat="6" data-prefix="IMG-P3-ROW3-" data-ratio="r-16x9" data-href="story.html"
    data-titles="Two Households|The Apology|Sundays at Noon|Step by Step|The New Standard|Full Custody of Tuesday"
    data-metas="20 min|17 min|23 min|19 min|21 min|24 min"></div></div>
  <div><h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:18px">The First Year</h2>
  <div class="rowscroll" data-repeat="6" data-prefix="IMG-P3-ROW4-" data-ratio="r-16x9" data-href="story.html"
    data-titles="Night Shift|Three Weeks of Leave|The Carrier|What My Father Did|First Fever|Home by Six"
    data-metas="16 min|18 min|15 min|22 min|17 min|19 min"></div></div>
</div></section>

<section class="band tight"><div class="container row between wrap">
  <h2 class="d-28">Every man in these films took the Profile.</h2>
  <a class="btn btn-primary" href="profile.html">Get your baseline</a>
</div></section>
''')

# ================================================== story.html (P3 detail + submission)
PAGES['story.html'] = dict(title='From Combat to the Kitchen Table', desc='One father. Origin, crisis, the turn, the standard.', active='Stories', mode='public', body='''
<div class="slot r-21x9 play-overlay flush" data-slot="IMG-P3-DET-01" style="max-height:62vh"><span class="tri"></span></div>
<section class="tight"><div class="container" style="display:grid;grid-template-columns:1.4fr .9fr;gap:56px">
  <div>
    <h1 class="d-36">From Combat to the Kitchen Table</h1>
    <p class="small" style="margin:10px 0 30px">Ray M. Father of two. Army, retired.</p>
    <div class="stack-8">
      <div class="row between" style="padding:14px 16px;border:1px solid var(--ember);border-radius:8px"><span><b class="mono" style="margin-right:14px;color:var(--ember-hi)">00:00</b>Origin</span><span class="tag" style="color:var(--ember-hi)">PLAYING</span></div>
      <div class="row between" style="padding:14px 16px;border:1px solid var(--hairline);border-radius:8px"><span><b class="mono ash" style="margin-right:14px">06:40</b>Crisis</span></div>
      <div class="row between" style="padding:14px 16px;border:1px solid var(--hairline);border-radius:8px"><span><b class="mono ash" style="margin-right:14px">14:10</b>The Turn</span></div>
      <div class="row between" style="padding:14px 16px;border:1px solid var(--hairline);border-radius:8px"><span><b class="mono ash" style="margin-right:14px">19:30</b>The Standard</span></div>
    </div>
    <div class="row" style="margin-top:26px"><a class="link ash" href="#" style="font-size:13px">Share link</a><a class="link ash" href="#" style="font-size:13px">Text it</a><a class="link ash" href="#" style="font-size:13px">Email it</a><a class="link ash" href="#" style="font-size:13px;margin-left:auto">Report</a></div>
  </div>
  <aside class="stack-24">
    <div class="card"><div class="eyebrow" style="margin-bottom:14px">WHAT HE WISHED HE KNEW SOONER</div>
      <p class="quote" style="font-size:19px;margin-bottom:12px">"Coming home is a mission, not a landing."</p>
      <p class="quote" style="font-size:19px;margin-bottom:12px">"Your kids don't need the story. They need the schedule."</p>
      <p class="quote" style="font-size:19px">"Repair beats explain. Every time."</p></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:14px">WHAT HE TRAINS NOW</div>
      <div class="row" style="gap:16px"><div class="slot r-2x3" data-slot="IMG-P3-DET-02" style="flex:0 0 72px"></div>
      <div><b style="font-size:15px">Watch Ray's class: Coming Home Present</b><p class="small" style="margin-top:6px">10 lessons · 1h 44m</p></div></div>
      <a class="btn btn-secondary btn-sm" href="class.html" style="margin-top:16px">Go to the class</a></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:12px">WHERE HE STARTED</div>
      <p class="small" style="margin-bottom:14px">Ray's first Presence Baseline: <b class="mono bone">43</b></p>
      <a class="btn btn-primary btn-sm" href="profile.html">Get yours</a></div>
  </aside>
</div></section>

<section class="band"><div class="container split" style="align-items:start">
  <div><h2 class="d-36">Your story is another man's map.</h2>
    <p style="color:var(--ash);margin-top:16px;max-width:46ch">Tell us what you went through and what you overcame. We film a handful of these every quarter. Every submission gets read.</p>
    <div class="grid-3" style="margin-top:32px;gap:14px">
      <div class="slot r-16x9" data-slot="IMG-P3-SUB-01"></div><div class="slot r-16x9" data-slot="IMG-P3-SUB-02"></div><div class="slot r-16x9" data-slot="IMG-P3-SUB-03"></div>
    </div><p class="fine" style="margin-top:10px">Filmed from submissions.</p></div>
  <form class="card" style="padding:32px" data-lead="story" data-done="Sent. Every submission gets read.">
    <div class="field"><label>The season that almost broke you</label><textarea name="season" required></textarea></div>
    <div class="field"><label>The turn</label><textarea name="turn" required></textarea></div>
    <div class="field"><label>The standard you hold now</label><textarea name="standard" required></textarea></div>
    <div class="field"><label>Contact email</label><input class="input" name="email" type="email" required placeholder="you@example.com"></div>
    <label style="display:flex;gap:10px;align-items:center;color:var(--bone);font-size:14px;margin-bottom:20px"><input type="checkbox" name="consent" required style="accent-color:var(--pine)"> You may contact me about filming.</label>
    <button class="btn btn-primary">Send it</button>
  </form>
</div></section>
''')

# ================================================== classes.html (P4 catalog)
PAGES['classes.html'] = dict(title='All Classes', desc='Nine classes for the father you are right now.', active='Classes', mode='public', body='''
<section class="tight" style="padding-top:56px"><div class="container">
  <div class="row between wrap" style="margin-bottom:30px">
    <h1 class="d-36">All Classes</h1>
    <button class="input" data-open-search style="max-width:320px;text-align:left;color:var(--ash);cursor:pointer">Search classes and lessons</button>
  </div>
  <div class="stack-16" style="margin-bottom:40px">
    <div class="row wrap"><span class="tag" style="width:92px">LIFE STAGE</span>
      <div class="chiprow"><a class="chip" data-toggle href="#">Expecting</a><a class="chip" data-toggle href="#">0-5</a><a class="chip" data-toggle href="#">6-12</a><a class="chip" data-toggle href="#">Teens</a><a class="chip" data-toggle href="#">Grown</a></div></div>
    <div class="row wrap"><span class="tag" style="width:92px">SITUATION</span>
      <div class="chiprow"><a class="chip" data-toggle href="#">After Divorce</a><a class="chip" data-toggle href="#">Stepfathers</a><a class="chip" data-toggle href="#">Back From Combat</a><a class="chip" data-toggle href="#">After the Sentence</a><a class="chip" data-toggle href="#">Grandfathers</a><a class="chip" data-toggle href="#">Faith</a></div></div>
  </div>
  <div class="grid-3" id="classgrid">
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-01"></div><div class="row" style="margin:12px 0 0"><span class="pill pill-new">New</span></div><div class="name">Dr. Ken Canfield</div><div class="sub">The Fundamentals of Fathering</div><div class="meta">12 lessons · 2h 10m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-02"></div><div class="name" style="margin-top:12px">Fathering Daughters</div><div class="sub">For the dad she needs</div><div class="meta">12 lessons · 1h 58m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-03"></div><div class="name" style="margin-top:12px">Fathering Sons</div><div class="sub">Raising the man he becomes</div><div class="meta">11 lessons · 1h 49m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-04"></div><div class="name" style="margin-top:12px">Raising Teens</div><div class="sub">Keeping the line open</div><div class="meta">13 lessons · 2h 06m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-05"></div><div class="name" style="margin-top:12px">The First Five Years</div><div class="sub">Presence from day one</div><div class="meta">10 lessons · 1h 38m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-06"></div><div class="name" style="margin-top:12px">Fathering After Divorce</div><div class="sub">Presence across two homes</div><div class="meta">11 lessons · 1h 51m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-07"></div><div class="name" style="margin-top:12px">Stepfathers and Blended Families</div><div class="sub">Earning the seat</div><div class="meta">10 lessons · 1h 42m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-08"></div><div class="name" style="margin-top:12px">Coming Home Present</div><div class="sub">Presence after deployment</div><div class="meta">10 lessons · 1h 44m</div></a>
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-09"></div><div class="name" style="margin-top:12px">Dr. Ken Canfield</div><div class="sub">Grandfathering</div><div class="meta">9 lessons · 1h 22m</div></a>
  </div>
</div></section>

<div class="searchveil" id="searchveil"><div class="searchpanel">
  <input class="input" placeholder="Search classes and lessons" value="consistency">
  <div class="grid-2" style="margin-top:22px;gap:32px">
    <div><div class="eyebrow" style="margin-bottom:14px">RECENT</div>
      <p class="small" style="margin-bottom:10px">repair</p><p class="small" style="margin-bottom:10px">teen daughter</p><p class="small">deployment</p></div>
    <div><div class="eyebrow" style="margin-bottom:14px">RESULTS FOR "CONSISTENCY"</div>
      <div class="stack-16">
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-01" style="width:44px"></div><div><b style="font-size:14px">The Fundamentals of Fathering</b><p class="fine">Class</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-02" style="width:44px"></div><div><b style="font-size:14px">Fathering After Divorce</b><p class="fine">Class</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-03" style="width:44px"></div><div><b style="font-size:14px">Lesson 3: A Schedule They Can Trust</b><p class="fine">In The Fundamentals of Fathering</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-04" style="width:44px"></div><div><b style="font-size:14px">Lesson 7: Same Dad, Both Houses</b><p class="fine">In Fathering After Divorce</p></div></div>
      </div></div>
  </div>
</div></div>
''')

# ================================================== class.html (P4 detail)
PAGES['class.html'] = dict(title='The Fundamentals of Fathering', desc='The flagship class on presence, taught by Dr. Ken Canfield.', active='Classes', mode='public', body='''
<div class="billboard">
  <div class="slot r-21x9 play-overlay flush" data-slot="IMG-P4-DET-01" style="max-height:64vh"><span class="tri"></span></div>
  <div class="overlay container" style="left:50%;transform:translateX(-50%);max-width:var(--max)">
    <div class="eyebrow" style="margin-bottom:10px">FLAGSHIP CLASS</div>
    <h1 class="d-48">The Fundamentals of Fathering</h1>
    <p class="small" style="margin-top:10px">Dr. Ken Canfield. Founder, National Center for Fathering. Four decades of research. One standard.</p>
  </div>
</div>
<div class="nav" style="top:72px;z-index:50"><div class="container nav-inner" style="height:60px">
  <b style="font-size:15px">The Fundamentals of Fathering</b>
  <div class="nav-right"><a class="btn btn-yellow btn-sm" href="profile.html">Get your baseline</a></div>
</div></div>

<section class="tight"><div class="container" style="display:grid;grid-template-columns:1.45fr .85fr;gap:56px;align-items:start">
  <div>
    <h2 class="d-22" style="font-family:var(--font-display);font-size:22px;margin-bottom:18px">What you will train</h2>
    <div class="stack-8" style="margin-bottom:44px">
      <div class="actionrow"><span class="checkmark">→</span><div class="txt">Read your kids' inner weather.</div></div>
      <div class="actionrow"><span class="checkmark">→</span><div class="txt">Build a schedule they can trust.</div></div>
      <div class="actionrow"><span class="checkmark">→</span><div class="txt">Say what you stand for out loud.</div></div>
      <div class="actionrow"><span class="checkmark">→</span><div class="txt">Repair fast when you blow it.</div></div>
    </div>
    <h2 style="font-family:var(--font-display);font-size:22px;margin-bottom:8px">Lessons</h2>
    <details open><summary><span><b class="mono ash" style="margin-right:14px">01</b>Why Presence Wins</span><span class="tag">8:12</span></summary>
      <div class="body"><div class="row" style="align-items:flex-start;gap:18px"><div class="slot r-16x9" data-slot="IMG-P4-DET-02" style="flex:0 0 180px"></div>
      <p style="font-size:14px">The research case for father presence in nine minutes. What forty years of data says your kids get when you show up, and what it costs when you don't.</p></div></div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">02</b>Your Baseline, Read Honestly</span><span class="tag">9:04</span></summary><div class="body">Reading your four Keystone scores without flinching.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">03</b>A Schedule They Can Trust</span><span class="tag">10:31</span></summary><div class="body">Consistency mechanics: standing time, predictability, the calendar as covenant.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">04</b>Enter Their World</span><span class="tag">9:47</span></summary><div class="body">Awareness training: friends' names, inner weather, questions without fixing.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">05</b>Repair Fast</span><span class="tag">9:12</span></summary><div class="body">The 24-hour repair standard.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">06</b>Say What You Stand For</span><span class="tag">8:58</span></summary><div class="body">Values out loud, not just rules enforced.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">07</b>The Distracted Father</span><span class="tag">8:20</span></summary><div class="body">Phones, work, and the attention your kids can feel.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">08</b>Discipline That Builds</span><span class="tag">10:05</span></summary><div class="body">Standards without fear.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">09</b>Fathering Under Pressure</span><span class="tag">9:33</span></summary><div class="body">Money, conflict, exhaustion, and presence anyway.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">10</b>Your Own Father</span><span class="tag">11:02</span></summary><div class="body">What you inherited, what you keep, what stops with you.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">11</b>The Brotherhood Requirement</span><span class="tag">8:44</span></summary><div class="body">Why no man holds a standard alone.</div></details>
    <details><summary><span><b class="mono ash" style="margin-right:14px">12</b>The Ninety-Day Standard</span><span class="tag">9:26</span></summary><div class="body">Locking the plan and the retake.</div></details>
    <div class="row" style="align-items:flex-start;gap:20px;margin-top:44px">
      <div class="slot r-1x1" data-slot="IMG-P4-DET-03" style="flex:0 0 96px;border-radius:50%"></div>
      <div><h3 style="margin-bottom:8px">About Ken</h3>
      <p class="small" style="max-width:56ch">Dr. Ken Canfield founded the National Center for Fathering and built the research base behind the Keystone framework. Four decades, thousands of fathers studied, one conclusion: presence is a trainable skill. He is a father of five and a grandfather, and he teaches like it.</p></div>
    </div>
  </div>
  <aside class="stack-24" style="position:sticky;top:160px">
    <div class="card"><div class="row" style="gap:16px"><span style="font-size:28px">▤</span>
      <div><b style="font-size:15px">The Fundamentals Workbook</b><p class="fine" style="margin-top:4px">28 pages</p></div></div>
      <button class="btn btn-secondary btn-sm" style="margin-top:16px;width:100%" onclick="toast('Included with membership.')">Included with membership</button></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:14px">INCLUDED IN YOUR MEMBERSHIP</div>
      <div class="stack-8">
        <div class="check"><span class="checkmark">✓</span><span class="small">Every class and workbook</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Your baseline and plan</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">30-day money-back guarantee</span></div>
      </div></div>
    <div class="card brass-card"><p class="small" style="margin-bottom:12px">Need court-ready proof? This class has a Verified Certificate edition.</p>
      <a class="link brass" href="certificates.html" style="font-size:14px">See the Certificate</a></div>
  </aside>
</div></section>

<section class="band tight"><div class="container">
  <h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:20px">Related classes</h2>
  <div class="rowscroll" data-repeat="4" data-prefix="IMG-P4-REL-" data-ratio="r-2x3" data-href="class.html"
    data-titles="Fathering Sons|Raising Teens|The First Five Years|Coming Home Present"
    data-metas="11 lessons|13 lessons|10 lessons|10 lessons"></div>
</div></section>
''')

# ================================================== player.html (P5)
PAGES['player.html'] = dict(title='Lesson 4 · The Fundamentals of Fathering', desc='Lesson player.', active='Classes', mode='app', body='''
<section class="tight" style="padding-top:36px"><div class="container">
  <p class="tag" style="margin-bottom:14px">The Fundamentals of Fathering / Lesson 4</p>
  <div style="display:grid;grid-template-columns:1.55fr .75fr;gap:32px;align-items:start">
    <div>
      <div class="slot r-16x9 play-overlay" data-slot="IMG-P5-PLY-01" id="stage"><span class="tri"></span></div>
      <div class="card" style="margin-top:14px;padding:14px 18px">
        <div class="row" style="gap:18px">
          <button class="btn btn-secondary btn-sm play" onclick="toast('Resuming at 06:12.')">Play</button>
          <span class="mono small">06:12 / 09:47</span>
          <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:62%"></div></div>
          <span class="chip" style="padding:4px 12px;font-size:12px" onclick="toast('Speeds: 0.75, 1, 1.25, 1.5')">1x</span>
          <span class="chip" style="padding:4px 12px;font-size:12px" onclick="toast('Captions on.')">CC</span>
          <span class="chip" style="padding:4px 12px;font-size:12px" onclick="document.getElementById('audiobar').style.display='flex';toast('Audio mode. Keep your eyes on the road.')">Audio</span>
        </div>
      </div>
      <div id="audiobar" class="card" style="display:none;margin-top:10px;padding:12px 16px;align-items:center;gap:14px">
        <div class="slot r-1x1" data-slot="IMG-P5-AUD-01" style="width:44px"></div>
        <b style="font-size:14px">Lesson 4 · Enter Their World</b>
        <span class="mono fine" style="margin-left:auto">Audio mode</span>
      </div>
      <div data-tabs style="margin-top:28px">
        <div class="tabs"><button class="active">Overview</button><button>Workbook</button><button>Notes</button></div>
        <div class="tabpanel active">
          <p class="small" style="max-width:64ch;margin-bottom:20px">Awareness is the skill of knowing your kids' inner weather before they announce it. This lesson trains three habits: learn the names, ask without fixing, and watch the transitions. Ten minutes now, a different dinner table by Friday.</p>
          <p class="quote" style="font-size:22px">"Consistency is love the kids can set a clock by."</p>
        </div>
        <div class="tabpanel">
          <div class="card" style="max-width:420px"><b style="font-size:15px">The Fundamentals Workbook</b><p class="fine" style="margin:6px 0 14px">Pages 12-15 pair with this lesson.</p>
          <button class="btn btn-secondary btn-sm" onclick="toast('PDF delivery wires to Supabase storage.')">Download PDF</button></div>
        </div>
        <div class="tabpanel">
          <div class="stack-16" style="max-width:560px">
            <div class="card" style="padding:16px"><span class="chip" style="padding:2px 10px;font-size:11px;margin-bottom:8px" onclick="toast('Seek to 06:12.')">06:12</span><p class="small">Names of their three closest friends. I know one. One.</p></div>
            <div class="card" style="padding:16px"><span class="chip" style="padding:2px 10px;font-size:11px;margin-bottom:8px" onclick="toast('Seek to 07:48.')">07:48</span><p class="small">Ask about the bus ride, not the grades.</p></div>
            <div class="row"><input class="input" placeholder="Add a note at 08:40"><button class="btn btn-secondary btn-sm" onclick="toast('Saved to your plan.')">Save</button></div>
            <p class="fine">Notes save to your plan. Write like nobody's grading it.</p>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:30px;padding:28px">
        <div class="row between wrap">
          <div><div class="row" style="gap:10px;margin-bottom:8px"><span class="checkmark">✓</span><b>Lesson 4 complete</b></div>
            <p class="small">Up next: Lesson 5, Repair Fast · playing in <b id="countdown" style="font-family:var(--font-mono)"><b>5</b></b>s</p></div>
          <div class="row"><button class="btn btn-primary btn-sm">Play now</button><button class="btn btn-secondary btn-sm" onclick="toast('Autoplay canceled.')">Not now</button></div>
        </div>
        <hr class="hr" style="margin:20px 0">
        <p class="small">This week's action from your plan: <b class="bone">Eat breakfast with your kids twice.</b> Mark it done in My Plan. <a class="link ash" href="plan.html" style="font-size:13px">Go to My Plan</a></p>
      </div>
    </div>
    <aside class="card" style="padding:20px">
      <b style="font-size:15px">The Fundamentals of Fathering</b>
      <div class="row" style="margin:12px 0 20px"><div class="progress-track" style="flex:1"><div class="progress-fill pine" style="width:33%"></div></div><span class="mono fine">4 of 12</span></div>
      <div class="stack-8" style="font-size:14px">
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">✓</span> 01 Why Presence Wins</span><span class="tag">8:12</span></div>
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">✓</span> 02 Your Baseline</span><span class="tag">9:04</span></div>
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">✓</span> 03 A Schedule They Can Trust</span><span class="tag">10:31</span></div>
        <div class="row between" style="padding:10px 12px;border-left:3px solid var(--ember);border-radius:6px;background:var(--coal-2)"><b>04 Enter Their World</b><span class="tag">9:47</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">05 Repair Fast</span><span class="tag" onclick="toast('Downloading… saved for offline.')" style="cursor:pointer">⬇ 9:12</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">06 Say What You Stand For</span><span class="tag">8:58</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">07 The Distracted Father</span><span class="tag">8:20</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">08 Discipline That Builds</span><span class="tag">10:05</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">09 Fathering Under Pressure</span><span class="tag">9:33</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">10 Your Own Father</span><span class="tag">11:02</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">11 The Brotherhood Requirement</span><span class="tag">8:44</span></div>
        <div class="row between" style="padding:10px 12px"><span class="ash">12 The Ninety-Day Standard</span><span class="tag">9:26</span></div>
      </div>
    </aside>
  </div>
</div></section>
''')

# ================================================== plan.html (P6)
PAGES['plan.html'] = dict(title='My Plan', desc='Week 3 of 12. What this week asks of you.', active='My Plan', mode='app', auth=True, body='''
<section class="tight" style="padding-top:44px"><div class="container">
  <div class="row between wrap" style="margin-bottom:34px">
    <h1 class="d-36">Morning, Marcus.</h1>
    <div class="row"><span class="chip" style="cursor:default">Baseline <b class="mono" id="baselineScore" style="margin-left:8px">71</b></span>
      <span class="chip" id="chainChip" style="cursor:default">⛓ 3 weeks straight</span>
      <span class="tag">Retake at Day 90</span></div>
  </div>
  <div data-tabs>
    <div class="tabs"><button class="active">Plan</button><button>Progress</button><button>My List</button></div>

    <div class="tabpanel active">
      <div class="card" id="thisweek" style="padding:32px;margin-bottom:28px">
        <div class="eyebrow" style="margin-bottom:8px">THIS WEEK</div>
        <h2 class="d-28" style="margin-bottom:22px">Week 3: Show up on schedule.</h2>
        <div class="stack-16">
          <div class="actionrow" style="align-items:center">
            <div class="slot r-16x9" data-slot="IMG-P6-WK-01" style="flex:0 0 120px"></div>
            <div style="flex:1"><b style="font-size:15px">Watch: Lesson 5, Repair Fast · 9 min</b>
              <div class="progress-track" style="margin-top:10px;max-width:220px"><div class="progress-fill" style="width:40%"></div></div></div>
            <a class="btn btn-primary btn-sm play" href="player.html">Resume</a>
          </div>
          <label class="actionrow"><input type="checkbox" data-persist="fc_w3_a1"><div style="flex:1"><div class="txt">Eat breakfast with your kids twice this week.</div><div class="meta">Consistency</div></div></label>
          <label class="actionrow"><input type="checkbox" data-persist="fc_w3_a2"><div style="flex:1"><div class="txt">Ask each kid one question about their world. No fixing.</div><div class="meta">Awareness</div></div></label>
        </div>
        <p class="fine" style="margin-top:16px">Mark them when they happen. Honest beats perfect.</p>
      </div>

      <h3 style="font-family:var(--font-display);font-size:22px;margin-bottom:16px">Continue watching</h3>
      <div class="rowscroll" data-repeat="3" data-prefix="IMG-P6-CW-" data-ratio="r-16x9" data-href="player.html"
        data-titles="Enter Their World|Two Households|The First Pickup" data-metas="62% watched|31% watched|12% watched" style="margin-bottom:40px"></div>

      <div class="card" style="padding:28px;margin-bottom:28px">
        <div class="eyebrow" style="margin-bottom:16px">YOUR NINETY DAYS</div>
        <div class="weeks">
          <span class="done"></span><span class="done"></span><span class="now"></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="phaselabels"><span>WKS 1-4 · SHOW UP ON SCHEDULE</span><span>5-8 · ENTER THEIR WORLD</span><span>9-12 · SET THE STANDARD</span></div>
      </div>

      <div class="card" style="max-width:460px">
        <div class="row" style="gap:16px">
          <div class="slot r-1x1 play-overlay" data-slot="IMG-P6-DLY-01" style="flex:0 0 72px"><span class="tri" style="border-left-width:10px;border-top-width:6px;border-bottom-width:6px"></span></div>
          <div><div class="eyebrow" style="margin-bottom:6px">THE DAILY</div>
          <b style="font-size:15px">Today's 3 minutes: What your silence teaches</b></div>
        </div>
      </div>
    </div>

    <div class="tabpanel">
      <div class="grid-2" style="margin-bottom:36px;align-items:end">
        <div><div class="eyebrow" style="margin-bottom:12px">BASELINE TO NOW</div>
          <div class="row" style="gap:40px;align-items:baseline">
            <div><div class="bigscore ash" style="font-size:64px">71</div><p class="fine">Day 0</p></div>
            <div><div class="bigscore" style="font-size:64px;color:var(--hairline-strong)">--</div><p class="fine">Day 90</p></div>
          </div></div>
        <div><button class="btn btn-secondary" disabled title="Unlocks at Day 90: Aug 12" style="opacity:.5">Retake the Profile</button>
          <p class="fine" style="margin-top:10px">Unlocks at Day 90: Aug 12.</p></div>
      </div>
      <div style="max-width:560px;margin-bottom:44px">
        <div class="domain"><div class="row1"><span>Involvement</span><span class="score">78</span></div><div class="bar"><span style="width:78%"></span></div></div>
        <div class="domain gap"><div class="row1"><span>Consistency <span class="tag" style="color:var(--ember-hi)">+ YOUR WORK HERE</span></span><span class="score">55</span></div><div class="bar"><span style="width:55%"></span></div></div>
        <div class="domain"><div class="row1"><span>Awareness</span><span class="score">74</span></div><div class="bar"><span style="width:74%"></span></div></div>
        <div class="domain"><div class="row1"><span>Nurturance</span><span class="score">77</span></div><div class="bar"><span style="width:77%"></span></div></div>
      </div>
      <div class="grid-4" style="margin-bottom:44px">
        <div class="card stat"><div class="num">14</div><div class="lbl">Lessons finished</div></div>
        <div class="card stat"><div class="num">11</div><div class="lbl">Actions done</div></div>
        <div class="card stat"><div class="num">3</div><div class="lbl">Weeks on plan</div></div>
        <div class="card stat"><div class="num">9</div><div class="lbl">Notes taken</div></div>
      </div>
      <div class="eyebrow" style="margin-bottom:16px">EARNED</div>
      <div class="row wrap" style="margin-bottom:44px">
        <div class="badge-earned"><span class="seal">FC</span><span class="t">Fundamentals: Complete</span></div>
        <div class="badge-earned"><span class="seal">30</span><span class="t">First Month Standard</span></div>
        <div class="badge-earned locked"><span class="seal">?</span><span class="t">Eight Week Standard</span></div>
        <div class="badge-earned locked"><span class="seal">?</span><span class="t">Ninety-Day Retake</span></div>
        <div class="badge-earned locked"><span class="seal">?</span><span class="t">Circle Brother</span></div>
      </div>
      <div class="eyebrow" style="margin-bottom:16px">HISTORY</div>
      <table><tbody>
        <tr><td class="mono fine">Jul 3</td><td>Marked done: Ask one question about their world</td><td class="tag">ACTION</td></tr>
        <tr><td class="mono fine">Jul 2</td><td>Finished Lesson 4: Enter Their World</td><td class="tag">LESSON</td></tr>
        <tr><td class="mono fine">Jul 1</td><td>Marked done: Breakfast with the kids</td><td class="tag">ACTION</td></tr>
        <tr><td class="mono fine">Jun 29</td><td>Finished Lesson 3: A Schedule They Can Trust</td><td class="tag">LESSON</td></tr>
      </tbody></table>
    </div>

    <div class="tabpanel">
      <div class="grid-3" id="mylist">
        <a class="mediacard" href="class.html"><div class="slot r-16x9" data-slot="IMG-P6-ML-01"></div><div class="name" style="margin-top:10px">Raising Teens</div><div class="meta">Class</div></a>
        <a class="mediacard" href="story.html"><div class="slot r-16x9" data-slot="IMG-P6-ML-02"></div><div class="name" style="margin-top:10px">Visitation Day</div><div class="meta">Story · 22 min</div></a>
        <a class="mediacard" href="class.html"><div class="slot r-16x9" data-slot="IMG-P6-ML-03"></div><div class="name" style="margin-top:10px">Fathering Sons</div><div class="meta">Class</div></a>
      </div>
      <p class="fine" style="margin-top:24px">Save classes and stories here. Build your own bench.</p>
    </div>
  </div>
</div></section>
''')

# ================================================== circles.html (P7 in-product)
PAGES['circles.html'] = dict(title='My Circle', desc='Living Hope Men. One film, one discussion, one standard.', active='Circles', mode='app', auth=True, body='''
<section class="tight" style="padding-top:44px"><div class="container">
  <div class="row between wrap" style="margin-bottom:30px">
    <div><h1 class="d-36">Living Hope Men, Tuesday 0600</h1>
      <div class="row" style="margin-top:12px"><span class="chip" style="cursor:default">14 men</span><span class="chip" style="cursor:default">Next: Tue Jul 14, 6:00 AM</span></div></div>
  </div>
  <div data-tabs>
    <div class="tabs"><button class="active">This Week</button><button>Members</button><button>Leader Kit</button></div>

    <div class="tabpanel active"><div style="display:grid;grid-template-columns:1.5fr .8fr;gap:40px;align-items:start">
      <div>
        <div class="card" style="padding:28px;margin-bottom:26px">
          <div class="eyebrow" style="margin-bottom:14px">THIS WEEK IN CIRCLE</div>
          <div class="row" style="gap:18px;align-items:flex-start;margin-bottom:20px">
            <div class="slot r-16x9 play-overlay" data-slot="IMG-P7-CIR-01" style="flex:0 0 200px"><span class="tri"></span></div>
            <div><b style="font-size:15px">Watch before Tuesday: After the Sentence · 22 min</b></div>
          </div>
          <p class="quote" style="font-size:20px;margin-bottom:18px">"Where did your father's absence still shape your hand?"</p>
          <div class="actionrow"><span class="checkmark">→</span><div class="txt">Tell one man in this Circle your week 3 action. Let him check you.</div></div>
        </div>
        <div class="card" style="padding:24px">
          <div class="row" style="margin-bottom:22px"><span class="avatarchip">M</span><input class="input" placeholder="Say it straight"><button class="btn btn-primary btn-sm" onclick="toast('Posted to your Circle.')">Post</button></div>
          <div class="stack-24">
            <div><div class="row" style="margin-bottom:8px"><span class="avatarchip">D</span><b style="font-size:14px">Dave R.</b><span class="fine">2h</span><a class="link ash" href="#" style="font-size:12px;margin-left:auto" onclick="event.preventDefault();toast('Reported. A leader will review it.')">Report</a></div>
              <p class="small">Watched it on lunch. The visitation scene wrecked me. My old man never once showed. Breaking that this week.</p>
              <div class="row" style="margin-top:8px"><a class="link ash" href="#" style="font-size:12px">Like · 6</a><a class="link ash" href="#" style="font-size:12px">Reply</a></div></div>
            <div><div class="row" style="margin-bottom:8px"><span class="avatarchip">T</span><b style="font-size:14px">Tom K.</b><span class="fine">5h</span></div>
              <p class="small">My week 3 action is breakfast twice. Dave, check me Friday.</p>
              <div class="row" style="margin-top:8px"><a class="link ash" href="#" style="font-size:12px">Like · 4</a><a class="link ash" href="#" style="font-size:12px">Reply</a></div></div>
            <div><div class="row" style="margin-bottom:8px"><span class="avatarchip">J</span><b style="font-size:14px">Jesse P.</b><span class="fine">1d</span></div>
              <p class="small">First week here. Took the Profile Sunday. 58. Starting point.</p>
              <div class="row" style="margin-top:8px"><a class="link ash" href="#" style="font-size:12px">Like · 9</a><a class="link ash" href="#" style="font-size:12px">Reply</a></div></div>
          </div>
        </div>
      </div>
      <aside class="card" style="padding:20px">
        <div class="eyebrow" style="margin-bottom:16px">MEMBERS · LAST 4 WEEKS</div>
        <table style="font-size:13px"><tbody>
          <tr><td style="padding:8px 4px">Marcus T.</td><td class="row" style="gap:6px;border:0;padding:8px 4px"><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span></td></tr>
          <tr><td style="padding:8px 4px">Dave R.</td><td class="row" style="gap:6px;border:0;padding:8px 4px"><span class="dot on"></span><span class="dot on"></span><span class="dot"></span><span class="dot on"></span></td></tr>
          <tr><td style="padding:8px 4px">Tom K.</td><td class="row" style="gap:6px;border:0;padding:8px 4px"><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span><span class="dot"></span></td></tr>
          <tr><td style="padding:8px 4px">Jesse P.</td><td class="row" style="gap:6px;border:0;padding:8px 4px"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot on"></span></td></tr>
        </tbody></table>
      </aside>
    </div></div>

    <div class="tabpanel">
      <table><thead><tr><th>Name</th><th>Baseline taken</th><th>Last active</th><th>Weeks attended</th></tr></thead><tbody>
        <tr><td>Marcus T.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">✓</span></td><td class="fine">Today</td><td class="mono fine">4 / 4</td></tr>
        <tr><td>Dave R.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">✓</span></td><td class="fine">2h ago</td><td class="mono fine">3 / 4</td></tr>
        <tr><td>Tom K.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">✓</span></td><td class="fine">5h ago</td><td class="mono fine">3 / 4</td></tr>
        <tr><td>Jesse P.</td><td class="fine">Not yet</td><td class="fine">1d ago</td><td class="mono fine">1 / 4</td></tr>
      </tbody></table>
    </div>

    <div class="tabpanel">
      <div class="grid-2" style="gap:24px">
        <div class="card"><b style="font-size:15px">Session guide</b><p class="fine" style="margin:6px 0 16px">After the Sentence · 6 pages</p>
          <button class="btn btn-secondary btn-sm" onclick="toast('PDF wires to Supabase storage.')">Download PDF</button></div>
        <div class="card"><b style="font-size:15px">Start a meeting</b><p class="fine" style="margin:6px 0 16px">Projector-friendly mode: film, question, action on one screen.</p>
          <button class="btn btn-secondary btn-sm" onclick="toast('Opens the projector view.')">Start</button></div>
        <div class="card" style="grid-column:1/-1"><b style="font-size:15px">Plan the next 4 weeks</b>
          <div class="grid-4" style="margin-top:16px">
            <div class="slot r-16x9" data-slot="IMG-P7-KIT-01"></div>
            <div class="slot r-16x9" data-slot="IMG-P7-KIT-02"></div>
            <div class="slot r-16x9" data-slot="PICK A FILM"></div>
            <div class="slot r-16x9" data-slot="PICK A FILM"></div>
          </div></div>
      </div>
      <p class="fine" style="margin-top:20px">Leaders get the kit free. Ask us about training.</p>
    </div>
  </div>
</div></section>
''')

# ================================================== groups.html (P7 marketing + admin)
PAGES['groups.html'] = dict(title='For Groups', desc='Circles for churches, teams, and programs. Bring your men.', active='For Groups', mode='public', body='''
<header class="hero"><div class="container split">
  <div class="slot r-4x3" data-slot="IMG-P7-MKT-01"></div>
  <div>
    <div class="eyebrow" style="margin-bottom:16px">FOR GROUPS</div>
    <h1 class="d-48">Bring your men. We bring the plan.</h1>
    <p class="lead" style="margin:20px 0 30px">Films, discussion guides, baselines, and a weekly standard. Built for churches, teams, and programs.</p>
    <a class="btn btn-primary" href="#contact">Talk to us</a>
  </div>
</div></header>

<section class="band tight"><div class="container">
  <div class="grid-2" style="max-width:880px;margin:0 auto">
    <div class="card" style="padding:32px"><div class="eyebrow" style="margin-bottom:12px">CIRCLE</div>
      <div class="bigscore" style="font-size:44px">$2,000<span class="ash" style="font-size:16px;font-family:var(--font-ui)"> / year</span></div>
      <p class="small" style="margin:8px 0 20px">Up to 25 seats</p>
      <div class="stack-8">
        <div class="check"><span class="checkmark">✓</span><span class="small">Every class and film</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Leader kits and guides</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Admin analytics</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Sponsored-seat option</span></div>
      </div></div>
    <div class="card" style="padding:32px"><div class="eyebrow" style="margin-bottom:12px">ORGANIZATION</div>
      <div class="bigscore" style="font-size:44px">Custom</div>
      <p class="small" style="margin:8px 0 20px">Custom seats, multi-Circle</p>
      <div class="stack-8">
        <div class="check"><span class="checkmark">✓</span><span class="small">Everything in Circle</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Rosters and CSV invites</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Track assignment</span></div>
        <div class="check"><span class="checkmark">✓</span><span class="small">Completion reporting</span></div>
      </div></div>
  </div>
  <p class="fine center" style="margin-top:18px">Pricing shown for design. Final pricing pends partner interviews.</p>
</div></section>

<section><div class="container">
  <div class="row between wrap" style="margin-bottom:24px">
    <h2 class="d-28">What an admin sees</h2>
    <span class="notice" style="padding:10px 16px">Admins see participation, never a man's answers or scores.</span>
  </div>
  <div class="grid-4" style="margin-bottom:28px">
    <div class="card stat"><div class="num">41<span class="ash" style="font-size:18px">/50</span></div><div class="lbl">Seats active</div></div>
    <div class="card stat"><div class="num">33</div><div class="lbl">Men on a plan</div></div>
    <div class="card stat"><div class="num">12</div><div class="lbl">Completions this quarter</div></div>
    <div class="card stat"><div class="num">4</div><div class="lbl">Circles running</div></div>
  </div>
  <div class="card pad-0">
    <div class="row between" style="padding:18px 20px;border-bottom:1px solid var(--hairline)">
      <div class="row" style="flex:1;max-width:480px"><input class="input" readonly value="fathers.com/join/living-hope-4F7K"><button class="btn btn-secondary btn-sm" onclick="toast('Invite link copied.')">Copy</button></div>
      <button class="btn btn-secondary btn-sm" onclick="toast('CSV upload wires to Supabase.')">Upload CSV</button>
    </div>
    <table><thead><tr><th>Name</th><th>Email</th><th>Baseline</th><th>Last active</th><th>Circle</th></tr></thead><tbody>
      <tr><td>Marcus T.</td><td class="fine">m.t@…</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">✓</span></td><td class="fine">Today</td><td class="fine">Tuesday 0600</td></tr>
      <tr><td>Dave R.</td><td class="fine">d.r@…</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">✓</span></td><td class="fine">2h</td><td class="fine">Tuesday 0600</td></tr>
      <tr><td>Luis A.</td><td class="fine">l.a@…</td><td class="fine">—</td><td class="fine">Invited</td><td class="fine">Thursday 1900</td></tr>
    </tbody></table>
  </div>
</div></section>

<section class="band" id="contact"><div class="container split" style="align-items:start">
  <div><h2 class="d-36">Start your Circles.</h2>
    <p style="color:var(--ash);margin-top:16px;max-width:44ch">Tell us about your men. We reply within three business days.</p>
    <div class="row wrap" style="margin-top:26px;gap:12px"><span class="pill pill-sponsored">Churches</span><span class="pill pill-sponsored">Synagogues</span><span class="pill pill-sponsored">Reentry programs</span><span class="pill pill-sponsored">Teams</span></div></div>
  <form class="card" style="padding:32px" data-lead="groups" data-done="Sent. We reply within three business days.">
    <div class="grid-2" style="gap:16px"><div class="field"><label>Name</label><input class="input" name="name" required></div>
      <div class="field"><label>Organization</label><input class="input" name="organization" required></div></div>
    <div class="grid-2" style="gap:16px"><div class="field"><label>Role</label><input class="input" name="role"></div>
      <div class="field"><label>Seats needed</label><input class="input" name="seats" placeholder="25"></div></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
    <div class="field"><label>Message</label><textarea name="message"></textarea></div>
    <button class="btn btn-primary">Send</button>
  </form>
</div></section>
''')

# ================================================== checkout.html (P8 screens 1-2)
PAGES['checkout.html'] = dict(title='Start your membership', desc='One membership. $120 a year. 30-day money-back guarantee.', active='', mode='public', body='''
<section class="tight" style="padding-top:56px"><div class="container" data-seq style="max-width:1080px">
  <div class="seqpanel">
    <div style="display:grid;grid-template-columns:1.2fr .9fr;gap:48px;align-items:start">
      <div>
        <h1 class="d-36" style="margin-bottom:28px">Start your membership.</h1>
        <div class="stack-16" style="margin-bottom:24px">
          <button class="btn btn-secondary" style="width:100%" onclick="toast('Apple Pay wires at deploy. Card fields work below.')">Apple Pay</button>
          <button class="btn btn-secondary" style="width:100%" onclick="toast('Google Pay wires at deploy. Card fields work below.')">Google Pay</button>
        </div>
        <div class="row" style="margin-bottom:24px"><hr class="hr" style="flex:1"><span class="fine">or pay with card</span><hr class="hr" style="flex:1"></div>
        <div class="field"><label>Card number</label><input class="input" inputmode="numeric" placeholder="4242 4242 4242 4242"></div>
        <div class="grid-2" style="gap:16px">
          <div class="field"><label>Expiry</label><input class="input" placeholder="MM / YY"></div>
          <div class="field"><label>CVC</label><input class="input" inputmode="numeric" placeholder="123"></div>
        </div>
        <div class="grid-2" style="gap:16px">
          <div class="field"><label>Name on card</label><input class="input" placeholder="Marcus T."></div>
          <div class="field"><label>ZIP</label><input class="input" inputmode="numeric" placeholder="72712"></div>
        </div>
        <button class="btn btn-primary" id="paybtn" style="width:100%;margin-top:10px" data-next>Start my membership</button>
        <p class="fine" style="margin-top:14px">Payment processing wires to Stripe at deploy. No card is charged in this prototype.</p>
      </div>
      <aside class="card" style="padding:28px">
        <div class="row between" style="margin-bottom:4px"><b>Fathers.com Annual</b><b class="mono">$120.00</b></div>
        <p class="small" style="margin-bottom:14px">$10 a month, billed once a year</p>
        <div class="row between" style="margin-bottom:18px;padding:10px 12px;border:1px solid var(--hairline);border-radius:6px">
          <span class="small"><s class="ash">$120</s> <b class="bone">$79 founding member</b></span><span class="pill pill-new">Beta pricing</span></div>
        <div class="row" style="gap:10px;margin-bottom:18px"><span class="checkmark">✓</span><span class="small">30-day money-back guarantee, no questions</span></div>
        <hr class="hr" style="margin-bottom:18px">
        <div class="stack-8">
          <div class="check"><span class="checkmark">✓</span><span class="small">Every class and workbook</span></div>
          <div class="check"><span class="checkmark">✓</span><span class="small">Your baseline and ninety-day plan</span></div>
          <div class="check"><span class="checkmark">✓</span><span class="small">The Daily</span></div>
          <div class="check"><span class="checkmark">✓</span><span class="small">Audio and downloads</span></div>
        </div>
        <p class="fine" style="margin-top:18px">By continuing you agree to the <a class="link ash" href="#" style="font-size:12px">terms</a>. Pricing shown for design pending pricing interviews.</p>
      </aside>
    </div>
  </div>
  <div class="seqpanel">
    <div class="center" style="max-width:640px;margin:40px auto">
      <span class="checkmark" style="width:56px;height:56px;font-size:26px;margin:0 auto 22px;display:inline-flex">✓</span>
      <h1 class="d-36" style="margin-bottom:10px">You're in.</h1>
      <p class="small" style="margin-bottom:36px">Receipt sent to m•••@•••.com.</p>
      <div class="grid-2" style="gap:20px;text-align:left">
        <a class="card hoverable" href="plan.html" style="text-decoration:none;color:inherit"><div class="eyebrow" style="margin-bottom:10px">NEXT</div><b>Pick up your plan. Week 1 is ready.</b></a>
        <a class="card hoverable" href="class.html" style="text-decoration:none;color:inherit"><div class="slot r-16x9" data-slot="IMG-P8-CNF-01" style="margin-bottom:12px"></div><b>Start the flagship class</b></a>
      </div>
    </div>
  </div>
</div></section>
''')

# ================================================== gift.html (P8 screens 3-4)
PAGES['gift.html'] = dict(title='Give a father his plan', desc='One year. Every class. His baseline and his plan.', active='', mode='public', body='''
<div class="billboard">
  <div class="slot r-21x9 flush" data-slot="IMG-P8-GFT-01" style="max-height:48vh"></div>
  <div class="overlay container" style="left:50%;transform:translateX(-50%);max-width:var(--max)">
    <h1 class="d-48">Give a father his plan.</h1>
    <p class="small" style="margin-top:10px;max-width:52ch">One year. Every class. His baseline and his plan. He will know it came from you.</p>
  </div>
</div>
<section class="tight"><div class="container split" style="align-items:start">
  <div class="card" style="padding:32px">
    <div class="row between" style="margin-bottom:22px"><b>1 year of Fathers.com</b><b class="mono">$120</b></div>
    <div class="grid-2" style="gap:16px">
      <div class="field"><label>To</label><input class="input" id="g-to" placeholder="Dad"></div>
      <div class="field"><label>From</label><input class="input" id="g-from" placeholder="Marcus"></div>
    </div>
    <div class="field"><label>Message</label><textarea id="g-msg" maxlength="200" placeholder="You showed me. Now train it."></textarea>
      <p class="fine" style="margin-top:6px"><span id="g-count">200 left</span></p></div>
    <div class="field"><label>Delivery</label>
      <div class="chiprow"><button class="chip selected" data-deliver="now">Send now</button><button class="chip" data-deliver="date">Pick a date</button></div>
      <input class="input" id="g-date" type="date" value="2027-06-20" style="display:none;margin-top:12px;max-width:220px">
    </div>
    <div class="field"><label>Method</label>
      <div class="chiprow"><button class="chip selected" data-toggle="single">Email</button><button class="chip" data-toggle="single">Printable card</button></div></div>
    <button class="btn btn-primary" style="width:100%" onclick="toast('Gift order wires to Stripe and Resend at deploy.')">Give the gift</button>
  </div>
  <div>
    <div class="eyebrow" style="margin-bottom:14px">HE SEES THIS</div>
    <div class="doc" style="padding:40px;max-width:520px;margin:0">
      <img src="assets/img/logomark-dark.png" alt="Fathers.com" style="height:36px;margin-bottom:24px">
      <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.2em;color:#6b6257;text-transform:uppercase;margin-bottom:14px">A year of Fathers.com</p>
      <h2 style="font-size:26px;color:#141210;margin-bottom:16px">For <span id="pv-to">Dad</span>, from <span id="pv-from">Marcus</span></h2>
      <p id="pv-msg" style="font-family:var(--font-display);font-size:19px;color:#3a352e;line-height:1.45;margin-bottom:24px">You showed me. Now train it.</p>
      <span style="display:inline-block;background:#E86A3C;color:#0A0A0A;padding:13px 24px;border-radius:6px;font-weight:600;font-size:14px">Claim it and take your baseline</span>
      <p style="font-size:11px;color:#6b6257;margin-top:18px">No card required to redeem.</p>
    </div>
  </div>
</div></section>
<section class="band tight"><div class="container center" style="max-width:620px">
  <div class="eyebrow" style="margin-bottom:16px">REDEMPTION PREVIEW</div>
  <h2 class="d-28" style="margin-bottom:12px">Marcus sent you a year of Fathers.com.</h2>
  <p class="quote" style="font-size:20px;margin-bottom:26px">"You showed me. Now train it."</p>
  <a class="btn btn-primary" href="profile.html">Claim it and take your baseline</a>
  <p class="fine" style="margin-top:14px">No card required to redeem.</p>
</div></section>
<script>
(function(){
  var t=document.getElementById('g-to'),f=document.getElementById('g-from'),m=document.getElementById('g-msg'),c=document.getElementById('g-count');
  function u(){document.getElementById('pv-to').textContent=t.value||'Dad';document.getElementById('pv-from').textContent=f.value||'Marcus';document.getElementById('pv-msg').textContent=m.value||'You showed me. Now train it.';c.textContent=(200-m.value.length)+' left';}
  [t,f,m].forEach(function(x){x.addEventListener('input',u)});u();
  document.querySelectorAll('[data-deliver]').forEach(function(b){b.addEventListener('click',function(){
    document.querySelectorAll('[data-deliver]').forEach(function(x){x.classList.remove('selected')});b.classList.add('selected');
    document.getElementById('g-date').style.display=b.dataset.deliver==='date'?'':'none';});});
})();
</script>
''')

# ================================================== sponsor.html (P8 screen 5)
PAGES['sponsor.html'] = dict(title='Sponsor a father', desc='$120 gives one year to a father inside, or a veteran father coming home.', active='', mode='public', body='''
<header class="hero"><div class="container split">
  <div class="slot r-4x3" data-slot="IMG-P8-SPN-01"></div>
  <div>
    <h1 class="d-48">Sponsor a father.</h1>
    <p class="lead" style="margin:20px 0 8px">$120 gives one year to a father inside, or a veteran father coming home.</p>
    <p class="small" style="margin-bottom:28px">Your gift is tax-deductible. Fathers.com is a program of the National Center for Fathering, a 501(c)(3).</p>
    <div class="chiprow" style="margin-bottom:16px">
      <button class="chip selected" data-toggle="single">1 father · $120</button>
      <button class="chip" data-toggle="single">3 fathers · $360</button>
      <button class="chip" data-toggle="single">10 fathers · $1,200</button>
      <button class="chip" data-toggle="single">Custom</button>
    </div>
    <label style="display:flex;gap:12px;align-items:center;color:var(--bone);font-size:14px;margin-bottom:18px"><input type="checkbox" class="toggle"> Make it monthly</label>
    <p class="fine" style="max-width:52ch;margin-bottom:26px">Sponsored seats are assigned through partner facilities and programs. You will get one update when your seat is claimed. No personal details, ever.</p>
    <button class="btn btn-primary" onclick="toast('Donation processing wires to Stripe at deploy.')">Sponsor</button>
  </div>
</div></header>
''')

# ================================================== account.html (P9)
PAGES['account.html'] = dict(title='Account', desc='Settings, membership, notifications.', active='', mode='app', auth=True, body='''
<section class="tight" style="padding-top:44px"><div class="container" style="max-width:880px">
  <h1 class="d-36" style="margin-bottom:30px">Account</h1>
  <div data-tabs>
    <div class="tabs"><button class="active">Profile</button><button>Membership</button><button>Notifications</button><button>Cancel path</button></div>

    <div class="tabpanel active">
      <div class="row" style="gap:20px;margin-bottom:28px"><div class="slot r-1x1" data-slot="IMG-P9-AVA-01" style="width:72px;border-radius:50%"></div><a class="link ash" href="#" style="font-size:13px">Change</a></div>
      <div class="grid-2" style="gap:16px">
        <div class="field"><label>Name</label><input class="input" value="Marcus T."></div>
        <div class="field"><label>Email</label><input class="input" value="m.t@example.com"></div>
      </div>
      <div class="field"><label>Password</label><div class="row"><input class="input" type="password" value="••••••••••" readonly><button class="btn btn-secondary btn-sm" onclick="toast('Password reset wires to Supabase Auth.')">Change</button></div></div>
      <div class="field"><label>Kids' age ranges</label>
        <div class="chiprow"><button class="chip selected" data-toggle>6-9</button><button class="chip selected" data-toggle>13-15</button><button class="chip" data-toggle>0-2</button><button class="chip" data-toggle>Teens</button></div>
        <p class="fine" style="margin-top:8px">Sets your plan. Never shown to anyone.</p></div>
      <div class="grid-2" style="gap:16px">
        <div class="field"><label>Faith lens</label><select class="input"><option>Not for me</option><option selected>Yes, Christian</option><option>Yes, Jewish</option></select></div>
        <div class="field"><label>Time zone</label><select class="input"><option selected>Central (CT)</option><option>Eastern (ET)</option><option>Mountain (MT)</option><option>Pacific (PT)</option></select></div>
      </div>
      <button class="btn btn-primary" onclick="toast('Saved.')">Save changes</button>
    </div>

    <div class="tabpanel">
      <div class="card" style="margin-bottom:20px"><div class="row between wrap">
        <div><b>Fathers.com Annual</b><p class="small" style="margin-top:6px">Renews March 4, 2027 · $120</p></div>
        <button class="btn btn-secondary btn-sm" onclick="toast('Card update wires to Stripe at deploy.')">Update payment</button></div>
        <hr class="hr" style="margin:18px 0">
        <div class="row between"><span class="small">Visa ending 4242</span><a class="link ash" href="#" style="font-size:13px">Update</a></div></div>
      <div class="card" style="margin-bottom:20px"><div class="eyebrow" style="margin-bottom:14px">RECEIPTS</div>
        <table><tbody>
          <tr><td class="mono fine">Mar 4, 2026</td><td>Annual membership</td><td class="mono">$120.00</td><td><a class="link ash" href="#" style="font-size:13px">PDF</a></td></tr>
          <tr><td class="mono fine">Jun 2, 2026</td><td>Fathering Fundamentals Certificate</td><td class="mono">$79.00</td><td><a class="link ash" href="#" style="font-size:13px">PDF</a></td></tr>
        </tbody></table></div>
      <div class="grid-2" style="gap:16px;margin-bottom:24px">
        <a class="card hoverable" href="gift.html" style="text-decoration:none"><b style="font-size:15px">Give a gift</b><p class="fine" style="margin-top:6px">One year, from you.</p></a>
        <a class="card hoverable" href="sponsor.html" style="text-decoration:none"><b style="font-size:15px">Sponsor a father</b><p class="fine" style="margin-top:6px">A seat for a man inside or coming home.</p></a>
      </div>
      <a class="link ash" href="#" style="font-size:14px" onclick="event.preventDefault();document.querySelectorAll('[data-tabs] .tabs button')[3].click()">Cancel membership</a>
      <p style="margin-top:26px"><a class="link ash" href="#" data-signout style="font-size:13px">Sign out</a></p>
    </div>

    <div class="tabpanel">
      <div class="stack-16" style="max-width:560px">
        <div class="row between"><span class="small">Weekly plan email, Monday 6:00 AM</span><input type="checkbox" class="toggle" checked onchange='if(!this.checked)toast("You will still get receipts and legal notices.")'></div>
        <div class="row between"><span class="small">Action reminders</span><input type="checkbox" class="toggle" checked></div>
        <div class="row between"><span class="small">New class drops</span><input type="checkbox" class="toggle" checked></div>
        <div class="row between"><span class="small">Circle activity</span><input type="checkbox" class="toggle" checked></div>
        <div class="row between"><span class="small">The Daily</span><input type="checkbox" class="toggle"></div>
      </div>
      <p class="fine" style="margin-top:22px">We send less than you expect. That's on purpose.</p>
    </div>

    <div class="tabpanel"><div data-seq style="max-width:560px">
      <div class="seqpanel">
        <h3 class="display d-28" style="margin-bottom:18px">Before you go: pause instead?</h3>
        <div class="card" style="margin-bottom:18px"><b>Pause 3 months</b><p class="small" style="margin:6px 0 16px">Keep your plan and progress. $0.</p>
          <button class="btn btn-primary btn-sm" onclick="toast('Paused. You resume October 5. Everything stays saved.')">Pause instead</button></div>
        <a class="link ash" href="#" style="font-size:14px" data-next onclick="event.preventDefault()">Continue to cancel</a>
      </div>
      <div class="seqpanel">
        <h3 class="display d-28" style="margin-bottom:18px">What's the reason?</h3>
        <div class="chiprow" style="margin-bottom:18px">
          <button class="chip" data-toggle="single">Too expensive</button><button class="chip" data-toggle="single">Not using it</button><button class="chip" data-toggle="single">Finished what I came for</button><button class="chip" data-toggle="single">Something else</button></div>
        <div class="field"><textarea placeholder="Optional"></textarea></div>
        <button class="btn btn-secondary" data-next>Continue</button>
      </div>
      <div class="seqpanel">
        <h3 class="display d-28" style="margin-bottom:12px">You're set through March 4, 2027.</h3>
        <p class="small" style="margin-bottom:22px">Your baseline, plan, and notes stay saved. Come back any time.</p>
        <button class="btn btn-secondary" onclick="toast('Done.')">Done</button>
      </div>
    </div></div>
  </div>
</div></section>
''')

# ================================================== certificates.html (P10 screens 1-3)
PAGES['certificates.html'] = dict(title='Verified Certificates', desc='Proof you did the work. Verified hours, identity checked, court-checkable serial.', active='Certificates', mode='public', body='''
<header class="hero band-brass" style="padding:88px 0 72px"><div class="container" style="max-width:880px">
  <div class="eyebrow brass" style="margin-bottom:16px">FATHERS.COM VERIFIED CERTIFICATES</div>
  <h1 class="d-48">Proof you did the work.</h1>
  <p class="lead" style="margin:18px 0 34px">Verified hours. Identity checked. A serial anyone can confirm online in ten seconds.</p>
  <div class="steps3">
    <div class="s"><div class="n">01</div><p class="small" style="margin-top:8px">Enroll and verify your ID</p></div>
    <div class="s"><div class="n">02</div><p class="small" style="margin-top:8px">Do the hours, pass the checkpoints</p></div>
    <div class="s"><div class="n">03</div><p class="small" style="margin-top:8px">Get a certificate courts can check</p></div>
  </div>
</div></header>

<section class="tight"><div class="container">
  <div class="grid-4">
    <div class="card brass-card hoverable"><div class="slot r-1x1" data-slot="IMG-P10-CAT-01" style="width:64px;margin-bottom:16px"></div>
      <span class="pill pill-court" style="margin-bottom:12px">Court-ready</span>
      <h3 style="margin:10px 0 8px;font-size:17px">Fathering Fundamentals Certificate</h3>
      <p class="mono small">10.0 hours · $79</p>
      <a class="link brass" href="#course" style="font-size:13px;margin-top:14px;display:inline-block">View requirements</a></div>
    <div class="card brass-card hoverable"><div class="slot r-1x1" data-slot="IMG-P10-CAT-02" style="width:64px;margin-bottom:16px"></div>
      <span class="pill pill-court" style="margin-bottom:12px">Court-ready</span>
      <h3 style="margin:10px 0 8px;font-size:17px">Co-Parenting After Divorce Certificate</h3>
      <p class="mono small">8.0 hours · $79</p>
      <a class="link brass" href="#course" style="font-size:13px;margin-top:14px;display:inline-block">View requirements</a></div>
    <div class="card brass-card hoverable"><div class="slot r-1x1" data-slot="IMG-P10-CAT-03" style="width:64px;margin-bottom:16px"></div>
      <span class="pill pill-court" style="margin-bottom:12px">Court-ready</span>
      <h3 style="margin:10px 0 8px;font-size:17px">Reentry Fatherhood Certificate</h3>
      <p class="mono small">12.0 hours · $79</p>
      <a class="link brass" href="#course" style="font-size:13px;margin-top:14px;display:inline-block">View requirements</a></div>
    <div class="card brass-card hoverable"><div class="slot r-1x1" data-slot="IMG-P10-CAT-04" style="width:64px;margin-bottom:16px"></div>
      <span class="pill pill-court" style="margin-bottom:12px">Court-ready</span>
      <h3 style="margin:10px 0 8px;font-size:17px">Anger and Repair Certificate</h3>
      <p class="mono small">8.0 hours · $79</p>
      <a class="link brass" href="#course" style="font-size:13px;margin-top:14px;display:inline-block">View requirements</a></div>
  </div>
  <p class="fine" style="margin-top:16px">Pricing shown for design. Final pricing pends jurisdiction interviews.</p>
</div></section>

<section class="band tight"><div class="container row between wrap">
  <div><b>Issuing for a program?</b><p class="small" style="margin-top:6px">Bulk seats, rosters, and completion reports.</p></div>
  <a class="btn btn-secondary" href="groups.html#contact">Talk to us</a>
</div></section>

<section id="course"><div class="container" style="display:grid;grid-template-columns:1.4fr .8fr;gap:56px;align-items:start">
  <div>
    <div class="eyebrow brass" style="margin-bottom:12px">CERTIFICATE COURSE</div>
    <h2 class="d-36" style="margin-bottom:10px">Fathering Fundamentals Certificate</h2>
    <p class="mono small" style="margin-bottom:22px">10.0 verified hours</p>
    <p class="small" style="max-width:60ch;margin-bottom:32px">The flagship curriculum hardened into proof. Same lessons, plus identity verification, logged time, checkpoints, and a final assessment. Built for fathers who need a document, not a participation ribbon.</p>
    <div class="card brass-card" style="margin-bottom:36px"><div class="eyebrow brass" style="margin-bottom:16px">REQUIREMENTS</div>
      <div class="stack-8">
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Government ID verified at enrollment</span></div>
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Per-lesson attention checkpoints</span></div>
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Time-on-task logged, no skip credit</span></div>
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Final assessment, 80 percent to pass</span></div>
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Curriculum basis: the Keystone framework, National Center for Fathering</span></div>
        <div class="check"><span class="checkmark" style="background:var(--brass)">✓</span><span class="small">Unique serial with public verification page</span></div>
      </div></div>
    <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:14px">How verification works while you watch</h3>
    <div class="grid-3" style="gap:16px">
      <div class="card"><p class="fine" style="margin-bottom:12px">ID STEP</p>
        <div style="border:2px dashed var(--hairline-strong);border-radius:8px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center"><span class="fine">Hold your ID inside the frame</span></div>
        <p class="fine" style="margin-top:10px">Used to verify you. Deleted after issuance per our retention policy. <a class="link ash" href="#" style="font-size:11px">Retake</a></p></div>
      <div class="card"><p class="fine" style="margin-bottom:12px">MID-LESSON CHECKPOINT</p>
        <p class="small" style="margin-bottom:12px">What did Ken call the second pillar?</p>
        <div class="stack-8">
          <button class="chip" style="width:100%" onclick="toast('Correct. Rolling.')">Consistency</button>
          <button class="chip" style="width:100%" onclick="toast('Not quite. Rewatch the last two minutes.')">Discipline</button>
          <button class="chip" style="width:100%" onclick="toast('Not quite. Rewatch the last two minutes.')">Provision</button>
        </div></div>
      <div class="card"><p class="fine" style="margin-bottom:12px">HOURS LOGGED</p>
        <p class="mono" style="font-size:22px;margin-bottom:14px">6.5 / 10.0</p>
        <div class="progress-track"><div class="progress-fill brass" style="width:65%"></div></div>
        <p class="fine" style="margin-top:12px">Time counts only while the lesson plays and you pass the checkpoints.</p></div>
    </div>
  </div>
  <aside class="card brass-card" style="position:sticky;top:110px;padding:28px">
    <div class="row between" style="margin-bottom:6px"><b>One certificate</b><b class="mono">$79</b></div>
    <p class="small" style="margin-bottom:20px">90-day access</p>
    <button class="btn btn-brass" style="width:100%" onclick="this.textContent='Starting…';var b=this;setTimeout(function(){b.textContent='Enroll and verify ID';toast('Enrollment wires to Stripe and ID verification at deploy.')},900)">Enroll and verify ID</button>
    <p class="fine" style="margin-top:16px">Confirm acceptance with your court or program before enrolling. We provide verification, not legal guarantees.</p>
    <hr class="hr" style="margin:18px 0">
    <a class="link brass" href="certificate.html" style="font-size:14px">See a sample certificate</a>
  </aside>
</div></section>
''')

# ================================================== certificate.html (P10 screen 4)
PAGES['certificate.html'] = dict(title='Certificate FC-2026-004317', desc='Fathers.com Verified Certificate.', active='Certificates', mode='app', body='''
<section class="tight" style="padding-top:44px"><div class="container">
  <div class="row wrap" style="margin-bottom:28px;justify-content:center">
    <button class="btn btn-primary btn-sm" onclick="toast('PDF issuance runs server side. See supabase/schema.sql.')">Download PDF</button>
    <button class="btn btn-secondary btn-sm" onclick="toast('Opens a to-field modal. Sends via the send-email function.')">Email to my officer or program</button>
    <button class="btn btn-secondary btn-sm" onclick="window.print()">Print</button>
  </div>
  <div class="doc">
    <div class="brassline"></div>
    <div class="row" style="justify-content:center;margin-bottom:26px"><img src="assets/img/logomark-dark.png" alt="Fathers.com" style="height:44px"></div>
    <div class="head">Fathers.com Verified Certificate</div>
    <div class="name">Marcus T.</div>
    <div class="course">has completed the Fathering Fundamentals Certificate</div>
    <div class="hours">10.0 verified instructional hours · Completed June 2, 2026</div>
    <div class="rule"></div>
    <div class="sealrow">
      <div>
        <div class="serial">SERIAL FC-2026-004317</div>
        <div class="serial" style="margin-top:6px">Identity verified at enrollment</div>
        <div class="serial" style="margin-top:6px">Issued by the National Center for Fathering</div>
        <div class="serial" style="margin-top:14px"><b>Verify at fathers.com/verify</b></div>
      </div>
      <div class="row" style="gap:18px;align-items:flex-end">
        <div class="qr">QR</div>
        <div class="slot r-1x1" data-slot="IMG-P10-CRT-01" style="width:84px;background:#EAE4D8;border-color:#B98A2F"></div>
      </div>
    </div>
  </div>
</div></section>
''')

# ================================================== verify.html (P10 screen 5, public, no chrome)
PAGES['verify.html'] = dict(title='Verify a certificate', desc='Enter a serial. Confirm a Fathers.com Verified Certificate.', active='', mode='public', nochrome=True, body='''
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:64px 20px">
  <a class="brand" href="index.html" style="margin-bottom:56px"><img class="lg-dark" src="assets/img/logomark-light.png" alt="Fathers.com logomark" style="height:34px"><img class="lg-light" src="assets/img/logomark-dark.png" alt="Fathers.com logomark" style="height:34px"><b style="font-family:var(--font-display);font-size:20px">Fathers.com</b></a>
  <div style="width:100%;max-width:520px">
    <h1 class="d-36" style="margin-bottom:8px">Verify a certificate</h1>
    <p class="small" style="margin-bottom:28px">Enter the serial printed on the document. Ten seconds, no login.</p>
    <form id="verifyForm" class="row" style="margin-bottom:28px">
      <input class="input mono" placeholder="FC-2026-004317" aria-label="Certificate serial">
      <button class="btn btn-primary">Verify</button>
    </form>
    <div id="v-ok" class="card" style="display:none;border-color:var(--pine-hi)">
      <div class="row" style="margin-bottom:18px"><span class="checkmark">✓</span><b style="letter-spacing:.14em">VALID</b></div>
      <div class="stack-8">
        <div class="row between"><span class="fine">Recipient</span><b class="small" data-f="name"></b></div>
        <div class="row between"><span class="fine">Course</span><b class="small" data-f="course"></b></div>
        <div class="row between"><span class="fine">Hours</span><b class="small mono" data-f="hours"></b></div>
        <div class="row between"><span class="fine">Date</span><b class="small" data-f="date"></b></div>
        <div class="row between"><span class="fine">Serial</span><b class="small mono" data-f="serial"></b></div>
        <div class="row between"><span class="fine">Identity</span><b class="small">Verified at enrollment</b></div>
        <div class="row between"><span class="fine">Issuer</span><b class="small">National Center for Fathering</b></div>
      </div>
      <hr class="hr" style="margin:18px 0"><a class="link ash" href="#" style="font-size:13px">Report a concern</a>
    </div>
    <div id="v-no" class="card" style="display:none;border-color:var(--error)">
      <b>NOT FOUND.</b><p class="small" style="margin-top:8px">Check the serial and try again.</p>
    </div>
    <p class="fine" style="margin-top:32px">Demo serials: FC-2026-004317 and FC-2026-001882. Production lookups read the certificates table. See supabase/schema.sql.</p>
  </div>
</div>
''')

# ================================================== veterans.html (P11)
PAGES['veterans.html'] = dict(title='Present at Home', desc='Eight weeks for fathers back from combat. Costs you nothing.', active='For Veterans', mode='public', body='''
<div class="billboard">
  <div class="slot r-21x9 flush" data-slot="IMG-P11-HER-01" style="max-height:66vh"></div>
  <div class="overlay container" style="left:50%;transform:translateX(-50%);max-width:var(--max)">
    <div class="eyebrow" style="margin-bottom:12px">FOR FATHERS BACK FROM COMBAT</div>
    <h1 class="d-56">Present at home.</h1>
    <p class="small" style="margin:14px 0 22px;max-width:56ch">Eight weeks. Films from men who made the same walk. A baseline, a plan, a cohort. Costs you nothing. Sponsored by people who owe you.</p>
    <div class="row wrap"><a class="btn btn-primary play" href="story.html">Start with Ray's story</a><a class="btn btn-secondary" href="#how">How it works</a></div>
  </div>
</div>

<section class="tight" id="how"><div class="container">
  <div class="steps3" style="margin-bottom:40px">
    <div class="s"><div class="n">01</div><p class="small" style="margin-top:8px">Watch a story · 24 min</p></div>
    <div class="s"><div class="n">02</div><p class="small" style="margin-top:8px">Take your baseline · 12 min</p></div>
    <div class="s"><div class="n">03</div><p class="small" style="margin-top:8px">Join an 8-week cohort</p></div>
  </div>
  <div class="row wrap" style="gap:18px;padding:18px 22px;border:1px solid var(--hairline);border-radius:8px">
    <span class="pill pill-clinical">Clinically overseen</span>
    <span class="small">Built and reviewed under clinical oversight with our VA partnership.</span>
    <div class="slot" data-slot="IMG-P11-TRS-01" style="width:120px;height:36px;margin-left:auto"></div>
  </div>
</div></section>

<section class="tight" style="padding-top:0"><div class="container">
  <h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:18px">Men who made the walk</h2>
  <div class="grid-3" data-repeat="3" data-prefix="IMG-P11-STR-" data-ratio="r-16x9" data-href="story.html"
    data-titles="From Combat to the Kitchen Table|The Longest Deployment|Reveille at Home" data-metas="24 min|18 min|17 min"></div>
  <p class="small" style="margin-top:22px">No diagnosis. No records shared. Your answers are yours.</p>
</div></section>

<section class="band tight"><div class="container split" style="align-items:start">
  <div><h2 class="d-36">Count me in.</h2>
    <p class="small" style="margin-top:14px;max-width:44ch">Three fields. That's the whole door.</p></div>
  <form class="card" style="padding:32px" data-lead="veterans" data-done="You are in Cohort 15. Starts Monday.">
    <div class="field"><label>First name</label><input class="input" name="first_name" required></div>
    <div class="field"><label>Email or phone</label><input class="input" name="contact" required></div>
    <div class="field"><label>Nearest base or town <span class="fine">(optional)</span></label><input class="input" name="base"></div>
    <button class="btn btn-primary" style="width:100%">Count me in</button>
  </form>
</div></section>

<section><div class="container">
  <div class="eyebrow" style="margin-bottom:16px">ENROLLED VIEW</div>
  <h2 class="d-28" style="margin-bottom:26px">Cohort 14. Week 3 of 8. Twelve men.</h2>
  <div class="split" style="align-items:start">
    <div class="card" style="padding:28px">
      <div class="eyebrow" style="margin-bottom:14px">THIS WEEK</div>
      <div class="row" style="gap:18px;align-items:flex-start;margin-bottom:18px">
        <div class="slot r-16x9 play-overlay" data-slot="IMG-P11-CH-01" style="flex:0 0 180px"><span class="tri"></span></div>
        <b style="font-size:15px">Watch: The Turn · 18 min</b></div>
      <div class="actionrow" style="margin-bottom:14px"><span class="checkmark">→</span><div class="txt">Tell your kid one true story from before they were born.</div></div>
      <div class="row between" style="padding:14px 16px;border:1px solid var(--hairline);border-radius:8px">
        <span class="small">Thursday call · 2000 CT · Cameras optional. First names only.</span>
        <div class="row"><a class="link" href="#" style="font-size:13px" onclick="event.preventDefault();toast('Call link arrives by text Thursday at 1900.')">Join link</a><input type="checkbox" class="toggle" checked title="Remind me"></div></div>
      <div style="margin-top:26px"><div class="weeks" style="grid-template-columns:repeat(8,1fr)">
        <span class="done"></span><span class="done"></span><span class="now"></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="phaselabels"><span>WEEK 1</span><span>WEEK 8</span></div></div>
    </div>
    <div class="stack-24">
      <div class="card"><div class="row" style="gap:16px"><div class="slot r-1x1" data-slot="IMG-P11-CH-02" style="flex:0 0 64px;border-radius:50%"></div>
        <div><b style="font-size:15px">Your mentor: Dave</b><p class="fine" style="margin-top:4px">Army, father of four</p></div></div>
        <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="toast('Messaging wires to Supabase.')">Message Dave</button></div>
      <div class="card"><div class="eyebrow" style="margin-bottom:16px">WEEK 8 FINISH</div>
        <div class="row" style="gap:32px;align-items:baseline;margin-bottom:18px">
          <div><div class="bigscore ash" style="font-size:44px">43</div><p class="fine">Day 0</p></div>
          <div><div class="bigscore" style="font-size:44px">71</div><p class="fine">Day 56</p></div>
        </div>
        <div class="badge-earned" style="margin-bottom:18px"><span class="seal">8W</span><span class="t">Eight Week Standard</span></div>
        <div class="stack-8">
          <a class="link" href="#" style="font-size:14px">Keep your membership, sponsored for the year</a>
          <a class="link" href="#" style="font-size:14px">Lead the next cohort</a>
          <a class="link" href="story.html" style="font-size:14px">Tell your story</a>
        </div></div>
    </div>
  </div>
  <p class="fine" style="margin-top:36px">Need more than this program? Talk to someone today. Veterans Crisis Line: dial 988, then press 1.</p>
</div></section>
''')

# ================================================== employers.html (P12)
PAGES['employers.html'] = dict(title='For Employers', desc='Your parental benefits were built around mothers. Cover the fathers too.', active='', mode='public', body='''
<header class="hero"><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:16px">FOR EMPLOYERS</div>
    <h1 class="d-48">Paternity leave is two weeks. Fatherhood is forever.</h1>
    <p class="lead" style="margin:20px 0 30px">Your parental benefits were built around mothers. Give the fathers on your team a baseline, a plan, and training that fits the leave you already offer.</p>
    <a class="btn btn-primary" href="#partner">Become a design partner</a>
  </div>
  <div class="slot r-4x3" data-slot="IMG-P12-HER-01"></div>
</div></header>

<section class="band tight"><div class="container grid-3">
  <div class="card"><p style="font-size:17px;margin-bottom:12px">Most U.S. fathers take 10 or fewer days of leave.</p><p class="mono fine">[DOL-CITED RESEARCH]</p></div>
  <div class="card"><p style="font-size:17px;margin-bottom:12px">Paternal depression around a birth: roughly 1 in 10.</p><p class="mono fine">[JAMA META-ANALYSIS]</p></div>
  <div class="card"><p style="font-size:17px;margin-bottom:12px">Family benefits platforms are a proven employer category.</p><p class="mono fine">[MARKET COMPS ON REQUEST]</p></div>
</div></section>

<section class="tight"><div class="container">
  <h2 class="d-28" style="margin-bottom:24px">How it works</h2>
  <div class="steps3" style="margin-bottom:56px">
    <div class="s"><div class="n">01</div><p class="small" style="margin-top:8px">A father activates his seat before or during leave</p></div>
    <div class="s"><div class="n">02</div><p class="small" style="margin-top:8px">He takes the twelve-minute baseline and gets a leave-fitted plan</p></div>
    <div class="s"><div class="n">03</div><p class="small" style="margin-top:8px">You see activation and completion. Never his answers.</p></div>
  </div>
  <h2 class="d-28" style="margin-bottom:24px">What's in the seat</h2>
  <div class="grid-2" style="max-width:760px">
    <div class="stack-8">
      <div class="check"><span class="checkmark">✓</span><span class="small">Every class and workbook</span></div>
      <div class="check"><span class="checkmark">✓</span><span class="small">The new-father track</span></div>
      <div class="check"><span class="checkmark">✓</span><span class="small">The Daily</span></div>
    </div>
    <div class="stack-8">
      <div class="check"><span class="checkmark">✓</span><span class="small">Audio for the commute</span></div>
      <div class="check"><span class="checkmark">✓</span><span class="small">Spouse gift seat</span></div>
      <div class="check"><span class="checkmark">✓</span><span class="small"><b class="bone">Aggregate reporting only.</b></span></div>
    </div>
  </div>
</div></section>

<section class="band" id="partner"><div class="container split" style="align-items:start">
  <div><h2 class="d-36">We are selecting three employers to co-build this benefit.</h2>
    <p style="color:var(--ash);margin-top:16px;max-width:48ch">Partners get founding pricing, roadmap input, and a named case study, and they shape the reporting.</p></div>
  <form class="card" style="padding:32px" data-lead="employers" data-done="We read every application. Expect a reply within three business days.">
    <div class="grid-2" style="gap:16px"><div class="field"><label>Name</label><input class="input" name="name" required></div>
      <div class="field"><label>Company</label><input class="input" name="company" required></div></div>
    <div class="grid-2" style="gap:16px"><div class="field"><label>Role</label><input class="input" name="role"></div>
      <div class="field"><label>Employees on parental leave per year</label><select class="input" name="leave_volume"><option>Under 25</option><option>25-100</option><option>100-500</option><option>500 plus</option></select></div></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
    <div class="field"><label>Message</label><textarea name="message"></textarea></div>
    <button class="btn btn-primary">Apply to partner</button>
  </form>
</div></section>

<section class="tight"><div class="container" style="max-width:820px">
  <details><summary>How is this different from our EAP?</summary><div class="body">An EAP waits for a crisis call. This is training with a baseline, a plan, and completion you can see in aggregate. Fathers use it because it does not feel like an EAP.</div></details>
  <details><summary>What does HR see?</summary><div class="body">Activation and completion counts. Never a man's answers, scores, or notes. Aggregate reporting only.</div></details>
  <details><summary>How does it fit our leave policy?</summary><div class="body">The plan is fitted to the leave you already offer. Two weeks or twelve, the seat starts when he does and keeps running after he returns.</div></details>
  <details><summary>What does it cost?</summary><div class="body">Design partners set founding pricing with us. Per-seat, annual.</div></details>
</div></section>
''')


# ================================================== login.html (auth)
PAGES['login.html'] = dict(title='Log in', desc='Sign in to Fathers.com with an emailed link.', active='', mode='public', nochrome=True, body="""
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:64px 20px">
  <a class="brand" href="index.html" style="margin-bottom:56px"><img class="lg-dark" src="assets/img/logomark-light.png" alt="Fathers.com logomark" style="height:34px"><img class="lg-light" src="assets/img/logomark-dark.png" alt="Fathers.com logomark" style="height:34px"><b style="font-family:var(--font-display);font-size:20px">Fathers.com</b></a>
  <div style="width:100%;max-width:440px">
    <h1 class="d-36" style="margin-bottom:8px">Log in</h1>
    <p class="small" style="margin-bottom:28px">No password. We email you a sign-in link.</p>
    <form id="loginForm" class="stack-16">
      <input class="input" type="email" required placeholder="Email address" aria-label="Email address">
      <button class="btn btn-primary" style="width:100%">Email me a sign-in link</button>
    </form>
    <p class="fine" id="loginMsg" style="margin-top:18px">New here? <a class="link ash" href="profile.html" style="font-size:12px">Take the Keystone Profile first.</a></p>
    <p class="fine" style="margin-top:26px">Sign-in activates once Supabase keys are set in assets/js/config.js.</p>
  </div>
</div>
""")

# ================================================== WRITER
if __name__ == '__main__':
    out = os.path.dirname(os.path.abspath(__file__))
    for fname, p in PAGES.items():
        html = HEAD.format(title=p['title'], desc=p['desc'])
        if p.get('nochrome'):
            html += p['body']
            html += '\n<script src="assets/js/config.js"></script>\n<script src="assets/js/supabase-client.js"></script>\n<script src="assets/js/app.js"></script>\n'
            if fname == 'profile.html':
                html += '<script src="assets/js/instrument-runner.js"></script>\n<script src="assets/js/keystone.js"></script>\n'
        else:
            html += nav(p.get('active',''), p.get('mode','public'))
            html += p['body']
            html += FOOT
            if p.get('auth'):
                html = html.replace('<body>', '<body data-auth="required">', 1)
        html += '</body>\n</html>\n'
        with open(os.path.join(out, fname), 'w') as f:
            f.write(html)
        print('wrote', fname)
