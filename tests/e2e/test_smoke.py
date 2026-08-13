"""Smoke tests for the critical public flows. Structural assertions only:
they verify the pages our users depend on are present and wired, without
depending on live data. Run locally with: python3 -m pytest tests/e2e -q"""

def _no_app_errors(page):
    # supabase import is aborted by design; ignore module-load noise only.
    return [e for e in page.errors if "supabase" not in e.lower()] == []

def test_homepage_renders(page, server):
    page.goto(f"{server}/index.html", wait_until="load"); page.wait_for_timeout(500)
    h1 = page.query_selector("header.hero h1") or page.query_selector("h1")
    assert h1 is not None and len(h1.inner_text()) > 10
    assert "twelve minutes" not in page.inner_text("body")   # copy-accuracy regression
    assert _no_app_errors(page)

def test_military_surface_is_dark(page, server):
    # v4.0 (POSITIONING.md 5): SHOW_MILITARY=False. The veteran pages are not
    # generated, and no live page links to them.
    import urllib.request, urllib.error
    for dead in ("veterans.html", "veterans-hub.html", "voice.html", "share.html"):
        try:
            urllib.request.urlopen(f"{server}/{dead}")
            assert False, f"{dead} should not be generated while SHOW_MILITARY is off"
        except urllib.error.HTTPError as e:
            assert e.code == 404
    for live in ("index.html", "organizations.html", "certificates.html"):
        html = _fetch(server, live)
        assert "veterans" not in html and "voice.html" not in html

def test_facilitators_page_renders(page, server):
    page.goto(f"{server}/facilitators.html", wait_until="load"); page.wait_for_timeout(400)
    body = page.inner_text("body")
    assert "Certified Facilitator" in body
    assert "supervised first cohort" in body.lower()
    assert _no_app_errors(page)

def test_certificates_explore_is_cert_specific(page, server):
    page.goto(f"{server}/certificates.html", wait_until="load"); page.wait_for_timeout(500)
    cards = page.query_selector_all(".cert-card")
    assert len(cards) == 3          # the three courses, locked in v4.0
    explore = page.query_selector("#certExplore")
    assert explore is not None
    target = page.query_selector('.cert-card[data-cert="coparenting"]')
    if target:
        target.click(); page.wait_for_timeout(300)
        assert "cert=coparenting" in (page.get_attribute("#certExplore", "href") or "")
    assert _no_app_errors(page)

def _fetch(server, path):
    import urllib.request
    return urllib.request.urlopen(f"{server}/{path}").read().decode()

def test_circles_is_live_not_demo(page, server):
    # circles.html is auth-gated: signed-out visits redirect to login. Assert
    # the SHIPPED structure via raw fetch, and the gate via the redirect.
    html = _fetch(server, "circles.html")
    assert 'id="circleFeed"' in html
    assert 'id="circlePostBtn"' in html
    assert "assets/js/circles.js" in html
    assert "visitation scene wrecked me" not in html          # demo posts stay dead
    page.goto(f"{server}/circles.html", wait_until="load")
    # Poll rather than hook navigation: the redirect aborts in-flight requests
    # by design (offline suite), which poisons wait_for_url's event listener.
    import time as _t
    deadline = _t.time() + 8
    while _t.time() < deadline and "login.html" not in page.url:
        page.wait_for_timeout(200)
    assert "login.html" in page.url                            # the gate works

def test_enrollment_is_free(page, server):
    # v4.0: the man never pays. No dollar price on the enroll summary.
    html = _fetch(server, "enroll.html")
    assert 'id="totalLine">Free<' in html
    assert "$79" not in html

def test_no_dead_buttons(page, server):
    # The audit rule: no placeholder toasts that promise wiring later, and no
    # magic-link path on sign-in. Structural greps across the shipped pages.
    import glob, os
    for f in glob.glob(os.path.join(os.path.dirname(__file__), "..", "..", "*.html")):
        html = open(f).read()
        assert "wires at deploy" not in html, f
        assert "wires to Supabase" not in html, f
        assert "wires to Stripe" not in html, f
    login = _fetch(server, "login.html")
    assert "authMagic" not in login and "sign-in link" not in login

