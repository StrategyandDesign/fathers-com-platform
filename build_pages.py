#!/usr/bin/env python3
"""Page generator for the Fathers.com static platform. Shared chrome, per-page bodies."""
import os
import re

# Absolute base URL for share cards and canonical links.
# CHANGE THIS ONE LINE if the site moves to a custom domain (e.g. https://www.fathers.com).
SITE_URL = "https://fathers-com-platform.vercel.app"
OG_IMAGE = SITE_URL + "/assets/img/og-image.jpg"

# Private / transactional pages: keep them out of Google's index. Everything else is indexable.
NOINDEX = {'account.html', 'plan.html', 'circles.html', 'player.html', 'checkout.html', 'enroll.html', 'login.html', 'veterans-hub.html', 'veterans-start.html', 'veterans-checkin.html', 'voice.html'}


def _esc(s):
    """Escape for an HTML attribute without breaking entities that are already there (e.g. &middot;)."""
    s = re.sub(r'&(?!#?\w+;)', '&amp;', s)
    return s.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def social_meta(fname, title, desc):
    """Open Graph + Twitter card + canonical + app icon + robots, per page."""
    url = SITE_URL + "/" + fname
    ttl = _esc(title + " | Fathers.com")
    ds = _esc(desc)
    robots = '<meta name="robots" content="noindex,follow">\n' if fname in NOINDEX else ''
    return (
        robots
        + f'<link rel="canonical" href="{url}">\n'
        + '<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">\n'
        + '<meta name="theme-color" content="#000000">\n'
        + '<meta property="og:type" content="website">\n'
        + '<meta property="og:site_name" content="Fathers.com">\n'
        + f'<meta property="og:title" content="{ttl}">\n'
        + f'<meta property="og:description" content="{ds}">\n'
        + f'<meta property="og:url" content="{url}">\n'
        + f'<meta property="og:image" content="{OG_IMAGE}">\n'
        + '<meta property="og:image:width" content="1200">\n'
        + '<meta property="og:image:height" content="630">\n'
        + '<meta property="og:image:alt" content="Fathers.com, know where you stand as a father">\n'
        + '<meta name="twitter:card" content="summary_large_image">\n'
        + f'<meta name="twitter:title" content="{ttl}">\n'
        + f'<meta name="twitter:description" content="{ds}">\n'
        + f'<meta name="twitter:image" content="{OG_IMAGE}">'
    )

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
{meta}
</head>
<body>
'''

def nav(active='', mode='public'):
    if mode=='app':
        links = [('My Plan','plan.html'),('Classes','classes.html'),('Stories','stories.html'),('Circles','circles.html'),('Certificates','certificates.html')]
    else:
        links = [('The Profile','profile.html'),('Classes','classes.html'),('Certificates','certificates.html'),('Stories','stories.html'),('Find a Program','find-a-program.html'),('For Organizations','organizations.html')]
        # Legacy page actives map onto the new public nav so highlighting stays sane.
        active = {'For Groups':'For Organizations','For Veterans':'For Organizations','Stories':'Classes'}.get(active, active)
    lis = ''.join(f'<li><a href="{h}" {"class=\"active\"" if t==active else ""}>{t}</a></li>' for t,h in links)
    right = ('<a href="gift.html" class="hide-m">Gifts</a><a href="login.html" class="hide-m">Log in</a><a class="btn btn-yellow btn-sm" href="profile.html">Start your Profile</a>'
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
  <div><h4>Measure</h4><ul><li><a href="profile.html">The Keystone Profile</a></li><li><a href="research.html">The Research</a></li><li><a href="find-a-program.html">Find a Program</a></li></ul></div>
  <div><h4>Train &amp; Prove</h4><ul><li><a href="classes.html">Classes</a></li><li><a href="stories.html">Stories</a></li><li><a href="certificates.html">Certificates</a></li><li><a href="verify.html">Verify a certificate</a></li></ul></div>
  <div><h4>For Organizations</h4><ul><li><a href="organizations.html">The Standard</a></li><li><a href="groups.html">Groups &amp; Circles</a></li><li><a href="veterans.html">Veteran Programs</a></li><li><a href="employers.html">Employers</a></li><li><a href="sponsor.html">Sponsor a Father</a></li></ul></div>
  <div><h4>Company</h4><ul><li><a href="about.html">About NCF</a></li><li><a href="research.html">Research</a></li><li><a href="gatherings.html">Gatherings</a></li><li><a href="gift.html">Gifts</a></li><li><a href="mailto:Team@Fathers.com">Contact</a></li></ul></div>
  <div><h4>Legal</h4><ul><li><a href="terms.html">Terms</a></li><li><a href="privacy.html">Privacy</a></li><li><a href="security.html">Security</a></li><li><a href="verify.html">Verify a certificate</a></li></ul></div>
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
PAGES['index.html'] = dict(title='Know where you stand as a father', desc='Take the free Keystone Father Profile. Four scores, one honest read, and a ninety-day plan built for you. About twenty minutes.', active='', mode='public', body='''
<header class="hero"><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:18px">FATHERS.COM</div>
    <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">Know where you stand as a father.</h1>
    <p class="lead" style="margin:22px 0 28px">Start with the free Keystone Profile. Get your score on the four things that matter, and a ninety-day plan built for you. Then grow it with classes taught by fathers who lived it.</p>
    <div class="hero-intent">
      <div class="hero-intent-q">Where are you in the journey?</div>
      <div class="hero-intent-opts">
        <button class="hero-intent-opt" data-path="father">
          <span class="hio-label">I'm raising children now</span>
          <span class="hio-arrow">&rarr;</span>
        </button>
        <button class="hero-intent-opt" data-path="preparing">
          <span class="hio-label">I'm preparing, mentoring, or growing</span>
          <span class="hio-arrow">&rarr;</span>
        </button>
      </div>
      <div class="hero-intent-foot">
        <span class="fine">Free. About twenty minutes. Your results are private.</span>
        <a class="link ash" href="classes.html" style="font-size:13px">Or explore classes first</a>
      </div>
    </div>
  </div>
  <div class="heromarquee" aria-hidden="true">
    <div class="hm-col hm-col-a">
      <div class="hm-track">
        <figure class="hm-card"><img src="assets/img/photos/hero-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-03.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-05.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/testimonial-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-07.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-01.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-03.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-05.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/testimonial-01.jpg" alt=""></figure>
      </div>
    </div>
    <div class="hm-col hm-col-b">
      <div class="hm-track hm-track-slow">
        <figure class="hm-card"><img src="assets/img/photos/hero-02.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-06.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-04.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-02.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-06.jpg" alt=""></figure>
        <figure class="hm-card"><img src="assets/img/photos/hero-04.jpg" alt=""></figure>
      </div>
    </div>
  </div>
</div></header>

<section class="tight" style="padding:26px 0"><div class="container">
  <div class="row between wrap" style="gap:14px;align-items:center;border:1px solid var(--hairline);border-radius:10px;padding:18px 22px">
    <span class="small" style="color:var(--ash)">Run a program, a church, a unit, or a caseload? Fathers.com is the measurable standard for effective fathering programs.</span>
    <a class="btn btn-secondary btn-sm" href="organizations.html">For Organizations &rarr;</a>
  </div>
</div></section>

<section class="band"><div class="container split">
  <div>
    <h2 class="d-36">Four things decide the kind of father you are.</h2>
    <p style="color:var(--ash);margin:18px 0 28px;max-width:52ch">Involvement. Consistency. Awareness. Nurturance. The Keystone Father Profile measures all four, normed against 9,232 fathers. You get a score, an honest read on where you stand, and a ninety-day plan built from your gaps. Free, before you pay for anything.</p>
    <a class="btn btn-primary" href="profile.html">Start your Profile</a>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">MEASURE &middot; YOUR BASELINE</div>
    <div class="bigscore" style="font-size:72px;margin-bottom:24px">71</div>
    <div class="domain"><div class="row1"><span>Involvement</span><span class="score">78</span></div><div class="bar"><span style="width:78%"></span></div></div>
    <div class="domain gap"><div class="row1"><span>Consistency</span><span class="score">55</span></div><div class="bar"><span style="width:55%"></span></div></div>
    <div class="domain"><div class="row1"><span>Awareness</span><span class="score">74</span></div><div class="bar"><span style="width:74%"></span></div></div>
    <div class="domain" style="margin-bottom:0"><div class="row1"><span>Nurturance</span><span class="score">77</span></div><div class="bar"><span style="width:77%"></span></div></div>
  </div>
</div></section>

<section class="band tight" id="start-free"><div class="container split" style="align-items:start">
  <div>
    <h2 style="font-family:var(--font-ui);font-weight:600;font-size:22px;margin-bottom:22px">Start free. Grow on a plan.</h2>
    <div class="row wrap"><a class="btn btn-primary" href="profile.html">Start your Profile</a><a class="btn btn-secondary" href="gift.html">Give a gift</a></div>
  </div>
  <div class="stack-16">
    <div class="check"><span class="checkmark">&check;</span><span>Your Keystone Profile and ninety-day plan, free</span></div>
    <div class="check"><span class="checkmark">&check;</span><span>Dr. Canfield's Fundamentals of Fathering, free</span></div>
    <div class="check"><span class="checkmark">&check;</span><span>Classes taught by fathers who lived it</span></div>
    <div class="check"><span class="checkmark">&check;</span><span>A Verified Certificate when you finish the work</span></div>
    <div class="check"><span class="checkmark">&check;</span><span>Full class library membership, optional</span></div>
    <div class="check"><span class="checkmark">&check;</span><span>30-day money-back guarantee on anything paid</span></div>
  </div>
</div></section>

<section><div class="container">
  <div class="billboard">
    <div class="slot r-21x9 play-overlay" data-slot="IMG-P1-BILL-01"><span class="tri"></span></div>
    <div class="overlay">
      <div class="eyebrow" style="margin-bottom:12px">BUILT ON THREE DECADES OF RESEARCH</div>
      <h2 class="d-36" style="margin:0 0 8px">The Fundamentals of Fathering</h2>
      <p class="small" style="margin-bottom:18px">The Keystone Profile grows out of the work of Dr. Ken Canfield, founder of the National Center for Fathering. Start with his flagship class on presence. Free.</p>
      <a class="btn btn-secondary play" href="class.html">Watch The Fundamentals</a>
    </div>
  </div>
</div></section>

<section class="tight"><div class="container">
  <div class="eyebrow" style="margin-bottom:12px">TRAIN &middot; YOUR PLAN</div>
  <h2 class="d-28" style="margin-bottom:12px">A plan you actually work.</h2>
  <p style="color:var(--ash);margin:0 0 24px;max-width:56ch">Your Profile becomes a ninety-day plan, one clear step at a time. New classes every month, on the drive or on the couch. The Profile and your plan are always free.</p>
  <div class="rowscroll" id="homeclasses" data-repeat="3" data-prefix="IMG-P1-CAT-" data-ratio="r-2x3" data-href="class.html" data-hrefs="class.html|certificates.html#catalog|certificates.html#catalog"
    data-titles="Dr. Ken Canfield|Steady Under Pressure|Coming Home Present"
    data-subs="The Fundamentals of Fathering|A father&rsquo;s temper, trained|Presence after time away"
    data-metas="12 lessons &middot; 2h 10m|8 modules &middot; Verified Certificate|10 modules &middot; Verified Certificate"
    data-cats="fundamentals|steady|coming-home"></div>
  <p style="margin-top:20px"><a class="link" href="classes.html">See all classes</a></p>
</div></section>

<section class="tight" style="padding:10px 0 34px"><div class="container">
  <div class="row wrap" style="gap:26px;justify-content:center;text-align:center">
    <span class="fine">Normed on 9,232 fathers</span><span class="fine ash">&middot;</span><span class="fine">Built by the National Center for Fathering, four decades of research</span><span class="fine ash">&middot;</span><span class="fine">Every certificate publicly verifiable</span>
  </div>
</div></section>

<section class="band-brass"><div class="container split">
  <div>
    <div class="eyebrow brass" style="margin-bottom:14px">PROVE &middot; VERIFIED CERTIFICATES</div>
    <h2 class="d-36" style="font-size:32px">Proof you did the work.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:50ch">Verified hours, identity-checked, with a serial any court, program, or employer can confirm online. When you finish, you hold something that counts outside this site.</p>
    <a class="btn btn-brass" href="certificates.html">Explore Certificates</a>
    <p class="fine" style="margin-top:16px">Run a program? Issue Fathers.com certificates to your participants. <a class="link ash" href="groups.html" style="font-size:12px">For organizations</a>.</p>
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
    <h2 class="d-36" style="font-size:32px">Run your fathers on the standard.</h2>
    <p style="color:var(--ash);margin:16px 0 20px;max-width:50ch">Circles for churches, teams, and crews. One film a week, one guide, one standard. And for programs that serve fathers at scale, measure every father, grow them on a plan, and prove what is working.</p>
    <p class="small" style="color:var(--ash);margin:0 0 24px;max-width:50ch"><b style="color:var(--bone)">No program yet?</b> Start with the assessment. You already intake fathers. Measure them at the door and hold a baseline you did not have.</p>
    <a class="btn btn-secondary" href="organizations.html">For organizations</a>
    <p class="fine" style="margin-top:16px">Also for <a class="link ash" href="employers.html" style="font-size:12px">employers</a> and <a class="link ash" href="veterans.html" style="font-size:12px">veteran programs</a>.</p>
  </div>
</div></section>

<section class="band"><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:14px">FIND A PROGRAM</div>
    <h2 class="d-36" style="font-size:32px">Looking for a fatherhood program? Find one that works.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:52ch">Not every father starts with us. Tell us the situation, a new dad, a return from deployment, a reentry, a divorce, and we will point you to a program that fits. Every one of them runs on the same published standard.</p>
  </div>
  <div>
    <a class="btn btn-primary" href="find-a-program.html">Find a program</a>
    <p class="fine" style="margin-top:12px">We rate programs against one published standard, including our own.</p>
  </div>
</div></section>

<section><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:14px">GATHERINGS</div>
    <h2 class="d-36" style="font-size:32px">We gather fathers in real life.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:52ch">The work is not only on a screen. Fathers.com hosts gatherings that bring men, mentors, and the people who lead them into the same room. Get notified about a gathering near you.</p>
  </div>
  <div>
    <a class="btn btn-secondary" href="gatherings.html">See gatherings</a>
    <p class="fine" style="margin-top:12px">One or two flagship events to start. Bring one to your city.</p>
  </div>
</div></section>

<section class="tight"><div class="container center" style="max-width:760px">
  <p class="quote">"I stopped guessing. I had a baseline and a plan, and my kids felt the difference in a month."</p>
  <div class="row" style="justify-content:center;margin-top:24px"><div class="slot r-1x1 filled" data-slot="IMG-P1-TST-01" style="width:44px;border-radius:50%"><img src="assets/img/photos/testimonial-01.jpg" alt="Marcus"></div><span class="small">Marcus, father of three, Circle member</span></div>
  <div class="row" style="justify-content:center;gap:8px;margin-top:22px"><span class="dot on"></span><span class="dot"></span><span class="dot"></span></div>
</div></section>

<section><div class="container" style="max-width:820px">
  <h2 class="d-28" style="margin-bottom:24px">Frequently asked questions</h2>
  <details open><summary>What is Fathers.com?</summary><div class="body">Fathers.com is the home of the Keystone Standard, from the National Center for Fathering. Measure where you stand as a father, grow with a plan, and prove the work with a verified certificate. Programs and agencies use the same standard to show whether fathers are changing.</div></details>
  <details><summary>How much does it cost?</summary><div class="body">Your Keystone Profile and your ninety-day plan are free, along with Dr. Canfield's Fundamentals of Fathering. Verified Certificates are priced separately. A full class library membership is optional at $120 a year, with a 30-day money-back guarantee.</div></details>
  <details><summary>How does the Keystone Profile work?</summary><div class="body">About 40 questions, around twenty minutes. You get four domain scores, an overall baseline, and a plan built from your gaps, normed against 9,232 fathers. Your results are yours. We never share them.</div></details>
  <details><summary>Do you rate other programs?</summary><div class="body">Yes. We publish a standard for whether a father program works and rate programs against it, including our own, so fathers and funders can tell what actually helps. Tell us what you need and we will point you to one that fits.</div></details>
  <details><summary>Are the Certificates accepted by courts?</summary><div class="body">Certificates carry verified hours, identity checks, and a public verification page. Acceptance is decided by each court or program, so confirm with yours before enrolling.</div></details>
  <details><summary>Is this religious?</summary><div class="body">No. Faith is an optional lens you can switch on during the Profile. It changes which classes and actions we recommend. Nothing else.</div></details>
</div></section>
''')

# ================================================== profile.html (P2)
PAGES['profile.html'] = dict(title='The Keystone Father Profile', desc='About twenty minutes. Four scores. One plan.', active='', mode='public', nochrome=True, body='''
<div class="assess" id="keystone"></div>
<p class="center fine" style="padding:0 0 28px"><a class="link ash" href="index.html" style="font-size:12px">Back to Fathers.com</a></p>
''')

# ================================================== stories.html (P3)
PAGES['stories.html'] = dict(title='Stories', desc='Epic fatherhood films. Origin, crisis, the turn, the standard.', active='Stories', mode='public', body='''
<section class="tight" style="padding-top:48px"><div class="container">
  <div style="margin-bottom:22px">
    <h1 class="d-36" style="margin-bottom:6px">Fathers who did the work.</h1>
    <p class="small" style="color:var(--ash)">Origin, crisis, the turn, the standard. Every story ends with the step you can take.</p>
  </div>
  <div class="billboard">
    <div class="slot r-21x9 play-overlay" data-slot="IMG-P3-BILL-01"><span class="tri"></span></div>
    <div class="overlay">
      <div class="eyebrow" style="margin-bottom:12px">STORIES</div>
      <h2 class="d-48" style="margin-bottom:8px">Home by Six</h2>
      <p class="small" style="margin-bottom:18px">A father who chose to be there, one ordinary evening at a time.</p>
      <div class="row"><a class="btn btn-primary play" href="story.html">Watch</a><a class="btn btn-secondary" href="story.html">Trailer</a><span class="tag">24 min</span></div>
    </div>
  </div>
</div></section>

<section class="tight"><div class="container stack-32">
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
    <div class="row" style="margin-top:26px"><a class="link ash" href="#" data-share="copy" style="font-size:13px">Share link</a><a class="link ash" href="#" data-share="sms" style="font-size:13px">Text it</a><a class="link ash" href="#" data-share="email" style="font-size:13px">Email it</a><a class="link ash" href="#" data-share="report" style="font-size:13px;margin-left:auto">Report</a></div>
  </div>
  <aside class="stack-24">
    <div class="card"><div class="eyebrow" style="margin-bottom:14px">WHAT HE WISHED HE KNEW SOONER</div>
      <p class="quote" style="font-size:19px;margin-bottom:12px">"Coming home is a mission, not a landing."</p>
      <p class="quote" style="font-size:19px;margin-bottom:12px">"Your kids don't need the story. They need the schedule."</p>
      <p class="quote" style="font-size:19px">"Repair beats explain. Every time."</p></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:14px">WHAT HE TRAINS NOW</div>
      <div class="row" style="gap:16px"><div class="slot r-2x3" data-slot="IMG-P3-DET-02" style="flex:0 0 72px"></div>
      <div><b style="font-size:15px">Watch Ray's class: Coming Home Present</b><p class="small" style="margin-top:6px">10 lessons &middot; 1h 44m</p></div></div>
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
PAGES['classes.html'] = dict(title='Classes', desc='Three classes. One standard. Presence, steadiness, and coming home, taught by fathers who lived it.', active='Classes', mode='public', body='''
<section class="tight" style="padding-top:56px"><div class="container">
  <div class="row between wrap" style="margin-bottom:14px">
    <h1 class="d-36">Three classes. One standard.</h1>
    <button class="input" data-open-search style="max-width:320px;text-align:left;color:var(--ash);cursor:pointer">Search classes and lessons</button>
  </div>
  <p style="color:var(--ash);margin:0 0 36px;max-width:62ch">We cut the catalog to the three that matter in every room where fathers are met: the home, the court, the facility, the base. Each one moves your Keystone score. Each one can be earned as a Verified Certificate.</p>
  <div class="grid-3" id="classgrid">
    <a class="mediacard" href="class.html"><div class="slot r-2x3" data-slot="IMG-P4-CAT-01"></div><div class="row" style="margin:12px 0 0"><span class="pill pill-new">Flagship</span></div><div class="name">Dr. Ken Canfield</div><div class="sub">The Fundamentals of Fathering</div><div class="meta">12 lessons &middot; 2h 10m &middot; Free</div></a>
    <a class="mediacard" href="certificates.html#catalog"><div class="slot r-2x3" data-slot="IMG-P4-CAT-02"></div><div class="name" style="margin-top:12px">Steady Under Pressure</div><div class="sub">A father&rsquo;s temper, trained</div><div class="meta">8 modules &middot; Verified Certificate</div></a>
    <a class="mediacard" href="certificates.html#catalog"><div class="slot r-2x3" data-slot="IMG-P4-CAT-08"></div><div class="name" style="margin-top:12px">Coming Home Present</div><div class="sub">Presence after time away</div><div class="meta">10 modules &middot; Verified Certificate</div></a>
  </div>
  <p class="fine" style="margin-top:24px">Presence. Steadiness. Coming home. Start with your free Profile and your plan will put them in order for you. Every class moves a Keystone score; every certificate proves it. <a class="link ash" href="research.html">How the Standard works &rarr;</a></p>
</div></section>

<div class="searchveil" id="searchveil"><div class="searchpanel">
  <input class="input" placeholder="Search classes and lessons" value="consistency">
  <div class="grid-2" style="margin-top:22px;gap:32px">
    <div><div class="eyebrow" style="margin-bottom:14px">RECENT</div>
      <p class="small" style="margin-bottom:10px">repair</p><p class="small" style="margin-bottom:10px">temper</p><p class="small">deployment</p></div>
    <div><div class="eyebrow" style="margin-bottom:14px">RESULTS FOR "CONSISTENCY"</div>
      <div class="stack-16">
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-01" style="width:44px"></div><div><b style="font-size:14px">The Fundamentals of Fathering</b><p class="fine">Class</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-02" style="width:44px"></div><div><b style="font-size:14px">Coming Home Present</b><p class="fine">Class</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-03" style="width:44px"></div><div><b style="font-size:14px">Lesson 3: A Schedule They Can Trust</b><p class="fine">In The Fundamentals of Fathering</p></div></div>
        <div class="row"><div class="slot r-1x1" data-slot="IMG-P4-SRCH-04" style="width:44px"></div><div><b style="font-size:14px">Lesson 3: The Pause That Saves It</b><p class="fine">In Steady Under Pressure</p></div></div>
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
      <div class="actionrow"><span class="checkmark">&rarr;</span><div class="txt">Read your kids' inner weather.</div></div>
      <div class="actionrow"><span class="checkmark">&rarr;</span><div class="txt">Build a schedule they can trust.</div></div>
      <div class="actionrow"><span class="checkmark">&rarr;</span><div class="txt">Say what you stand for out loud.</div></div>
      <div class="actionrow"><span class="checkmark">&rarr;</span><div class="txt">Repair fast when you blow it.</div></div>
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
        <div class="check"><span class="checkmark">&check;</span><span class="small">Every film, class, and workbook, new releases monthly</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Your baseline and plan</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">30-day money-back guarantee</span></div>
      </div></div>
    <div class="card brass-card"><p class="small" style="margin-bottom:12px">Need court-ready proof? This class has a Verified Certificate edition.</p>
      <div class="row wrap" style="gap:14px;align-items:center">
        <a class="btn btn-yellow btn-sm" href="enroll.html?cert=fundamentals&amp;title=Fathering%20Fundamentals&amp;hours=10.0">Earn the certificate</a>
        <button class="link brass" id="seeCert" data-cert-course="The Fundamentals of Fathering" data-cert-hours="10.0" style="font-size:14px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px">See the Certificate</button></div></div>
  </aside>
</div></section>

<section class="band tight"><div class="container">
  <h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:20px">Keep training. The other two.</h2>
  <div class="rowscroll" data-repeat="2" data-prefix="IMG-P4-REL-" data-ratio="r-2x3" data-href="certificates.html#catalog"
    data-titles="Steady Under Pressure|Coming Home Present"
    data-subs="A father&rsquo;s temper, trained|Presence after time away"
    data-metas="8 modules &middot; Verified Certificate|10 modules &middot; Verified Certificate"></div>
</div></section>
<script src="assets/js/cert-preview.js"></script>
''')