def test_login_has_account_creation(page, server):
    # One card, two modes: the create-account link toggles the form, it does
    # not dump a man into the assessment. Password only, no magic link.
    html = _fetch(server, "login.html")
    for hook in ('id="authTitle"', 'id="authAltLink"', 'id="authNameField"', 'id="authName"'):
        assert hook in html
    assert 'href="profile.html">Create an account' not in html
    js = _fetch(server, "assets/js/app.js")
    assert "signUpPassword" in js and "navSignout" in js
    client = _fetch(server, "assets/js/supabase-client.js")
    assert "signInWithOtp" not in client                 # magic link fully retired

def test_plan_has_keystone_dashboard(page, server):
    html = _fetch(server, "plan.html")
    for hook in ('id="kdHero"', 'id="kdRing"', 'id="kdBars"', 'id="kdCongrats"'):
        assert hook in html
    js = _fetch(server, "assets/js/home.js")
    assert "renderHero" in js and "reveal" in js

def test_account_has_visible_signout(page, server):
    html = _fetch(server, "account.html")
    assert 'data-signout>Sign out</a>' in html

def test_facilitator_desk_has_claims(page, server):
    html = _fetch(server, "lead.html")
    for hook in ('id="claim-email"', 'id="claim-add"', 'id="claim-list"', 'id="lead-export"', 'id="lead-thisweek"', 'id="lead-week-chips"', 'id="lead-seat-chip"', 'id="lead-serial-chip"'):
        assert hook in html
    assert "men you claimed" in html
    assert "men in your Circle" not in html
    assert "He can train without you" in html
    assert "Seating for Returning Home" in html
    assert "NEXT MEETING" not in html
    assert "This week</button>" not in html
    assert "Plan weeks</button>" not in html
    js = _fetch(server, "assets/js/lead.js")
    assert "participant_claims" in js
    assert "The Body You Bring Home" in js
    assert "review.html#rv-absent" in js
    assert "verify.html" in js
    assert "verify.html?serial=" in js
    assert "withSessionFlags" in js
    assert "(x.sessions_completed||0) > weekIndex" in js
    assert "paintBoard" in js
    assert "certificates').select('*')" not in js
    assert "course totals" not in js
    assert "perSession:true" in js
    assert 'data-role="leader">Desk</a>' in html
    review = _fetch(server, "review.html")
    assert "Reach him from Desk." in review
    assert "log the contact in your kit" not in review
    certs = _fetch(server, "certificates.html")
    assert "PREVIEW THE PLAYER" not in certs
    assert "shape stills until Vimeo is wired" not in certs

def test_admin_console_builds_courses(page, server):
    html = _fetch(server, "admin.html")
    assert "Build a course" in html
    assert "Five videos per course" in html

def test_admin_certificate_console_present(page, server):
    # admin.html is auth-gated; assert the shipped console structure via raw fetch.
    html = _fetch(server, "admin.html")
    for hook in ['id="cert-course-select"', 'id="cert-videos"', 'id="cert-approvals"', "admin-certs.js"]:
        assert hook in html

def test_enroll_is_claim_gated_not_coded(page, server):
    # v4.0 (POSITIONING.md 3): no coupon UI, no client-side eligibility. The
    # server-side checkout owns the claim check; the page explains the claim.
    js = _fetch(server, "assets/js/enroll.js")
    assert "create_checkout" in js                      # calls the server protocol
    assert "functions.invoke('checkout'" in js
    assert "coupon" not in js                           # the code path is gone entirely
    assert "claim_required" in js                       # and the claim path is handled
    page.goto(f"{server}/enroll.html?cert=fundamentals", wait_until="load"); page.wait_for_timeout(500)
    assert page.query_selector("#couponInput") is None
    assert page.query_selector("#claimStatus") is not None
    assert page.query_selector("#enrollBtn") is not None