# ================================================== player.html (P5)
PAGES['player.html'] = dict(title='Lesson 4 &middot; The Fundamentals of Fathering', desc='Lesson player.', active='Classes', mode='app', body='''
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
        <b style="font-size:14px">Lesson 4 &middot; Enter Their World</b>
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
          <div><div class="row" style="gap:10px;margin-bottom:8px"><span class="checkmark">&check;</span><b>Lesson 4 complete</b></div>
            <p class="small">Up next: Lesson 5, Repair Fast &middot; playing in <b id="countdown" style="font-family:var(--font-mono)"><b>5</b></b>s</p></div>
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
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">&check;</span> 01 Why Presence Wins</span><span class="tag">8:12</span></div>
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">&check;</span> 02 Your Baseline</span><span class="tag">9:04</span></div>
        <div class="row between" style="padding:10px 12px;border-radius:6px;background:var(--coal-2)"><span><span class="checkmark" style="width:16px;height:16px;font-size:9px;flex:0 0 16px">&check;</span> 03 A Schedule They Can Trust</span><span class="tag">10:31</span></div>
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
PAGES['plan.html'] = dict(title='My Plan', desc='Your ninety-day plan, built from your Keystone Profile.', active='My Plan', mode='app', auth=True, body='''
<section class="tight" style="padding-top:44px"><div class="container">
  <div id="planRoot">
    <!-- states rendered by plan-controller.js -->
    <div id="planLoading" class="center" style="padding:80px 0">
      <div class="eyebrow" style="margin-bottom:12px">LOADING YOUR PLAN</div>
      <p class="ash">One moment.</p>
    </div>
  </div>
</div></section>
<script src="assets/js/keystone-data.js"></script>
<script src="assets/js/plan-engine.js"></script>
<script src="assets/js/plan-controller.js"></script>
''')

# ================================================== circles.html (P7 in-product)
PAGES['circles.html'] = dict(title='My Circle', desc='Living Hope Men. One film, one discussion, one standard.', active='Circles', mode='app', auth=True, body='''
<section class="tight" style="padding-top:44px"><div class="container">
  <div class="row between wrap" style="margin-bottom:24px">
    <div><h1 class="d-36">Living Hope Men, Tuesday 0600</h1>
      <div class="row" style="margin-top:12px"><span class="chip" style="cursor:default">14 men</span><span class="chip" style="cursor:default">Next: Tue Jul 14, 6:00 AM</span></div></div>
  </div>
  <div class="glance" style="margin-bottom:28px">
    <div class="glance-card"><div class="glance-lbl">YOUR CIRCLE</div><div class="glance-big">14</div><div class="glance-sub">men</div></div>
    <div class="glance-card"><div class="glance-lbl">THIS WEEK</div><div class="glance-big">9</div><div class="glance-sub">watched the film</div></div>
    <div class="glance-card"><div class="glance-lbl">NEXT MEETING</div><div class="glance-big glance-sm">Tue 0600</div><div class="glance-sub">Jul 14</div></div>
    <div class="glance-card glance-next"><div class="glance-lbl">CONSIDER NEXT</div><div class="glance-next-txt">Post this week's question, and nudge the five who haven't watched.</div></div>
  </div>
  <div data-tabs>
    <div class="tabs"><button class="active">This Week</button><button>Members</button><button>Leader Kit</button></div>

    <div class="tabpanel active"><div style="display:grid;grid-template-columns:1.5fr .8fr;gap:40px;align-items:start">
      <div>
        <div class="card" style="padding:28px;margin-bottom:26px">
          <div class="eyebrow" style="margin-bottom:14px">THIS WEEK IN CIRCLE</div>
          <div class="row" style="gap:18px;align-items:flex-start;margin-bottom:20px">
            <div class="slot r-16x9 play-overlay" data-slot="IMG-P7-CIR-01" style="flex:0 0 200px"><span class="tri"></span></div>
            <div><b style="font-size:15px">Watch before Tuesday: After the Sentence &middot; 22 min</b></div>
          </div>
          <p class="quote" style="font-size:20px;margin-bottom:18px">"Where did your father's absence still shape your hand?"</p>
          <div class="actionrow"><span class="checkmark">&rarr;</span><div class="txt">Tell one man in this Circle your week 3 action. Let him check you.</div></div>
        </div>
        <div class="card" style="padding:24px">
          <div class="row" style="margin-bottom:20px;gap:12px"><span class="avatarchip">M</span><input class="input" id="circlePostInput" placeholder="Say it straight"><button class="btn btn-primary btn-sm" id="circlePostBtn">Post</button></div>
          <div id="circleFeed"><p class="ash" style="padding:12px 0">Loading your circle&hellip;</p></div>
        </div>
      </div>
      <aside class="card" style="padding:20px">
        <div class="eyebrow" style="margin-bottom:16px">MEMBERS &middot; LAST 4 WEEKS</div>
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
        <tr><td>Marcus T.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">&check;</span></td><td class="fine">Today</td><td class="mono fine">4 / 4</td></tr>
        <tr><td>Dave R.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">&check;</span></td><td class="fine">2h ago</td><td class="mono fine">3 / 4</td></tr>
        <tr><td>Tom K.</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">&check;</span></td><td class="fine">5h ago</td><td class="mono fine">3 / 4</td></tr>
        <tr><td>Jesse P.</td><td class="fine">Not yet</td><td class="fine">1d ago</td><td class="mono fine">1 / 4</td></tr>
      </tbody></table>
    </div>

    <div class="tabpanel">
      <div class="grid-2" style="gap:24px">
        <div class="card"><b style="font-size:15px">Session guide</b><p class="fine" style="margin:6px 0 16px">After the Sentence &middot; 6 pages</p>
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
<script src="assets/js/circles.js"></script>
''')

# ================================================== groups.html (P7 marketing + admin)
PAGES['groups.html'] = dict(title='For Groups', desc='Circles for churches, teams, and programs. Bring your men.', active='For Groups', mode='public', body='''
<header class="hero"><div class="container split">
  <div class="slot r-4x3" data-slot="IMG-P7-MKT-01"></div>
  <div>
    <div class="eyebrow" style="margin-bottom:16px">FOR GROUPS</div>
    <h1 class="d-48">Bring your men. We bring the plan.</h1>
    <p class="lead" style="margin:20px 0 30px">Films, discussion guides, baselines, and a weekly standard. Built for churches, teams, and programs. One link enrolls every man under your group. No rosters, no spreadsheets.</p>
    <a class="btn btn-primary" href="#contact">Talk to us</a>
  </div>
</div></header>

<section class="band tight"><div class="container">
  <div class="grid-2" style="max-width:880px;margin:0 auto">
    <div class="card" style="padding:32px"><div class="eyebrow" style="margin-bottom:12px">CIRCLE</div>
      <div class="bigscore" style="font-size:44px">$2,000<span class="ash" style="font-size:16px;font-family:var(--font-ui)"> / year</span></div>
      <p class="small" style="margin:8px 0 20px">Up to 25 seats</p>
      <div class="stack-8">
        <div class="check"><span class="checkmark">&check;</span><span class="small">Every class and film</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Leader kits and guides</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Admin analytics</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Sponsored-seat option</span></div>
      </div></div>
    <div class="card" style="padding:32px"><div class="eyebrow" style="margin-bottom:12px">ORGANIZATION</div>
      <div class="bigscore" style="font-size:44px">Custom</div>
      <p class="small" style="margin:8px 0 20px">Custom seats, multi-Circle</p>
      <div class="stack-8">
        <div class="check"><span class="checkmark">&check;</span><span class="small">Everything in Circle</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Rosters and CSV invites</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Track assignment</span></div>
        <div class="check"><span class="checkmark">&check;</span><span class="small">Completion reporting</span></div>
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
      <tr><td>Marcus T.</td><td class="fine">m.t@…</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">&check;</span></td><td class="fine">Today</td><td class="fine">Tuesday 0600</td></tr>
      <tr><td>Dave R.</td><td class="fine">d.r@…</td><td><span class="checkmark" style="width:16px;height:16px;font-size:9px">&check;</span></td><td class="fine">2h</td><td class="fine">Tuesday 0600</td></tr>
      <tr><td>Luis A.</td><td class="fine">l.a@…</td><td class="fine">&mdash;</td><td class="fine">Invited</td><td class="fine">Thursday 1900</td></tr>
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
        <h1 class="d-36" style="margin-bottom:14px">Start your membership.</h1>
        <p class="small" style="color:var(--ash);margin-bottom:24px;max-width:50ch">The membership is the library: every film, class, and workbook, the full veterans field guide, new releases monthly. Your Profile, plan, and retakes stay free either way. Verified Certificates are separate, $79 each, free with a program code.</p>
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
        <div class="row" style="gap:10px;margin-bottom:18px"><span class="checkmark">&check;</span><span class="small">30-day money-back guarantee, no questions</span></div>
        <hr class="hr" style="margin-bottom:18px">
        <div class="stack-8">
          <div class="check"><span class="checkmark">&check;</span><span class="small">Every film, class, and workbook, new releases monthly</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">Your baseline and ninety-day plan</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">The Daily</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">Audio and downloads</span></div>
        </div>
        <p class="fine" style="margin-top:18px">By continuing you agree to the <a class="link ash" href="terms.html" style="font-size:12px">terms</a>. Pricing shown for design pending pricing interviews.</p>
      </aside>
    </div>
  </div>
  <div class="seqpanel">
    <div class="center" style="max-width:640px;margin:40px auto">
      <span class="checkmark" style="width:56px;height:56px;font-size:26px;margin:0 auto 22px;display:inline-flex">&check;</span>
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
      <button class="chip selected" data-toggle="single">1 father &middot; $120</button>
      <button class="chip" data-toggle="single">3 fathers &middot; $360</button>
      <button class="chip" data-toggle="single">10 fathers &middot; $1,200</button>
      <button class="chip" data-toggle="single">Custom</button>
    </div>
    <label style="display:flex;gap:12px;align-items:center;color:var(--bone);font-size:14px;margin-bottom:18px"><input type="checkbox" class="toggle"> Make it monthly</label>
    <p class="fine" style="max-width:52ch;margin-bottom:12px">Sponsored seats are assigned through partner facilities and programs. You will get one update when your seat is claimed. No personal details, ever.</p>
    <p class="fine" style="max-width:52ch;margin-bottom:26px">Churches and programs: sponsor ten and we set up your join link, one link that enrolls every man under your group.</p>
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
      <div class="row" style="gap:20px;margin-bottom:28px"><div class="slot r-1x1" data-slot="IMG-P9-AVA-01" style="width:72px;border-radius:50%"></div><a class="link ash" href="mailto:Team@Fathers.com?subject=Change%20my%20account%20email" style="font-size:13px">Change</a></div>
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
        <div><b>Fathers.com Annual</b><p class="small" style="margin-top:6px">Renews March 4, 2027 &middot; $120</p></div>
        <button class="btn btn-secondary btn-sm" onclick="toast('Card update wires to Stripe at deploy.')">Update payment</button></div>
        <hr class="hr" style="margin:18px 0">
        <div class="row between"><span class="small">Visa ending 4242</span><a class="link ash" href="mailto:Team@Fathers.com?subject=Update%20my%20payment%20method" style="font-size:13px">Update</a></div></div>
      <div class="card" style="margin-bottom:20px"><div class="eyebrow" style="margin-bottom:14px">RECEIPTS</div>
        <table><tbody>
          <tr><td class="mono fine">Mar 4, 2026</td><td>Annual membership</td><td class="mono">$120.00</td><td><a class="link ash" href="#" data-print style="font-size:13px">PDF</a></td></tr>
          <tr><td class="mono fine">Jun 2, 2026</td><td>Fathering Fundamentals Certificate</td><td class="mono">$79.00</td><td><a class="link ash" href="#" data-print style="font-size:13px">PDF</a></td></tr>
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
PAGES['certificates.html'] = dict(title='Verified Certificates', desc='Earned proof that you did the work of becoming a better father. Verified hours, identity checked, a serial anyone can confirm.', active='Certificates', mode='public', body='''
<!-- HERO: the certificate is the thesis -->
<header class="cert-hero"><div class="container">
  <div class="cert-hero-grid">
    <div class="cert-hero-copy">
      <div class="eyebrow brass" style="margin-bottom:18px">FATHERS.COM VERIFIED CERTIFICATES</div>
      <h1 class="cert-h1">A document that<br>means something.</h1>
      <p class="lead" style="margin:22px 0 34px">Not a participation ribbon. Earned proof that you did the work. For fathers, future fathers, and the men who mentor them, with verified hours, a checked identity, and a serial anyone can confirm.</p>
      <div class="row wrap" style="gap:14px">
        <a class="btn btn-yellow" href="#catalog">See the certificates</a>
        <a class="btn btn-secondary" href="verify.html">Verify one</a>
      </div>
    </div>
    <div class="cert-hero-art">
      <div class="cert-doc-3d">
        <div class="cert-doc">
          <div class="cert-doc-brass"></div>
          <div class="cert-seal">
            <img src="assets/img/logomark-dark.png" alt="" class="lg-dark"><img src="assets/img/logomark-light.png" alt="" class="lg-light">
          </div>
          <div class="cert-doc-kicker">FATHERS.COM VERIFIED CERTIFICATE</div>
          <div class="cert-doc-name">Marcus T.</div>
          <div class="cert-doc-course">has completed the Fathering Fundamentals Certificate</div>
          <div class="cert-doc-meta">10.0 verified instructional hours &middot; June 2, 2026</div>
          <div class="cert-doc-rule"></div>
          <div class="cert-doc-foot">
            <div><div class="cert-doc-serial">SERIAL FC-2026-004317</div><div class="cert-doc-serial">Identity verified at enrollment</div></div>
            <div class="cert-doc-qr">QR</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div></header>

<!-- WHAT IT PROVES: verification as the differentiator, four pillars -->
<section class="cert-proves"><div class="container">
  <div class="center" style="max-width:640px;margin:0 auto 56px">
    <h2 class="d-36">Anyone can print a certificate.<br>Ours can be checked.</h2>
    <p class="lead" style="margin:16px auto 0">Four things separate a Fathers.com certificate from a PDF someone made in an afternoon.</p>
  </div>
  <div class="cert-pillars">
    <div class="cert-pillar">
      <div class="cert-pillar-n">01</div>
      <h3>Identity verified</h3>
      <p>A government ID is checked at enrollment, then deleted. The name on the certificate is the man who earned it.</p>
    </div>
    <div class="cert-pillar">
      <div class="cert-pillar-n">02</div>
      <h3>Hours logged, not claimed</h3>
      <p>Time on task is measured. No skip credit, no fast-forward. The hours on the document are hours he actually spent.</p>
    </div>
    <div class="cert-pillar">
      <div class="cert-pillar-n">03</div>
      <h3>Checkpoints passed</h3>
      <p>Attention checks through every lesson and a final assessment at eighty percent. He learned it, he did not just watch it.</p>
    </div>
    <div class="cert-pillar">
      <div class="cert-pillar-n">04</div>
      <h3>Publicly verifiable</h3>
      <p>Every certificate carries a unique serial with a public page. A court, an employer, or a program can confirm it instantly.</p>
    </div>
  </div>
</div></section>

<!-- HOW TO EARN ONE: make the process obvious -->
<section class="tight"><div class="container">
  <div class="center" style="max-width:640px;margin:0 auto 40px">
    <div class="eyebrow brass" style="margin-bottom:12px">HOW TO EARN ONE</div>
    <h2 class="d-36">Three steps to your certificate.</h2>
  </div>
  <div class="grid-3">
    <div class="card" style="padding:24px"><div class="mono ash" style="margin-bottom:10px">STEP 1</div><b>Enroll</b><p class="small" style="margin-top:8px">Pick a certificate and enroll. Free with your program code if you have one.</p></div>
    <div class="card" style="padding:24px"><div class="mono ash" style="margin-bottom:10px">STEP 2</div><b>Do the work</b><p class="small" style="margin-top:8px">Complete the instructional hours and pass the checkpoints. Time on task is measured.</p></div>
    <div class="card" style="padding:24px"><div class="mono ash" style="margin-bottom:10px">STEP 3</div><b>Get your serial</b><p class="small" style="margin-top:8px">Pass the final and receive a verified certificate a court or employer can confirm.</p></div>
  </div>
</div></section>

<!-- CATALOG: the certificates themselves -->
<section id="catalog" class="band"><div class="container">
  <div class="row between wrap" style="margin-bottom:40px;align-items:flex-end">
    <div><div class="eyebrow brass" style="margin-bottom:12px">THE CERTIFICATES</div>
    <h2 class="d-36">Three certificates. Chosen for the rooms where fathers are met.</h2></div>
    <p class="small" style="max-width:34ch">Open to every man. Presence, steadiness, and coming home: the three credentials courts, programs, and commands actually ask for, built on the Keystone framework.</p>
  </div>
  <div class="cert-cards">
    <a class="cert-card" href="enroll.html?cert=fundamentals&amp;title=Fathering%20Fundamentals&amp;hours=10.0" data-cert="fundamentals" data-title="Fathering Fundamentals" data-hours="10.0" data-desc="The flagship curriculum, hardened into proof. The same lessons taught by fathers who have lived it, plus identity verification, logged time, checkpoints, and a final assessment.">
      <div class="cert-card-top"><span class="pill pill-court">Court-ready</span><span class="cert-card-hrs">10.0 hrs</span></div>
      <h3>Fathering Fundamentals</h3>
      <p>The flagship. The core of engaged, present fatherhood, hardened into proof.</p>
      <div class="cert-card-foot"><span class="mono">$79</span><span class="cert-card-go">Start this certificate &rarr;</span></div>
    </a>
        <a class="cert-card" href="enroll.html?cert=reentry&amp;title=Coming%20Home%20Present&amp;hours=12.0" data-cert="reentry" data-title="Coming Home Present" data-hours="12.0" data-desc="For fathers coming home: after a deployment, after a sentence, after any time away. Rebuilding presence from day one, with identity verification, logged time, checkpoints, and a final assessment a court or command can trust.">
      <div class="cert-card-top"><span class="pill pill-court">Court-ready</span><span class="cert-card-hrs">12.0 hrs</span></div>
      <h3>Coming Home Present</h3>
      <p>For fathers coming home: after a deployment, after a sentence, after any time away.</p>
      <div class="cert-card-foot"><span class="mono">$79</span><span class="cert-card-go">Start this certificate &rarr;</span></div>
    </a>
    <a class="cert-card" href="enroll.html?cert=anger&amp;title=Steady%20Under%20Pressure&amp;hours=8.0" data-cert="anger" data-title="Steady Under Pressure" data-hours="8.0" data-desc="A father&rsquo;s temper, trained. The pause, the repair, and the steadiness your kids can feel. Verified hours, identity checked, checkpoints, and a final assessment at eighty percent to pass.">
      <div class="cert-card-top"><span class="pill pill-court">Court-ready</span><span class="cert-card-hrs">8.0 hrs</span></div>
      <h3>Steady Under Pressure</h3>
      <p>A father&rsquo;s temper, trained. The pause, the repair, and the steadiness your kids can feel.</p>
      <div class="cert-card-foot"><span class="mono">$79</span><span class="cert-card-go">Start this certificate &rarr;</span></div>
    </a>
      </div>
  <p class="fine" style="margin-top:20px">Each certificate is $79. Fathers in a partnered church, group, or program enroll free with their program code.</p>
</div></section>

<!-- PROOF IN CONTEXT: the certificate as a milestone, with real photography -->
<section class="cert-context"><div class="container">
  <div class="cert-context-grid">
    <div class="cert-context-photo">
      <img src="assets/img/photos/community-01.jpg" alt="Fathers gathered together">
    </div>
    <div class="cert-context-copy">
      <div class="eyebrow brass" style="margin-bottom:14px">WHY IT MATTERS</div>
      <h2 class="d-36" style="margin-bottom:20px">The document opens doors.<br>The work changes a family.</h2>
      <p class="lead" style="margin-bottom:16px">A judge sees a serial they can verify. A program sees hours they can trust. But the man who earned it sees something else: the proof that he showed up, learned, and became someone his children can count on.</p>
      <p class="small">That is the difference between a certificate and a keepsake. This is both.</p>
    </div>
  </div>
</div></section>

<!-- REQUIREMENTS: the flagship, detailed -->
<section id="fundamentals"><div class="container">
  <div class="cert-req-grid">
    <div>
      <div class="eyebrow brass" style="margin-bottom:12px" id="certEyebrow">FLAGSHIP CERTIFICATE</div>
      <h2 class="d-36" style="margin-bottom:8px" id="certTitle">Fathering Fundamentals</h2>
      <p class="mono small" style="margin-bottom:24px" id="certHours">10.0 verified instructional hours</p>
      <p style="max-width:56ch;margin-bottom:32px;color:var(--ash)" id="certDesc">The flagship curriculum, hardened into proof. The same lessons taught by fathers who have lived it, plus identity verification, logged time, checkpoints, and a final assessment. Built for every man growing into fatherhood or mentorship, not just those with kids today.</p>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:20px;margin-bottom:18px">What earning it requires</h3>
      <div class="cert-reqs">
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>A government ID, verified at enrollment and deleted after issuance</span></div>
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>Attention checkpoints inside every lesson</span></div>
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>Time on task logged, with no credit for skipping</span></div>
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>A final assessment, eighty percent to pass</span></div>
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>Curriculum built on the Keystone framework, National Center for Fathering</span></div>
        <div class="cert-req"><span class="cert-req-mark">&check;</span><span>A unique serial with a public verification page</span></div>
      </div>
    </div>
    <aside class="cert-req-side">
      <div class="cert-req-card">
        <div class="cert-price-label"><span class="fine">CERTIFICATE</span></div>
        <div class="cert-req-price"><span class="mono">$79</span><span class="fine">one-time, when you enroll</span></div>
        <a class="btn btn-secondary" id="certExplore" href="enroll.html?cert=fundamentals&amp;title=Fathering%20Fundamentals&amp;hours=10.0" style="width:100%;margin-bottom:12px">Explore this certificate</a>
        <div class="cert-free-line">
          <span class="fine">Not sure yet?</span>
          <b>The Keystone Profile is free.</b>
          <p class="fine" style="margin-top:6px">Take your baseline first to see where to focus. No cost, no card.</p>
          <a class="btn btn-yellow" href="profile.html" style="width:100%;margin-top:12px">Take your free baseline</a>
        </div>
      </div>
      <div class="cert-req-note">
        <b>Issuing for a program?</b>
        <p class="small" style="margin:6px 0 14px">Bulk seats, rosters, and completion reports for courts, agencies, and ministries. Free for your fathers with a program code, and you see completion in your Efficacy Report.</p>
        <a class="link brass" href="groups.html#contact" style="font-size:14px">Talk to us &rarr;</a>
      </div>
    </aside>
  </div>
</div></section>
<script>
(function(){
  var cards = document.querySelectorAll('.cert-card[data-cert]');
  var title = document.getElementById('certTitle');
  var hours = document.getElementById('certHours');
  var desc = document.getElementById('certDesc');
  var eyebrow = document.getElementById('certEyebrow');
  if(!title) return;
  cards.forEach(function(c){
    c.addEventListener('click', function(e){
      e.preventDefault();
      title.textContent = c.getAttribute('data-title');
      hours.textContent = c.getAttribute('data-hours') + ' verified instructional hours';
      desc.textContent = c.getAttribute('data-desc');
      eyebrow.textContent = c.getAttribute('data-cert')==='fundamentals' ? 'FLAGSHIP CERTIFICATE' : 'CERTIFICATE';
      var explore = document.getElementById('certExplore');
      if(explore) explore.setAttribute('href', c.getAttribute('href'));
      document.getElementById('fundamentals').scrollIntoView({behavior:'smooth'});
    });
  });
})();
</script>
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
    <div class="hours">10.0 verified instructional hours &middot; Completed June 2, 2026</div>
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

# ================================================== LEGAL PAGES (scaffolding, dated today)
# NOTE: The body text below is PLAIN-LANGUAGE DRAFT scaffolding for legal review.
# Replace with counsel-reviewed text before relying on these as binding policy.
LEGAL_INTRO = '''<div class="legal-note"><b>Draft for review.</b> This is placeholder scaffolding. Final language pends legal review to match Fathers.com's actual data and business practices.</div>'''

PAGES['terms.html'] = dict(title='Terms of Service', desc='The terms for using Fathers.com.', active='', mode='public', body='''
<section class="legal"><div class="container" style="max-width:760px">
  <div class="eyebrow brass" style="margin-bottom:14px">LEGAL</div>
  <h1 class="d-48" style="margin-bottom:8px">Terms of Service</h1>
  <p class="fine" style="margin-bottom:8px">Last updated July 06, 2026</p>
  ''' + LEGAL_INTRO + '''
  <div class="legal-body">
    <h2>1. Agreement to terms</h2>
    <p>By using Fathers.com, you agree to these terms. Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit. If you do not agree, do not use the service.</p>
    <h2>2. Who can use Fathers.com</h2>
    <p>You must be at least 18 years old to create an account. The service is built for fathers, future fathers, and mentors. Content is intended for adults.</p>
    <h2>3. Your account</h2>
    <p>You are responsible for your account and for keeping your sign-in secure. Your assessment results and plan are yours. We describe how we handle your data in the Privacy Policy.</p>
    <h2>4. The Keystone Profile and your plan</h2>
    <p>The Keystone Father Profile is an educational assessment based on validated research from the National Center for Fathering. It is not a clinical, diagnostic, legal, or medical instrument, and results should not be used as a substitute for professional advice.</p>
    <h2>5. Certificates</h2>
    <p>Verified certificates require completion of the stated requirements, including identity verification and a passing assessment. Certificates attest to completion of a Fathers.com course. Acceptance by any court, agency, or program is at that body's discretion; we do not guarantee acceptance.</p>
    <h2>6. Payments and subscriptions</h2>
    <p>The Keystone Profile is free. Certain courses, certificates, and subscriptions require payment. Pricing, billing terms, and refund policy will be stated at the point of purchase.</p>
    <h2>7. Acceptable use</h2>
    <p>Do not misuse the service, attempt to forge certificates, share your account, or use the service to harm others. We may suspend accounts that violate these terms.</p>
    <h2>8. Content and intellectual property</h2>
    <p>The courses, assessment, and materials on Fathers.com are owned by the National Center for Fathering or its licensors. You may use them for your own growth, not for redistribution.</p>
    <h2>9. Disclaimers and limitation of liability</h2>
    <p>The service is provided as is. To the fullest extent permitted by law, the National Center for Fathering is not liable for indirect or consequential damages arising from your use of the service.</p>
    <h2>10. Changes to these terms</h2>
    <p>We may update these terms. Material changes will be posted here with a new date. Continued use after changes means you accept them.</p>
    <h2>11. Contact</h2>
    <p>Questions about these terms: Team@Fathers.com, or PO Box 996, Tontitown, AR 72770.</p>
  </div>
</div></section>
''')

PAGES['privacy.html'] = dict(title='Privacy Policy', desc='How Fathers.com handles your information.', active='', mode='public', body='''
<section class="legal"><div class="container" style="max-width:760px">
  <div class="eyebrow brass" style="margin-bottom:14px">LEGAL</div>
  <h1 class="d-48" style="margin-bottom:8px">Privacy Policy</h1>
  <p class="fine" style="margin-bottom:8px">Last updated July 06, 2026</p>
  ''' + LEGAL_INTRO + '''
  <div class="legal-body">
    <h2>Our commitment</h2>
    <p>Fathers.com is a program of the National Center for Fathering. Your assessment answers and plan are personal. We treat them with care and we do not sell them.</p>
    <h2>What we collect</h2>
    <p>We collect: the email you use to sign in; your Keystone Profile answers and results; your plan progress; and basic technical data needed to run the service. We collect a government ID only when you enroll in a verified certificate, and we delete it after issuance.</p>
    <h2>How we use it</h2>
    <p>We use your information to give you your results, build and save your ninety-day plan, issue certificates you earn, and send you plan reminders and account emails. We do not use your assessment answers for advertising.</p>
    <h2>What we do not do</h2>
    <p>We do not sell your personal information. We do not share your assessment results with employers, courts, or programs unless you direct us to. We do not use your reflections about your family for any purpose beyond serving you.</p>
    <h2>Sharing</h2>
    <p>We share data only with service providers who help us run the platform (for example, hosting and email delivery), under agreements that require them to protect it. If you are enrolled through an employer or group, we describe separately what that organization can see.</p>
    <h2>Your choices</h2>
    <p>You can access your data, correct it, or ask us to delete your account and results. Contact Team@Fathers.com. You can unsubscribe from emails at any time.</p>
    <h2>Data retention</h2>
    <p>We keep your results and plan while your account is active. Identity documents for certificates are deleted after the certificate is issued. If you delete your account, we remove your personal data on a reasonable schedule.</p>
    <h2>Security</h2>
    <p>We protect your data with access controls and encryption in transit. See our Security page for more.</p>
    <h2>State privacy rights</h2>
    <p>Depending on where you live, you may have additional rights (for example, under California law) to access, delete, or restrict use of your information. Contact us to exercise them.</p>
    <h2>Changes</h2>
    <p>We may update this policy. Material changes will be posted here with a new date.</p>
    <h2>Contact</h2>
    <p>Privacy questions: Team@Fathers.com, or PO Box 996, Tontitown, AR 72770.</p>
  </div>
</div></section>
''')

PAGES['security.html'] = dict(title='Security', desc='How Fathers.com protects your information.', active='', mode='public', body='''
<section class="legal"><div class="container" style="max-width:760px">
  <div class="eyebrow brass" style="margin-bottom:14px">LEGAL</div>
  <h1 class="d-48" style="margin-bottom:8px">Security</h1>
  <p class="fine" style="margin-bottom:8px">Last updated July 06, 2026</p>
  ''' + LEGAL_INTRO + '''
  <div class="legal-body">
    <h2>How we protect your data</h2>
    <p>Fathers.com is built on modern, access-controlled infrastructure. Your data is protected by row-level security, so your results and plan are visible only to you and to staff who need access to run the service.</p>
    <h2>Encryption</h2>
    <p>Data is encrypted in transit. Sign-in uses secure, passwordless links rather than stored passwords.</p>
    <h2>Sensitive data</h2>
    <p>Identity documents submitted for certificates are used only to verify you and are deleted after the certificate is issued. We minimize the sensitive data we hold.</p>
    <h2>Access controls</h2>
    <p>Access to member data is limited by role. Administrative access is restricted and logged.</p>
    <h2>Reporting a concern</h2>
    <p>If you believe you have found a security issue, contact Team@Fathers.com. We take reports seriously and will respond.</p>
  </div>
</div></section>
''')

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
      <div class="row" style="margin-bottom:18px"><span class="checkmark">&check;</span><b style="letter-spacing:.14em">VALID</b></div>
      <div class="stack-8">
        <div class="row between"><span class="fine">Recipient</span><b class="small" data-f="name"></b></div>
        <div class="row between"><span class="fine">Course</span><b class="small" data-f="course"></b></div>
        <div class="row between"><span class="fine">Hours</span><b class="small mono" data-f="hours"></b></div>
        <div class="row between"><span class="fine">Date</span><b class="small" data-f="date"></b></div>
        <div class="row between"><span class="fine">Serial</span><b class="small mono" data-f="serial"></b></div>
        <div class="row between"><span class="fine">Identity</span><b class="small">Verified at enrollment</b></div>
        <div class="row between"><span class="fine">Issuer</span><b class="small">National Center for Fathering</b></div>
      </div>
      <hr class="hr" style="margin:18px 0"><p class="small" style="margin-bottom:12px">This certificate was earned through logged hours, identity verification, and a proctored final. <a class="link" href="organizations.html">Issue these in your program &rarr;</a></p><a class="link ash" href="#" data-share="report" style="font-size:13px">Report a concern</a>
    </div>
    <div id="v-no" class="card" style="display:none;border-color:var(--error)">
      <b>NOT FOUND.</b><p class="small" style="margin-top:8px">Check the serial and try again.</p>
    </div>
    <p class="fine" style="margin-top:32px">Demo serials: FC-2026-004317 and FC-2026-001882. Production lookups read the certificates table. See supabase/schema.sql.</p>
  </div>
</div>
''')

# ================================================== veterans.html (P11)


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
    <div class="s"><div class="n">02</div><p class="small" style="margin-top:8px">He takes the twenty-minute baseline and gets a leave-fitted plan</p></div>
    <div class="s"><div class="n">03</div><p class="small" style="margin-top:8px">You see activation and completion. Never his answers.</p></div>
  </div>
  <h2 class="d-28" style="margin-bottom:24px">What's in the seat</h2>
  <div class="grid-2" style="max-width:760px">
    <div class="stack-8">
      <div class="check"><span class="checkmark">&check;</span><span class="small">Every film, class, and workbook, new releases monthly</span></div>
      <div class="check"><span class="checkmark">&check;</span><span class="small">The new-father track</span></div>
      <div class="check"><span class="checkmark">&check;</span><span class="small">The Daily</span></div>
    </div>
    <div class="stack-8">
      <div class="check"><span class="checkmark">&check;</span><span class="small">Audio for the commute</span></div>
      <div class="check"><span class="checkmark">&check;</span><span class="small">Spouse gift seat</span></div>
      <div class="check"><span class="checkmark">&check;</span><span class="small"><b class="bone">Aggregate reporting only.</b></span></div>
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
PAGES['login.html'] = dict(title='Sign in', desc='Sign in to Fathers.com to pick up your plan.', active='', mode='public', nochrome=True, body="""
<style>
.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px 20px}
.auth-wrap{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center}
.auth-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:26px}
.auth-brand img{height:30px;width:auto}
.auth-brand span{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--bone)}
.auth-card{width:100%;background:var(--coal);border:1px solid var(--hairline);border-radius:16px;padding:36px 32px;box-shadow:var(--shadow)}
.auth-title{font-family:var(--font-display);font-size:26px;font-weight:600;color:var(--bone);margin-bottom:6px;letter-spacing:-.01em}
.auth-sub{font-size:14px;color:var(--ash);margin-bottom:26px;line-height:1.5}
.auth-field{margin-bottom:18px}
.auth-field label{display:block;font-size:13px;font-weight:600;color:var(--bone);margin-bottom:8px}
.auth-label-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.auth-label-row label{margin-bottom:0}
.auth-forgot{background:none;border:0;padding:0;cursor:pointer;font-family:var(--font-ui);font-size:13px;color:var(--brass);font-weight:500}
.auth-forgot:hover{text-decoration:underline;text-underline-offset:2px}
.auth-btn{width:100%;margin-top:6px}
.auth-msg{font-size:13px;margin-top:12px;min-height:16px;line-height:1.4}
.auth-or{display:flex;align-items:center;gap:14px;margin:22px 0}
.auth-or::before,.auth-or::after{content:"";flex:1;height:1px;background:var(--hairline)}
.auth-or span{font-size:12px;color:var(--ash)}
.auth-alt{margin-top:24px;font-size:14px;color:var(--ash);text-align:center}
.auth-alt a{color:var(--bone);font-weight:500;text-decoration:underline;text-underline-offset:3px}
.auth-legal{margin-top:34px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center}
.auth-legal a{font-size:12px;color:var(--ash);text-decoration:none}
.auth-legal a:hover{color:var(--bone)}
.auth-legal span{font-size:12px;color:var(--hairline-strong)}
.auth-copy{margin-top:14px;font-size:11px;color:var(--ash);text-align:center;line-height:1.5;max-width:320px}
@media(max-width:480px){.auth-card{padding:28px 22px}}
</style>
<div class="auth-page"><div class="auth-wrap">
  <a class="auth-brand" href="index.html">
    <img class="lg-dark" src="assets/img/logomark-light.png" alt="Fathers.com">
    <img class="lg-light" src="assets/img/logomark-dark.png" alt="Fathers.com">
    <span>Fathers.com</span>
  </a>
  <div class="auth-card">
    <h1 class="auth-title">Sign in</h1>
    <p class="auth-sub">Welcome back. Pick up your plan where you left off.</p>
    <form id="authForm" novalidate>
      <div class="auth-field">
        <label for="authEmail">Email</label>
        <input id="authEmail" class="input" type="email" autocomplete="username" placeholder="you@example.com" required>
      </div>
      <div class="auth-field">
        <div class="auth-label-row"><label for="authPass">Password</label><button type="button" class="auth-forgot" id="authForgot">Forgot?</button></div>
        <input id="authPass" class="input" type="password" autocomplete="current-password" placeholder="Your password">
      </div>
      <button class="btn btn-primary auth-btn" id="authSignin" type="submit">Sign in</button>
      <p class="auth-msg" id="authMsg" role="status" aria-live="polite"></p>
    </form>
    <div class="auth-or"><span>or</span></div>
    <button class="btn btn-secondary auth-btn" id="authMagic" type="button">Email me a sign-in link</button>
  </div>
  <p class="auth-alt">New here? <a href="profile.html">Create an account</a></p>
  <div class="auth-legal">
    <a href="terms.html">Terms</a><span aria-hidden="true">&middot;</span>
    <a href="privacy.html">Privacy</a><span aria-hidden="true">&middot;</span>
    <a href="security.html">Security</a>
  </div>
  <p class="auth-copy">&copy; 2026 Fathers.com. A program of the National Center for Fathering.</p>
</div></div>
""")

# ================================================== enroll.html (certificate enrollment + coupon)
PAGES['enroll.html'] = dict(title='Enroll', desc='Enroll in a Fathers.com verified certificate.', active='Certificates', mode='app', body='''
<style>
.cpn-ok{color:var(--pine-hi)!important}
.cpn-err{color:var(--error)!important}
.enroll-code{display:flex;gap:10px;align-items:stretch}
.enroll-code .input{flex:1}
</style>
<section class="tight" style="padding-top:56px"><div class="container" style="max-width:1040px">
  <div id="enrollPanel">
    <a class="link ash" href="certificates.html" style="font-size:13px;display:inline-block;margin-bottom:20px">&larr; All certificates</a>
    <div style="display:grid;grid-template-columns:1.2fr .9fr;gap:48px;align-items:start" class="enroll-grid">
      <div>
        <div class="eyebrow brass" style="margin-bottom:14px">FATHERS.COM VERIFIED CERTIFICATE</div>
        <h1 class="d-36" style="margin-bottom:14px">Enroll in <span id="certTitle">this certificate</span></h1>
        <p class="lead" style="margin-bottom:30px">Court-ready proof that you did the work. Identity verified, hours logged, checkpoints passed, and a serial anyone can confirm.</p>
        <div class="eyebrow" style="margin-bottom:16px">WHAT EARNING IT REQUIRES</div>
        <div class="stack-16">
          <div class="check"><span class="checkmark">&check;</span><span class="small">Verify your identity once at enrollment. The ID is checked, then deleted.</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">Complete the instructional hours. Time on task is measured, not claimed.</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">Pass the checkpoints and a final assessment at eighty percent.</span></div>
          <div class="check"><span class="checkmark">&check;</span><span class="small">Receive a unique serial with a public verification page.</span></div>
        </div>
        <p class="fine" style="margin-top:24px">Have a program code from your church, group, or organization? Enter it in the box and your enrollment is free.</p>
      </div>
      <aside class="card" style="padding:28px">
        <div class="row between" style="margin-bottom:4px"><b id="certTitleSum">This certificate</b><b class="mono" id="priceLine">$79.00</b></div>
        <p class="small" style="margin-bottom:20px"><span id="certHours">10.0</span> verified instructional hours &middot; one-time</p>

        <div class="field" style="margin-bottom:6px"><label>Program code</label>
          <div class="enroll-code">
            <input class="input" id="couponInput" placeholder="Enter code" autocomplete="off" autocapitalize="none" spellcheck="false">
            <button class="btn btn-secondary" id="couponApply">Apply</button>
          </div>
        </div>
        <p class="fine" id="couponMsg" style="margin:0 0 16px;min-height:16px"></p>

        <hr class="hr" style="margin-bottom:14px">
        <div class="row between" id="discountLine" style="display:none;margin-bottom:8px"><span class="small">Program code</span><span class="mono small cpn-ok" id="discountAmt">&minus;$79.00</span></div>
        <div class="row between" style="margin-bottom:20px"><b>Total</b><b class="mono" id="totalLine">$79.00</b></div>

        <button class="btn btn-primary" id="enrollBtn" style="width:100%">Continue</button>
        <p class="fine" id="enrollNote" style="margin-top:14px">Card payment activates soon. Program-code enrollment is live now.</p>
      </aside>
    </div>
  </div>

  <div id="successPanel" style="display:none">
    <div class="center" style="max-width:620px;margin:40px auto">
      <span class="checkmark" style="width:56px;height:56px;font-size:26px;margin:0 auto 22px;display:inline-flex">&check;</span>
      <h1 class="d-36" style="margin-bottom:10px">You are enrolled.</h1>
      <p class="small" style="margin-bottom:36px">Your seat in <b class="bone" id="successTitle">this certificate</b> is saved. Your first step is to verify your identity, then begin the hours. Nothing expires, so start whenever you are ready.</p>
      <div class="row wrap" style="gap:14px;justify-content:center">
        <a class="btn btn-primary" id="beginBtn" href="class.html">Begin your certificate</a>
        <a class="btn btn-secondary" href="plan.html">Back to My Plan</a>
      </div>
    </div>
  </div>
</div></section>
<script src="assets/js/enroll.js"></script>
''')

# --- shared top for every veteran page: styles + always-present crisis strip ---
VET_TOP = '''<link rel="stylesheet" href="assets/css/veterans.css">
'''

# ================================================== veterans.html (front door)


# ================================================== veterans-hub.html


# ================================================== veterans-resources.html
PAGES['veterans-resources.html'] = dict(title='Free support for veterans', desc='Free, confidential support for veterans, service members, and their families. Vet Centers, the crisis line, Military OneSource, VA, and more.', active='For Veterans', mode='public', body=VET_TOP + '''
<section class="tight"><div class="container" style="max-width:820px">
  <div class="eyebrow brass" style="margin-bottom:12px">FREE AND CONFIDENTIAL</div>
  <h1 class="d-36" style="margin-bottom:16px">Support for veterans and their families</h1>
  <p class="lead">Every resource below is free, and none require you to be enrolled in anything to start. If you are in crisis, use the line at the top of this page.</p>
</div></section>
<section><div class="container">
  <div id="orgSupport" hidden class="card" style="padding:18px 22px;margin-bottom:14px">
    <div class="eyebrow" style="margin-bottom:6px">YOUR PROGRAM'S SUPPORT</div>
    <p class="small" id="orgSupportTxt" style="margin:0"></p>
  </div>
  <p class="fine" style="margin-bottom:14px">The resources below are United States services. Joined with a unit or program link? Your program's own support contacts appear above when provided.</p>
  <div id="vetAllResources"><p class="ash">Loading resources&hellip;</p></div>
</div></section>
<script src="assets/js/veterans-core.js"></script>
<script>
(function(){ if(!window.VET) return; var host=document.getElementById("vetAllResources"); if(!host) return;
var order=["vet_center","military_onesource","va_mh","samhsa","utr"];
var html=VET.resourceCardHTML(VET.CRISIS,{full:false});
html+=order.map(function(k){return VET.resourceCardHTML(VET.RESOURCES[k],{full:true});}).join("");
host.innerHTML=html; })();
</script>
''')

# ================================================== veterans-checkin.html
PAGES['veterans-checkin.html'] = dict(title='A private check-in', desc='A private, two-minute check-in that points you to the right support. Not a diagnosis.', active='For Veterans', mode='app', body=VET_TOP + '''
<section class="tight"><div class="container" style="max-width:760px">
  <div class="eyebrow brass" style="margin-bottom:12px">PRIVATE, ABOUT TWO MINUTES</div>
  <h1 class="d-36" style="margin-bottom:18px">A check-in, just for you</h1>
  <div id="vetCheckin"></div>
</div></section>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/veterans-checkin.js"></script>
''')

# ================================================== voice.html


# ================================================== veterans-module.html
PAGES['veterans-module.html'] = dict(title='A skill for returning fathers', desc='A short, plain lesson for returning fathers.', active='For Veterans', mode='public', body=VET_TOP + '''
<section class="tight"><div class="container" style="max-width:760px">
  <a class="link ash" href="veterans-hub.html" style="font-size:13px;display:inline-block;margin-bottom:20px">&larr; Your hub</a>
  <div id="vetModule"><p class="ash">Loading&hellip;</p></div>
  <div style="margin-top:36px"><a class="link" id="vetModuleNext" href="veterans-hub.html">Next &rarr;</a></div>
</div></section>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/veterans-modules.js"></script>
''')

# ================================================== veterans.html (front door, rebuilt)


# ================================================== veterans-hub.html (editorial hub, rebuilt)


PAGES['veterans-hub.html'] = dict(title='Your Veterans hub', desc='Your toolkit for coming home: films, Voice, a private check-in, and your plan. Built for fathers who served.', active='For Veterans', mode='app', body=VET_TOP + '''
<section class="vet-hero" style="min-height:420px">
  <img class="vet-hero-img" src="assets/img/photos/community-01.jpg" alt="">
  <div class="vet-hero-inner">
    <div class="vet-hero-eyebrow">Fathers.com &middot; For those who served</div>
    <h1>Your toolkit for the homefront.</h1>
    <p class="vet-hero-lead" id="vetGreet">You carried the load out there. Here is where you pick up the one that matters most.</p>
  </div>
</section>

<section class="vet-ed vet-ed-noline" style="padding-top:8px">
  <div class="vet-ed-head">
    <div id="orgSupport" hidden class="card" style="padding:18px 22px">
      <div class="vet-ed-eyebrow" style="margin-bottom:6px">YOUR PROGRAM'S SUPPORT</div>
      <p class="small" id="orgSupportTxt" style="margin:0"></p>
    </div>
  </div>
</section>

<section class="vet-ed vet-ed-noline">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">The field guide</div>
    <h2>Skills for the homefront</h2>
    <p>Short, plain films and reads on what gets hard when you walk back through the door. Built from what other fathers who served said they needed most.</p>
  </div>
  <div class="vet-stories">
    <a class="vet-story" href="veterans-module.html?m=reconnecting"><img src="assets/img/photos/hero-01.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">6 min</div><h3>When your kid feels like a stranger</h3><p>Rebuilding closeness after time away</p></div></a>
    <a class="vet-story" href="veterans-module.html?m=temper"><img src="assets/img/photos/hero-02.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">6 min</div><h3>Staying steady, and the way back</h3><p>Anger, the pause, and the repair</p></div></a>
    <a class="vet-story" href="veterans-module.html?m=emotion"><img src="assets/img/photos/hero-03.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">5 min</div><h3>Saying what you feel</h3><p>Breaking through the numbness</p></div></a>
    <a class="vet-story" href="veterans-module.html?m=command"><img src="assets/img/photos/hero-04.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">5 min</div><h3>From command to connection</h3><p>Leading a family is a different job</p></div></a>
    <a class="vet-story" href="veterans-module.html?m=coparenting"><img src="assets/img/photos/hero-05.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">5 min</div><h3>Fathering across two homes</h3><p>Presence when you are not the only house</p></div></a>
    <a class="vet-story" href="veterans-module.html?m=nurturing"><img src="assets/img/photos/hero-06.jpg" alt=""><div class="vet-story-body"><div class="vet-story-min">4 min</div><h3>Small acts, every day</h3><p>Nurturing is a set of habits</p></div></a>
  </div>
</section>

<section class="vet-ed">
  <div class="vet-split">
    <div>
      <div class="vet-ed-eyebrow">A new way to be there &middot; Voice</div>
      <h2>Your voice, in their day.</h2>
      <p>Record a story or a message your kids can replay when they miss you. Private to you, secured, and yours alone. It is the most personal tool here, and it has its own home.</p>
      <a class="btn btn-yellow" href="voice.html">Open Voice</a>
    </div>
    <img class="vet-split-img" src="assets/img/photos/hero-07.jpg" alt="">
  </div>
</section>

<section class="vet-ed">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">Your plan</div>
    <h2>Know your ground, and check it</h2>
    <p>Two private tools that meet you where you are and point you forward. Yours alone, never shared.</p>
  </div>
  <div class="grid-2" style="gap:24px">
    <div class="card" style="padding:28px">
      <b class="bone" style="font-family:var(--font-display);font-size:20px">Your baseline</b>
      <p class="small" style="margin:10px 0 18px">The Keystone Profile shows your real strengths and the one place growth pays off most, then builds a plan around it.</p>
      <a class="btn btn-secondary" href="profile.html">Take your baseline</a>
    </div>
    <div class="card" style="padding:28px">
      <b class="bone" style="font-family:var(--font-display);font-size:20px">A private check-in</b>
      <p class="small" style="margin:10px 0 18px">Two quiet minutes, just for you. It is not a diagnosis. It points you to the right kind of support only if you want it.</p>
      <a class="btn btn-secondary" href="veterans-checkin.html">Take the check-in</a>
    </div>
  </div>
</section>

<section class="vet-ed">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">In the works</div>
    <h2>The toolkit is growing</h2>
    <p>More is coming, built alongside fathers who served. Here is what is next on the bench.</p>
  </div>
  <div class="vet-soon-grid">
    <div class="vet-soon"><span class="vet-soon-tag">Coming soon</span><h3>Battle buddy check-ins</h3><p>Pair with another father who gets it, and keep each other honest week to week.</p></div>
    <div class="vet-soon"><span class="vet-soon-tag">Coming soon</span><h3>The first 90 days home</h3><p>A guided plan for the hardest stretch of the return, one small move at a time.</p></div>
    <div class="vet-soon"><span class="vet-soon-tag">Coming soon</span><h3>For the ones who wait</h3><p>Tools built for your partner and your kids, so the whole house comes home together.</p></div>
  </div>
</section>

<section style="max-width:1200px;margin:0 auto;padding:24px">
  <div class="vet-brother">
    <img class="vet-brother-img" src="assets/img/photos/community-02.jpg" alt="">
    <div class="vet-brother-inner">
      <h2>You are not the first one home.</h2>
      <p>Thousands of men have walked back through that door and had to learn how to be a father all over again. You are joining their ranks, not starting from nothing.</p>
    </div>
  </div>
</section>

<section class="vet-quote">
  <blockquote>&ldquo;I could lead a platoon, but I could not get my own kid to talk to me. Learning that was its own kind of training.&rdquo;</blockquote>
  <div class="vet-quote-by"><img src="assets/img/photos/testimonial-01.jpg" alt=""><span>A father, three deployments</span></div>
</section>

<section class="vet-ed">
  <div class="vet-supportline">
    <div class="vet-supportline-main">
      <div class="vet-supportline-lbl">Support, if you need it</div>
      <p>You know these resources, and they are here when you want them. The closest fit for you is <b id="vetMatchName">the Vet Center</b>. In a crisis, call 988 and press 1.</p>
    </div>
    <div class="vet-supportline-actions">
      <a class="btn btn-secondary btn-sm" id="vetMatchCall" href="tel:18779278387">Call</a>
      <a class="link" href="veterans-resources.html">See all support &rarr;</a>
    </div>
  </div>
</section>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/veterans-hub.js"></script>
''')

# ================================================== veterans.html (public: pitch + free films)
PAGES['veterans.html'] = dict(title='Present at Home', desc='For fathers who served. Coming all the way home to your kids, on your terms. Three free films, then join for the rest.', active='For Veterans', mode='public', body=VET_TOP + '''
<section class="vet-hero">
  <img class="vet-hero-img" src="assets/img/photos/billboard-home.jpg" alt="">
  <div class="vet-hero-inner">
    <div class="vet-hero-eyebrow">Fathers.com &middot; For those who served</div>
    <h1>The next mission is the one at home.</h1>
    <p class="vet-hero-lead">You did the hard thing over there. Coming all the way home to your kids is its own kind of hard, and nobody hands you orders for it. Start with three films, free. No account, no email.</p>
    <div class="vet-hero-actions">
      <a class="btn btn-yellow" href="#watch">Watch, free</a>
      <a class="btn btn-onimg" href="veterans-resources.html">See the free support</a>
    </div>
  </div>
</section>

<section class="vet-ed vet-ed-noline" id="watch">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">Watch, free</div>
    <h2>Three films. Start with the one that hits home.</h2>
    <p>Short, honest lessons from fathers who came home and had to learn this. Watch all three, no account needed.</p>
  </div>
  <div class="vet-films">
    <button class="vet-film" data-key="reconnecting" data-title="When your kid feels like a stranger">
      <div class="vet-film-thumb"><img src="assets/img/photos/hero-01.jpg" alt=""><span class="vet-film-play"></span><span class="vet-film-dur">Watch</span></div>
      <div class="vet-film-meta"><h3>When your kid feels like a stranger</h3><p>Rebuilding closeness after time away</p></div>
    </button>
    <button class="vet-film" data-key="emotion" data-title="Saying what you feel">
      <div class="vet-film-thumb"><img src="assets/img/photos/hero-03.jpg" alt=""><span class="vet-film-play"></span><span class="vet-film-dur">Watch</span></div>
      <div class="vet-film-meta"><h3>Saying what you feel</h3><p>Breaking through the numbness, out loud</p></div>
    </button>
    <button class="vet-film" data-key="temper" data-title="Staying steady, and the way back">
      <div class="vet-film-thumb"><img src="assets/img/photos/hero-02.jpg" alt=""><span class="vet-film-play"></span><span class="vet-film-dur">Watch</span></div>
      <div class="vet-film-meta"><h3>Staying steady, and the way back</h3><p>Anger, the pause, and the repair</p></div>
    </button>
  </div>
  <div class="vet-lock">
    <div>
      <div class="eyebrow brass" style="margin-bottom:8px">The rest of the field guide</div>
      <b class="bone" style="font-size:18px">This is three of more than a dozen.</b>
      <p class="small" style="margin-top:6px">Join free to unlock every film and lesson, save your progress, and record your voice for your kids. No cost, ever, for those who served.</p>
    </div>
    <a class="btn btn-yellow" href="login.html?next=veterans-start.html">Join free</a>
  </div>
  <p class="fine" style="margin-top:18px">Already a member? <a class="link" href="veterans-hub.html">Go to your hub &rarr;</a></p>
</section>

<section class="vet-ed">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">What you get when you join</div>
    <h2>Everything a man needs to come all the way home.</h2>
  </div>
  <div class="grid-4" style="gap:28px">
    <div><b class="bone" style="font-size:16px">The full field guide</b><p class="small" style="margin-top:8px">Every film and read on what gets hard when you walk back through the door.</p></div>
    <div><b class="bone" style="font-size:16px">The Legacy Archive</b><p class="small" style="margin-top:8px">Guided prompts, recorded in your voice, titled and kept for your kids: bedtime, milestones, the hard days, your story.</p></div>
    <div><b class="bone" style="font-size:16px">Support matched to you</b><p class="small" style="margin-top:8px">The one free service built for your situation, with the number and what to expect.</p></div>
    <div><b class="bone" style="font-size:16px">A private check-in</b><p class="small" style="margin-top:8px">Two minutes, just for you. Not a diagnosis. It points you to help if you want it.</p></div>
  </div>
</section>

<section class="vet-ed" id="routine">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">SERVE. RETURN. REPEAT.</div>
    <h2>Coming home is not one day. It is a skill you will use again.</h2>
    <p>Some fathers come home once. Many come home again and again, with the next call-up already on the calendar. The temptation is to keep a little distance so the next goodbye hurts less. Your kids cannot afford that math. Get close anyway. This is the routine that makes it possible.</p>
  </div>
  <div class="grid-3" style="margin-top:26px">
    <div class="card" style="padding:26px"><div class="eyebrow" style="margin-bottom:10px">BEFORE YOU GO</div><p class="small" style="color:var(--ash)">Record three things in the Legacy Archive: why you go, what you promise, and one to play when they miss you. Brief each kid in one sentence they can repeat. Ten minutes, total. <a class="link" href="voice.html">Record now &rarr;</a></p></div>
    <div class="card" style="padding:26px"><div class="eyebrow" style="margin-bottom:10px">WHILE YOU ARE AWAY</div><p class="small" style="color:var(--ash)">One voice note beats zero phone calls. Away-night prompts are ready for when you have two minutes and no words. She is holding the line at home; ask her for one thing you can own from a distance. <a class="link" href="voice.html">The prompts &rarr;</a></p></div>
    <div class="card" style="padding:26px"><div class="eyebrow" style="margin-bottom:10px">THE FIRST 72 HOURS HOME</div><p class="small" style="color:var(--ash)">Re-entry is a handoff, not a takeover. Take the private check-in, protect one evening at the table, and give each kid ten minutes alone with you. Expect the little ones to test you on day two. That is attachment, not disrespect. <a class="link" href="veterans-checkin.html">The check-in &rarr;</a></p></div>
  </div>
  <p class="fine" style="margin-top:18px">Between returns, your plan keeps one small move in front of you. And when the next call comes, the archive means your voice stays home even when you cannot.</p>
</section>

<section class="vet-ed">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">For units and programs</div>
    <h2>Bringing your whole unit?</h2>
    <p>One join link enrolls every man under your cohort: the assessment, the three courses (presence, steadiness, coming home), the ninety-day plan, and the Legacy Voice Archive. Leadership sees cohort movement, never a man&rsquo;s private answers. <a class="link" href="organizations.html">For Organizations &rarr;</a></p>
  </div>
</section>

<div class="vet-support">
  <span>Support is standing by 24 hours a day, for you or your family. You do not have to be in crisis to call.</span>
  <a href="tel:988">Call 988, press 1</a>
</div>

<div id="vetVideoModal" class="vet-vmodal" hidden>
  <div class="vet-vmodal-backdrop" data-vclose></div>
  <div class="vet-vmodal-inner">
    <button class="vet-vmodal-x" data-vclose aria-label="Close">&times;</button>
    <div id="vetVideoStage"></div>
    <div class="vet-vmodal-cap"><b id="vetVideoTitle"></b><a class="btn btn-yellow btn-sm" href="login.html?next=veterans-start.html">Join free for the rest</a></div>
  </div>
</div>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/veterans-video.js"></script>
''')

# ================================================== veterans-start.html (identify, after joining)
PAGES['veterans-start.html'] = dict(title='Set up your hub', desc='Tell us where you are so we can point you to what fits.', active='For Veterans', mode='app', body=VET_TOP + '''
<section class="vet-ed vet-ed-noline" style="padding-top:56px;max-width:720px">
  <div class="vet-ed-head">
    <div class="vet-ed-eyebrow">Welcome in</div>
    <h2>Let us set up your hub.</h2>
    <p>Two quick taps so we can point you to what fits. This is saved to your account.</p>
  </div>
  <div id="vetStartLoading" class="ash" style="padding:20px 0">One moment&hellip;</div>
  <div id="vetOnboard" hidden>
    <div class="vet-step" data-step="1">
      <button class="vet-opt" data-ctx="active"><span>I am serving now, active, Guard, or Reserve</span></button>
      <button class="vet-opt" data-ctx="veteran"><span>I am a veteran</span></button>
      <button class="vet-opt" data-ctx="family"><span>I am a military family member</span></button>
    </div>
    <div class="vet-step" data-step="2" hidden>
      <p class="lead" style="margin-bottom:26px">A little context. Optional, and it sharpens the match. Skip any time.</p>
      <div class="vet-field" data-combat>
        <div class="eyebrow">DID YOU SERVE IN A COMBAT ZONE?</div>
        <div class="row" style="gap:10px"><button class="chip" data-val="yes" aria-pressed="false">Yes</button><button class="chip" data-val="no" aria-pressed="false">No</button></div>
      </div>
      <div class="vet-field" data-sep-block hidden>
        <div class="eyebrow">HOW LONG SINCE YOU SEPARATED?</div>
        <div class="row" style="gap:10px" data-sep><button class="chip" data-val="recent" aria-pressed="false">Within the last year</button><button class="chip" data-val="past" aria-pressed="false">More than a year ago</button></div>
      </div>
      <div class="vet-field" data-kids>
        <div class="eyebrow">YOUR KIDS&rsquo; AGES (TAP ANY)</div>
        <div class="row wrap" style="gap:10px"><button class="chip" data-band="0-5" aria-pressed="false">0 to 5</button><button class="chip" data-band="6-12" aria-pressed="false">6 to 12</button><button class="chip" data-band="13-18" aria-pressed="false">13 to 18</button><button class="chip" data-band="grown" aria-pressed="false">Grown</button></div>
      </div>
      <div class="row wrap" style="gap:14px;margin-top:12px">
        <button class="btn btn-primary" id="vetContinue">Go to my hub</button>
        <a class="link ash" href="#" data-skip style="align-self:center">Skip</a>
      </div>
    </div>
  </div>
</section>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/veterans-start.js"></script>
''')

PAGES['voice.html'] = dict(title='Voice', desc='Record your voice for your kids. A story or a message they can replay, private to you and secure.', active='For Veterans', mode='app', body=VET_TOP + '''
<section class="voice-hero">
  <img class="voice-hero-img" src="assets/img/photos/billboard-stories.jpg" alt="">
  <div class="voice-hero-inner">
    <div class="voice-hero-eyebrow">Fathers.com &middot; Voice</div>
    <h1>Be there, even when you can&rsquo;t be.</h1>
    <p class="voice-hero-lead">Record your voice for your kids. A bedtime story, a word before a game, something they can play on the nights you are away. A simple thing that does something deep.</p>
    <a class="btn btn-yellow" href="#record">Start recording</a>
  </div>
</section>

<section class="voice-ed voice-ed-first">
  <div class="voice-ed-head">
    <div class="eyebrow brass">What it is</div>
    <h2>A child holds onto a parent through their voice.</h2>
    <p>When a father is away, at work, on deployment, or living across two homes, a recording of his voice keeps him in the room. Kids do not need a perfect performance. They need the familiar sound of you, on repeat, on their schedule. It is the same idea behind the reading programs that have kept military families close for decades, made simple and put in your hands.</p>
  </div>
</section>

<section class="voice-ed">
  <div class="voice-ed-head">
    <div class="eyebrow brass">How it works</div>
    <h2>Three steps. Two minutes.</h2>
  </div>
  <div class="voice-steps">
    <div class="voice-step"><span class="voice-step-n">1</span><h3>Record</h3><p>Read a story or say what is on your heart, right here in your browser. No app to install.</p></div>
    <div class="voice-step"><span class="voice-step-n">2</span><h3>It is kept safe</h3><p>Saved privately to your account. Encrypted on the way, locked once it lands.</p></div>
    <div class="voice-step"><span class="voice-step-n">3</span><h3>They replay it</h3><p>Your child hears you any time they miss you, as many times as they want.</p></div>
  </div>
</section>

<section class="voice-ed">
  <div class="voice-secure">
    <div class="voice-secure-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
    <div class="voice-secure-body">
      <div class="eyebrow brass">Private and secure</div>
      <h2>Your voice stays yours.</h2>
      <p>Every recording is tied to your account and no one else&rsquo;s. It travels encrypted, is stored in a locked, per-person vault, is never sold or shared, and is yours to delete the moment you want it gone. This is a place you can trust with the private things a father says to his kids.</p>
    </div>
  </div>
</section>

<section class="voice-ed" id="record">
  <div class="voice-ed-head">
    <div class="eyebrow brass">Record</div>
    <h2>Your studio.</h2>
    <p>Pick what kind of recording, then hit record. Take your time. You can re-record as many times as you like before you save.</p>
  </div>
  <div style="margin-top:28px">
    <div class="voice-prompts">
      <div class="voice-prompts-lbl">The Legacy Archive. Pick a prompt, or say your own thing:</div>
      <div id="promptPicker"></div>
      <p class="fine" id="promptCurrent" hidden style="margin-top:10px"></p>
    </div>
    <div id="voiceApp">
      <div class="voice-types" data-voice-types>
        <button class="chip is-on" data-kind="bedtime_story" aria-pressed="true">Bedtime story</button>
        <button class="chip" data-kind="message" aria-pressed="false">A message</button>
        <button class="chip" data-kind="thinking" aria-pressed="false">Thinking of you</button>
      </div>
      <div class="voice-stage">
        <div id="voiceTimer" class="voice-timer">0:00</div>
        <div class="voice-controls">
          <button class="btn btn-primary" id="voiceRec">Start recording</button>
          <button class="btn btn-secondary" id="voiceStop" hidden>Stop</button>
        </div>
        <audio id="voicePreview" controls hidden style="width:100%;margin-top:18px"></audio>
        <div class="row" id="voiceAfter" hidden style="gap:12px;justify-content:center;margin-top:18px">
          <button class="btn btn-secondary btn-sm" id="voiceRedo">Record again</button>
          <button class="btn btn-primary btn-sm" id="voiceSave">Save it</button>
        </div>
        <p class="fine" id="voiceMsg" style="margin-top:14px;min-height:16px"></p>
        <div class="voice-secure-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Encrypted &middot; Private to you &middot; Never shared</span></div>
      </div>
      <div id="voiceList"></div>
    </div>
    <p class="fine" style="margin-top:20px">Saving keeps your recordings across devices and requires a free sign-in. Nothing is shared without you.</p>
  </div>
</section>
<script src="assets/js/veterans-core.js"></script>
<script src="assets/js/voice-prompts.js"></script>
<script src="assets/js/voice.js"></script>
''')

PAGES['course.html'] = dict(title='Your Certificate', desc='Watch the lessons, pass each Checkpoint, answer the final Q&A, and submit for approval.', active='Certificates', mode='app', auth=True, body='''
<section class="cw-wrap" id="cw-root">
  <div class="cw-head">
    <a class="link ash" href="certificates.html" style="display:inline-block;margin-bottom:16px">&larr; All certificates</a>
    <div class="eyebrow brass">FATHERS.COM VERIFIED CERTIFICATE</div>
    <h1 class="d-36" id="cw-title" style="margin-top:8px">Your certificate</h1>
  </div>
  <div id="cw-note"></div>
  <div id="cw-stage"><p class="ash">Loading\u2026</p></div>
</section>
<script src="assets/js/coursework.js"></script>
''')

# ================================================== find-a-program.html
PAGES['find-a-program.html'] = dict(title='Find a fatherhood program that works', desc='Tell us the situation and we will point you to a program that fits. Every listed program runs on one published standard.', active='Find a Program', mode='public', body='''
<header class="hero"><div class="container" style="max-width:820px">
  <div class="eyebrow" style="margin-bottom:18px">FIND A PROGRAM</div>
  <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">Find a fatherhood program that works.</h1>
  <p class="lead" style="margin:22px 0 8px">Not every father starts with us, and he should not have to guess. Tell us the situation and where you are. We will point you to a program that fits, whether it is ours or someone else's.</p>
</div></header>

<section class="band tight"><div class="container" style="max-width:820px">
  <form class="stack-16" data-lead="find-a-program" data-done="Got it. A real person will reply with a program that fits.">
    <div><label class="small" for="fap-sit">What is the situation?</label>
      <select class="input" id="fap-sit" name="situation" required>
        <option value="" disabled selected>Choose one</option>
        <option>New dad</option>
        <option>Fathering after divorce</option>
        <option>Back from deployment</option>
        <option>After incarceration</option>
        <option>Stepfather</option>
        <option>Mentoring other fathers</option>
        <option>Something else</option>
      </select></div>
    <div><label class="small" for="fap-city">City or region</label>
      <input class="input" id="fap-city" name="city" placeholder="e.g. Springdale, AR"></div>
    <div><label class="small" for="fap-email">Email for the reply</label>
      <input class="input" id="fap-email" name="email" type="email" required placeholder="Email address"></div>
    <div><button class="btn btn-primary">Find a program</button></div>
    <p class="fine">Free. A real person replies. We never share your information.</p>
  </form>
</div></section>

<section><div class="container split">
  <div>
    <h2 class="d-36" style="font-size:32px">How we rate programs.</h2>
    <p style="color:var(--ash);margin:16px 0 26px;max-width:52ch">One published standard, measured on the same four dimensions we measure fathers on: involvement, consistency, awareness, nurturance. Every program listed here runs on the Keystone Standard: the same instrument, the same norms, the same report. Public ratings publish with the first rated cohort.</p>
    <p style="color:var(--ash);margin:0 0 26px"><a class="link" href="organizations.html#walkthrough">Run a program? Get on the Standard, and in line for the first cohort &rarr;</a></p>
    <p class="fine">The directory is young. While it grows, requests are routed by hand by our team.</p>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">RUN A PROGRAM?</div>
    <h3 style="margin-bottom:10px">Get rated. Get found.</h3>
    <p class="small" style="color:var(--ash);margin-bottom:20px">Put your program on the standard, prove it works, and let fathers and funders find you.</p>
    <form class="row" data-lead="get-rated" data-done="Thank you. We will reach out about the rating process."><input class="input" name="email" type="email" required placeholder="Work email"><button class="btn btn-secondary btn-sm">Start</button></form>
  </div>
</div></section>
''')

# ================================================== organizations.html
PAGES['organizations.html'] = dict(title='The measurable standard for effective fathering programs', desc='Assess your fatherhood program against the Keystone norm. Prove it works with the Efficacy Report. No program yet? Deploy ours in a day.', active='For Organizations', mode='public', body='''
<header class="hero"><div class="container" style="max-width:920px">
  <div class="eyebrow" style="margin-bottom:18px">FOR ORGANIZATIONS</div>
  <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">The measurable standard for effective fathering programs.</h1>
  <p class="lead" style="margin:22px 0 8px">Every program says it works. The Keystone Standard is how you prove it: a validated instrument normed on 9,232 fathers, measured at baseline and exit, printed in the report your funder, your court, or your command already asks for. Run your program on it. And if you have no program, deploy ours in a day.</p>
</div></header>

<section class="band tight"><div class="container split">
  <div>
    <div class="eyebrow brass" style="margin-bottom:14px">AVAILABLE NOW</div>
    <h2 class="d-36" style="font-size:32px">The Efficacy Report.</h2>
    <p style="color:var(--ash);margin:16px 0 18px;max-width:52ch">One page per cohort: how many fathers started, how many finished, where they began on the four dimensions, where they ended, and the movement in between, benchmarked against the national norm. Individual fathers are never shown. Aggregates only.</p>
    <p style="color:var(--ash);margin:0 0 26px;max-width:52ch">This is the document that turns a grant renewal from a story into a number.</p>
    <div class="row wrap"><a class="btn btn-primary" href="efficacy-report.html?demo=1">See a sample report</a><a class="btn btn-secondary" href="#walkthrough">Request yours</a></div>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">WHAT A FUNDER SEES</div>
    <div class="stack-16">
      <div class="check"><span class="checkmark">&check;</span><span>Baseline and exit scores on the four Keystone dimensions</span></div>
      <div class="check"><span class="checkmark">&check;</span><span>Cohort movement, benchmarked against 9,232 fathers</span></div>
      <div class="check"><span class="checkmark">&check;</span><span>Completion rates that hold up to an auditor</span></div>
      <div class="check"><span class="checkmark">&check;</span><span>Outcome overlays when your agency links its data</span></div>
    </div>
  </div>
</div></section>

<section><div class="container">
  <h2 class="d-28" style="margin-bottom:8px">Outcome overlays: the same spine, in the language you answer to.</h2>
  <p style="color:var(--ash);margin:0 0 32px;max-width:62ch">Movement is what we measure. Outcomes are what you are accountable for. When the responsible agency links its outcome records to your cohorts through the secure intake, the overlay switches on. Until then, the report says so honestly.</p>
  <div class="grid-3">
    <div class="card" style="padding:28px"><div class="eyebrow brass" style="margin-bottom:12px">CORRECTIONS &amp; REENTRY</div><h3 style="margin-bottom:8px">The Recidivism Overlay</h3><p class="small" style="color:var(--ash)">Keystone movement set against reoffense records, completers versus non-completers, per cohort. The number a reentry grant lives or dies on.</p></div>
    <div class="card" style="padding:28px"><div class="eyebrow brass" style="margin-bottom:12px">CHILD SUPPORT</div><h3 style="margin-bottom:8px">The Collection Overlay</h3><p class="small" style="color:var(--ash)">Engagement set against payment compliance. Engaged fathers pay. Show the connection in your own caseload.</p></div>
    <div class="card" style="padding:28px"><div class="eyebrow brass" style="margin-bottom:12px">VETERAN &amp; MILITARY</div><h3 style="margin-bottom:8px">The Readiness Overlay</h3><p class="small" style="color:var(--ash)">Engagement set against retention and family stability, with the Legacy Voice Archive built into the track. Cohorts persist across repeated mobilizations; movement accumulates call-up after call-up.</p></div>
  </div>
</div></section>

<section class="band tight"><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:14px">FOR COURTS AND PROBATION</div>
    <h2 class="d-28" style="margin-bottom:8px">Order the class by name. Verify in ten seconds.</h2>
    <p style="color:var(--ash);max-width:52ch">Coming Home Present and Steady Under Pressure are built for referral: identity checked at enrollment, hours logged not claimed, a final at eighty percent. Completion is confirmed at fathers.com/verify with the serial on the document. No account, no phone call, no paperwork chase.</p>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">FOR THE MAN YOU REFER</div>
    <p class="small" style="color:var(--ash)">He starts free with the Keystone Profile, trains the class you name, and leaves with a document that opens doors instead of a checkbox that closes them.</p>
  </div>
</div></section>

<section class="band tight"><div class="container">
  <h2 class="d-28" style="margin-bottom:8px">No fatherhood program yet? The floor is never nothing.</h2>
  <p style="color:var(--ash);margin:0 0 32px;max-width:60ch">You already intake fathers. Start measuring today and switch the rest on when you are ready.</p>
  <div class="grid-3">
    <div class="card" style="padding:28px"><div class="eyebrow" style="margin-bottom:12px">STEP ONE</div><h3 style="margin-bottom:8px">Measure at the door.</h3><p class="small" style="color:var(--ash)">Run the Keystone Profile at intake. A validated engagement baseline on every man, zero program required.</p></div>
    <div class="card" style="padding:28px"><div class="eyebrow" style="margin-bottom:12px">STEP TWO</div><h3 style="margin-bottom:8px">Route to what works.</h3><p class="small" style="color:var(--ash)">Each profile points to the rated program that fits him. We become your diagnostic and referral layer.</p></div>
    <div class="card" style="padding:28px"><div class="eyebrow" style="margin-bottom:12px">STEP THREE</div><h3 style="margin-bottom:8px">Deploy ours in a day.</h3><p class="small" style="color:var(--ash)">The assessment, three courses (presence, steadiness, coming home), the ninety-day plan, the certificate. Switched on, not built.</p></div>
  </div>
</div></section>

<section><div class="container split">
  <div>
    <div class="eyebrow" style="margin-bottom:14px">DEPLOY AT SCALE</div>
    <h2 class="d-36" style="font-size:32px">One join link. Every man tagged to your cohort.</h2>
    <p style="color:var(--ash);margin:16px 0 18px;max-width:52ch">A unit, a facility, a caseload, a congregation: share one link and every father who enters it is assessed under your organization, program, and cohort. The report builds itself as they move. Leadership sees cohort movement, never a man&rsquo;s private answers.</p>
    <p style="color:var(--ash);max-width:52ch">Bringing a whole force? The veteran track ships complete: assessment, the three courses, the plan, and the Legacy Voice Archive with guided prompts a father records for his children.</p>
  </div>
  <div class="card" style="padding:32px" id="walkthrough">
    <div class="eyebrow" style="margin-bottom:16px">REQUEST A WALKTHROUGH</div>
    <p class="small" style="color:var(--ash);margin-bottom:20px">Twenty minutes. Your program, your funder&rsquo;s report, live. We will set up your join link on the call.</p>
    <form class="stack-16" data-lead="org-inquiry" data-done="Received. We will reach out to schedule your walkthrough.">
      <input class="input" name="org" required placeholder="Organization name">
      <input class="input" name="email" type="email" required placeholder="Work email">
      <button class="btn btn-primary">Request a walkthrough</button>
    </form>
    <p class="fine" style="margin-top:14px">Already on the standard? <a class="link ash" href="efficacy-report.html">Open your Efficacy Report</a>.</p>
  </div>
</div></section>

<section class="tight"><div class="container" style="text-align:center">
  <p style="font-family:var(--font-display);font-size:24px">Measure your men. Train them on the Standard. Prove it to anyone.</p>
</div></section>

<section class="band tight"><div class="container">
  <div class="row wrap" style="gap:14px;align-items:center">
    <span class="small" style="color:var(--ash)">Also built for:</span>
    <a class="btn btn-secondary btn-sm" href="groups.html">Groups &amp; Circles</a>
    <a class="btn btn-secondary btn-sm" href="veterans.html">Veteran Programs</a>
    <a class="btn btn-secondary btn-sm" href="employers.html">Employers</a>
    <a class="btn btn-secondary btn-sm" href="find-a-program.html">Get your program rated</a>
  </div>
</div></section>
''')

# ================================================== gatherings.html
PAGES['gatherings.html'] = dict(title='Gatherings', desc='Fathers, in real life. Events that bring men, mentors, and the people who lead them into the same room.', active='Gatherings', mode='public', body='''
<header class="hero"><div class="container" style="max-width:820px">
  <div class="eyebrow" style="margin-bottom:18px">GATHERINGS</div>
  <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">Fathers, in real life.</h1>
  <p class="lead" style="margin:22px 0 8px">Where the Standard meets in person. Presence is not only trained on a screen. We gather fathers, mentors, and the people who lead them, to learn, to be sharpened, and to stand together.</p>
</div></header>

<section class="band tight"><div class="container split">
  <div>
    <h2 class="d-28">Be first to know.</h2>
    <p class="small" style="color:var(--ash);margin-top:10px;max-width:44ch">We are starting with one or two flagship gatherings. Tell us where you are and we will tell you when one is near you.</p>
  </div>
  <div>
    <form class="stack-16" data-lead="gatherings" data-done="You are on the list. We will tell you when a gathering is near you.">
      <input class="input" name="city" placeholder="City or region">
      <input class="input" name="email" type="email" required placeholder="Email address">
      <button class="btn btn-primary">Notify me</button>
    </form>
    <p class="fine" style="margin-top:12px">Want to bring a gathering to your church, base, or city? Same form. Say so when we reply.</p>
  </div>
</div></section>
''')

# ================================================== about.html
PAGES['about.html'] = dict(title='About the National Center for Fathering', desc='NCF measures fathers, certifies their growth, rates the programs that serve them, and convenes the field.', active='', mode='public', body='''
<header class="hero"><div class="container" style="max-width:860px">
  <div class="eyebrow" style="margin-bottom:18px">ABOUT NCF</div>
  <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">The trusted third party for fatherhood.</h1>
  <p class="lead" style="margin:22px 0 8px">The National Center for Fathering measures fathers, certifies their growth, rates the programs that serve them, and convenes the field. We author nothing we sell, which is exactly what lets us hold one standard for everyone, including ourselves.</p>
</div></header>

<section class="band tight"><div class="container split">
  <div>
    <h2 class="d-36" style="font-size:32px">Built on three decades of research.</h2>
    <p style="color:var(--ash);margin:16px 0 18px;max-width:52ch">NCF was founded by Dr. Ken Canfield, whose research and books on fathering have guided a generation of men. The Keystone Father Profile grows directly out of that work: four dimensions, normed on 9,232 fathers, made practical.</p>
    <p style="color:var(--ash);max-width:52ch">Fathers.com is the home of that standard: the free Profile for any father, the classes to grow it, the Verified Certificate that proves the work, and the reporting that shows programs, funders, and agencies whether fathers are changing.</p>
  </div>
  <div class="card" style="padding:32px">
    <div class="eyebrow" style="margin-bottom:16px">WHAT WE DO</div>
    <div class="stack-16">
      <div class="check"><span class="checkmark">&check;</span><span><b>Measure.</b> The Keystone Profile, free for every father.</span></div>
      <div class="check"><span class="checkmark">&check;</span><span><b>Certify.</b> Verified, court-checkable proof of the work.</span></div>
      <div class="check"><span class="checkmark">&check;</span><span><b>Rate.</b> One published standard for whether programs work.</span></div>
      <div class="check"><span class="checkmark">&check;</span><span><b>Convene.</b> Gatherings that bring the field into one room.</span></div>
    </div>
  </div>
</div></section>

<section><div class="container" style="max-width:820px">
  <p class="small" style="color:var(--ash)">Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit. PO Box 996, Tontitown, AR 72770. <a class="link" href="mailto:Team@Fathers.com">Team@Fathers.com</a></p>
</div></section>
''')

# ================================================== research.html
PAGES['research.html'] = dict(title='The research behind the Keystone Profile', desc='Four dimensions. Normed on 9,232 fathers. A versioned instrument, scored against published norms.', active='', mode='public', body='''
<header class="hero"><div class="container" style="max-width:860px">
  <div class="eyebrow" style="margin-bottom:18px">RESEARCH</div>
  <h1 class="d-48" style="font-weight:700;letter-spacing:-.02em">The instrument behind the standard.</h1>
  <p class="small" style="color:var(--ash);margin-top:14px;max-width:56ch">The instrument is versioned. Norms are published. Methods are shown. Rate us the way we rate programs.</p>
  <p class="lead" style="margin:22px 0 8px">The Keystone Father Profile is a validated, versioned instrument built from Dr. Ken Canfield's research and normed on 9,232 fathers. It is the spine of everything on this platform.</p>
</div></header>

<section class="band tight"><div class="container">
  <h2 class="d-28" style="margin-bottom:8px">Four dimensions decide the kind of father you are.</h2>
  <p style="color:var(--ash);margin:0 0 32px;max-width:60ch">Every score, plan, certificate, and report on this platform is built from movement on these four.</p>
  <div class="grid-2">
    <div class="card" style="padding:28px"><h3 style="margin-bottom:8px">Involvement</h3><p class="small" style="color:var(--ash)">The time and attention a father actually gives, not the time he intends to give.</p></div>
    <div class="card" style="padding:28px"><h3 style="margin-bottom:8px">Consistency</h3><p class="small" style="color:var(--ash)">Whether a father shows up the same way on ordinary days, not only on the big ones.</p></div>
    <div class="card" style="padding:28px"><h3 style="margin-bottom:8px">Awareness</h3><p class="small" style="color:var(--ash)">How well a father knows his actual child: what they fear, love, and carry right now.</p></div>
    <div class="card" style="padding:28px"><h3 style="margin-bottom:8px">Nurturance</h3><p class="small" style="color:var(--ash)">The warmth a child can feel, expressed so the child receives it.</p></div>
  </div>
</div></section>

<section><div class="container split">
  <div>
    <h2 class="d-36" style="font-size:32px">How scoring works.</h2>
    <p style="color:var(--ash);margin:16px 0 18px;max-width:52ch">The full instrument is sectioned and resumable, scored against published norms, and versioned so every result states exactly which instrument produced it. Your answers produce scale scores, an overall standing, your strongest scale, and the gap your plan is built from.</p>
    <p style="color:var(--ash);max-width:52ch">Your results belong to you. We never share an individual father's results. Programs see cohort movement, never a man's private answers.</p>
  </div>
  <div>
    <a class="btn btn-primary" href="profile.html">Take the Profile</a>
    <p class="fine" style="margin-top:12px">Free. About twenty minutes. Private.</p>
  </div>
</div></section>
''')

# ================================================== efficacy-report.html
PAGES['efficacy-report.html'] = dict(title='The Efficacy Report', desc='Cohort movement on the Keystone Father Profile, benchmarked against 9,232 fathers, in the format funders ask for.', active='For Organizations', mode='public', body='''
<section class="tight" style="padding-top:56px"><div class="container" style="max-width:980px">
  <div class="row between wrap" style="align-items:flex-end;margin-bottom:8px">
    <div>
      <div class="eyebrow brass" style="margin-bottom:12px">THE EFFICACY REPORT</div>
      <h1 class="d-36">Proof, in one page.</h1>
    </div>
    <div class="row" style="gap:10px">
      <select class="input" id="reportOrg" hidden style="max-width:260px"></select>
      <button class="btn btn-secondary btn-sm" data-print>Print</button>
    </div>
  </div>
  <p style="color:var(--ash);margin:0 0 28px;max-width:62ch">Movement on the four Keystone dimensions, per cohort, benchmarked against the national norm. This page is the deliverable: print it, attach it, submit it.</p>
  <div id="reportRoot"></div>
  <p class="fine" style="margin-top:22px">Not on the standard yet? <a class="link" href="organizations.html">Start here</a>. Methodology: <a class="link ash" href="research.html">the research</a>.</p>
  <p class="fine" style="margin-top:10px">Send this page to your funder. It is designed to be forwarded. <a class="link" href="mailto:?subject=Keystone%20Efficacy%20Report%20sample&amp;body=The%20report%20our%20program%20delivers%3A%20https%3A%2F%2Ffathers-com-platform.vercel.app%2Fefficacy-report.html%3Fdemo%3D1">Email the sample &rarr;</a></p>
</div></section>
<style>@media print{.nav,footer,.btn,select{display:none!important}body{background:#fff;color:#000}}</style>
<script src="assets/js/report.js"></script>
''')

# ================================================== WRITER
if __name__ == '__main__':
    out = os.path.dirname(os.path.abspath(__file__))
    for fname, p in PAGES.items():
        html = HEAD.format(title=p['title'], desc=p['desc'], meta=social_meta(fname, p['title'], p['desc']))
        if p.get('nochrome'):
            html += p['body']
            html += '\n<script src="assets/js/config.js"></script>\n<script src="assets/js/supabase-client.js"></script>\n<script src="assets/js/app.js"></script>\n'
            if fname == 'profile.html':
                html += '<script src="assets/js/keystone-data.js"></script>\n<script src="assets/js/keystone-full.js"></script>\n<script src="assets/js/keystone-ui.js"></script>\n'
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