def test_participant_dashboard_present(page, server):
    html = _fetch(server, "participant.html")
    for hook in ['id="pt-search"', 'id="pt-results"', 'id="pt-detail"', "participant.js"]:
        assert hook in html
    assert "Individual snapshot" in _fetch(server, "assets/js/participant.js")

def test_keystone_resume_advances_past_full_section(page, server):
    # Regression for the freeze: a fully-answered section must route to endSection,
    # not redraw the last item. Assert the fixed clamp is in the shipped script.
    js = _fetch(server, "assets/js/keystone-ui.js")
    assert "curIndex = curItems.length;" in js
    assert "if(i===curItems.length-1) curIndex=i;" not in js


def test_participant_dashboard_reveals_app(page, server):
    # Regression: the dashboard body (#app) must be revealed by the controller
    # after the role guard, or the page is a black screen.
    js = _fetch(server, "assets/js/participant.js")
    assert "app.style.display=''" in js

def test_coursework_page_present(page, server):
    html = _fetch(server, "course.html")
    for hook in ['id="cw-root"', 'id="cw-stage"', "coursework.js"]:
        assert hook in html
    js = _fetch(server, "assets/js/coursework.js")
    # the pillars of the flow exist in the controller
    assert "video_progress" in js and "final_qa_responses" in js
    assert "openPractice" in js and "practice_completions" in js
    assert "status:'submitted'" in js or 'status: "submitted"' in js

def test_enroll_begin_button_targets_coursework(page, server):
    assert "course.html?cert=" in _fetch(server, "assets/js/enroll.js")

def test_coursework_supports_vimeo(page, server):
    js = _fetch(server, "assets/js/coursework.js")
    assert "player.vimeo.com/video/" in js          # vimeo embed
    assert "Vimeo.Player" in js                      # vimeo player api tracking
    assert "vimeoId" in js                           # accepts bare id or url


def test_coursework_twelve_week_loop(page, server):
    js = _fetch(server, "assets/js/coursework.js")
    assert "openPractice" in js
    assert "practice_replay" in js
    assert "Save this week's practice" in js or "Save this week\\'s practice" in js or "this week" in js.lower()
    data = _fetch(server, "assets/js/course-demo-data.js")
    assert '"practice"' in data
    assert "s01-practice-replay.mp4" in data
    assert "Log 3 rising-tension moments" in data
    # Fundamentals stay off the 12-week rewrite
    assert data.count('"slug": "fundamentals"') >= 1
    lead = _fetch(server, "assets/js/lead.js")
    assert "practice log" in lead.lower()
    assert "answers, scores" in lead or "answers, scores, or practice" in lead
    docs = _fetch(server, "docs/SHORT-SESSION-COURSES.md")
    assert "12 weeks" in docs.lower() or "twelve-week" in docs.lower()
    assert "Fathering Fundamentals" in docs
    anger = _fetch(server, "content/anger.json")
    assert '"duration_seconds": 502' in anger   # do not fake duration
    assert '"practice_replay"' in anger
    assert '"welcome"' in anger
    assert "assets/video/welcomes/anger.mp4" in anger
    assert "openWelcome" in js
    assert "shouldOpenWelcome" in js
    assert "Start here" in data

def test_preview_player_shows_practice_copy(page, server):
    page.goto(f"{server}/course.html?preview=1&cert=anger", wait_until="load")
    page.wait_for_timeout(600)
    assert _no_app_errors(page)
    body = page.inner_text("body")
    assert "Steady Under Pressure" in body
    assert "Start here" in body or "KEN" in body
    skip = page.query_selector("#cw-welcome-skip")
    if skip:
        skip.click()
        page.wait_for_timeout(400)
        body = page.inner_text("body")
    assert "Week 1" in body or "PRACTICE" in body or "The Surge Is a Signal" in body
