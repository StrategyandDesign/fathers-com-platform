"""Smoke tests for the critical public flows. Structural assertions only:
they verify the pages our users depend on are present and wired, without
depending on live data. Run locally with: python3 -m pytest tests/e2e -q"""

def _no_app_errors(page):
    # supabase import is aborted by design; ignore module-load noise only.
    # YouTube preview iframes are also aborted offline; that can throw a
    # localStorage Access is denied from the empty frame, not from our app.
    ignore = ("supabase", "access is denied")
    return [e for e in page.errors if not any(s in e.lower() for s in ignore)] == []

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
    assert "openWriting" in js and "session_writings" in js
    assert "What did you learn?" in js
    assert "when the training is live" not in js
    assert "Read this session" not in js
    assert "awardStatus='submitted'" in js or "status:'submitted'" in js or 'status: "submitted"' in js

def test_enroll_begin_button_targets_coursework(page, server):
    assert "course.html?cert=" in _fetch(server, "assets/js/enroll.js")

def test_coursework_supports_vimeo(page, server):
    js = _fetch(server, "assets/js/coursework.js")
    assert "player.vimeo.com/video/" in js          # vimeo embed
    assert "Vimeo.Player" in js                      # vimeo player api tracking
    assert "vimeoId" in js                           # accepts bare id or url
    assert "youtubeId" in js
    assert "youtube.com/embed/" in js


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
    skip = page.query_selector("#cw-welcome-skip")
    if skip:
        skip.click()
        page.wait_for_timeout(400)
        body = page.inner_text("body")
    assert "The Surge Is a Signal" in body
    assert "WEEK 1" in body or "Week 1" in body
    assert "← Steady Under Pressure" in body
    assert "All weeks" not in body
    page.evaluate(
        """() => {
          const v = document.getElementById('cw-video');
          if (!v) return;
          try { v.currentTime = (v.duration && isFinite(v.duration)) ? v.duration : 999; } catch (e) {}
          v.dispatchEvent(new Event('ended'));
        }"""
    )
    page.wait_for_timeout(400)
    go = page.query_selector("#cw-to-debrief")
    assert go is not None
    assert go.get_attribute("disabled") is None
    go.click()
    page.wait_for_timeout(500)
    body = page.inner_text("body")
    assert "Question 1" in body
    assert "Session 1 of" in body
    assert "DEBRIEF" in body or "The Surge Is a Signal" in body
    choice = page.query_selector(".cw-choice")
    assert choice is not None
    choice.click()
    page.wait_for_timeout(200)
    nxt = page.query_selector("#cw-q-next")
    assert nxt is not None
    assert nxt.get_attribute("disabled") is None

def test_fundamentals_preview_starts_at_ken(page, server):
    page.add_init_script("""
      localStorage.setItem('fc_path','returning-home');
      localStorage.setItem('fc-cw-preview-fundamentals-welcome','1');
      localStorage.setItem('fc-cw-preview-fundamentals', JSON.stringify({
        progress: {
          'demo-fundamentals-1': {video_id:'demo-fundamentals-1', watched_seconds:480, completed:true},
          'demo-fundamentals-2': {video_id:'demo-fundamentals-2', watched_seconds:480, completed:true},
          'demo-fundamentals-3': {video_id:'demo-fundamentals-3', watched_seconds:480, completed:true}
        },
        passes: {'demo-fundamentals-1':true,'demo-fundamentals-2':true,'demo-fundamentals-3':true},
        practices: {}, logs: {}
      }));
    """)
    page.goto(f"{server}/course.html?preview=1&cert=fundamentals", wait_until="load")
    page.wait_for_timeout(700)
    assert _no_app_errors(page)
    body = page.inner_text("body")
    assert "Fathering Fundamentals" in body
    assert "Third Secret" not in body
    assert "LESSON 4" not in body
    assert "Ken Canfield" in body
    assert "PREVIEW" in body
    assert "Then lesson 1." in body
    assert "← Fathering Fundamentals" in body
    assert "All lessons" not in body
    assert "Not a week" not in body
    assert "In production" not in body
    js = _fetch(server, "assets/js/course-demo-data.js")
    assert "ib2up4VhWdo" in js
    assert "youtube.com/watch?v=ib2up4VhWdo" in _fetch(server, "content/fundamentals.json")

def test_returning_home_is_one_door(page, server):
    html = _fetch(server, "returning-home.html")
    assert "Show up for your kids." in html
    assert "Present from here" not in html
    assert "Build the kind of relationship you want with your child." in html
    assert "They are waiting for you." not in html
    assert "Walk in" not in html
    assert "Not a week" not in html
    assert "In production" not in html
    assert "A call counts" not in html
    assert "Come home present" not in html
    assert "Coming Home Present first" not in html
    assert "all four" not in html.lower()
    assert "Same Team" not in html
    assert "data-rh-courses" in html
    assert "profile.html?start=quick" in html
    assert "path=rh" in html
    assert "When you are ready for more" not in html
    assert "Steady Under Pressure" not in html
    assert "For organizations" not in html
    assert "Start Profile" not in html
    assert "Twelve weeks of small moves" not in html
    assert "The Profile is a short set of honest questions." in html
    assert "private starting point" in html
    assert "where you stand as a father" not in html
    assert "It takes eight minutes." in html
    assert "There are no right answers." in html
    assert "Nobody is grading you." not in html
    assert "Take the Profile" in html
    assert "rh-door-profile" in html
    assert "Your starting point" in html
    assert "Where you stand" not in html
    assert "The Profile takes eight minutes." not in html
    assert "Give your kids eight minutes." not in html
    assert "Start the trainings" in html
    assert "Watch the films" not in html
    assert "Your trainings are open." in html
    page.goto(f"{server}/returning-home.html", wait_until="load")
    page.wait_for_timeout(400)
    body = page.inner_text("body")
    assert "Show up for your kids." in body
    assert "Build the kind of relationship you want with your child." in body
    assert "They are waiting for you." not in body
    assert "Walk in" not in body
    assert "A call counts" not in body
    assert "Same Team" not in body
    assert "all four" not in body.lower()
    assert "The Profile is a short set of honest questions." in body
    assert "private starting point" in body
    assert "where you stand as a father" not in body
    assert "It takes eight minutes." in body
    assert "Give your kids eight minutes." not in body
    assert page.query_selector("a.rh-door-profile-go") is not None
    assert page.query_selector("aside.rh-door-profile a.btn-yellow") is None
    names = [a.inner_text() for a in page.query_selector_all("[data-rh-courses] a")]
    assert names == ["Fathering Fundamentals", "Steady Under Pressure", "Coming Home Present"]
    cta = page.query_selector("a.rh-door-cta")
    assert cta is not None
    href = cta.get_attribute("href") or ""
    assert "rh-desk.html" in href
    css = _fetch(server, "assets/css/forge.css")
    door = css.split(".rh-door-main{")[1].split("}")[0]
    assert "max-width:640px" not in door
    assert "max-width:none" in door
    h1 = css.split(".rh-door-h{")[1].split("}")[0]
    assert "max-width:none" in h1
    prof = css.split(".rh-door-profile{")[1].split("}")[0]
    assert "border-top" in prof
    assert "yellow" not in prof.lower()
    assert _no_app_errors(page)

def test_rh_profile_opens_with_a_beat(page, server):
    page.goto(f"{server}/profile.html?start=quick&path=rh", wait_until="load")
    page.wait_for_timeout(500)
    body = page.inner_text("body")
    assert "This takes eight minutes. Then you have a starting point." in body
    assert "This takes eight minutes. Then you know where you stand." not in body
    assert "Give your kids eight minutes." not in body
    assert "private starting point" in body
    assert "There are no right answers." in body
    assert "Nobody is grading you." not in body
    assert "An account keeps the report, the trainings, and the work." in body
    assert "Start the questions now" in body
    assert "Walk in" not in body
    assert "Present from here" not in body
    assert "Show up for your kids" not in body
    assert "tunes your path" not in body.lower()
    assert "not a " not in body.lower()
    begin = page.query_selector("#ks-rh-begin")
    assert begin is not None and begin.inner_text().strip() == "Begin"
    assert page.query_selector(".ks-prompt") is None
    begin.click()
    page.wait_for_timeout(500)
    asked = page.inner_text("body")
    assert page.query_selector(".ks-prompt") is not None
    assert "This takes eight minutes. Then you have a starting point." not in asked
    assert "Answer for how it is now." in asked
    assert _no_app_errors(page)

def test_returning_home_path_opens_films(page, server):
    ui = _fetch(server, "assets/js/keystone-ui.js")
    assert "Start \"+esc(rec.title)" in ui
    assert "Here is your starting point. Start " in ui
    assert "Saved on this device. An account keeps it." in ui
    assert "Your home" in ui
    assert "Open your trainings" not in ui
    assert "Open your films" not in ui
    assert "Next, pick a training." not in ui
    app = _fetch(server, "assets/js/app.js")
    assert "fc_path" in app
    assert "safeNext" in app
    assert "rh-desk.html" in app
    assert "rh-home.html" in app
    assert "homebaseHref" in app
    assert "rhRoom" in app
    assert "lockRhPath" in app
    assert "rhAfterSignOut" in app
    assert "fc_rh_profile_done" in app
    assert "courseForFocus" in app
    assert "involvement: { slug:'reentry', title:'Coming Home Present' }" in app
    assert "consistency: { slug:'anger', title:'Steady Under Pressure' }" in app
    assert "awareness: { slug:'fundamentals', title:'Fathering Fundamentals' }" in app
    journey = _fetch(server, "assets/js/journey.js")
    assert "RH_STAGES" in journey
    assert "rh-home.html" in journey
    help = _fetch(server, "assets/js/help.js")
    assert "['Profile', 'Report', 'Home']" in help
    assert "Your trainings are open. Pick one and watch." in help
    assert "Start the training your report named. The other two stay open." in help
    assert "Pick a training. Watch. No order." not in help
    assert "Open your films" not in help
    assert "This takes eight minutes. Then you have a starting point." in help
    assert "Same Team" not in help
    assert "all four" not in help.lower()
    assert "four courses" not in help
    assert "four films" not in help
    assert "sponsor.html" not in help
    assert "organizations.html" not in help
    desk = _fetch(server, "rh-desk.html")
    assert "Pick a training and watch." in desk
    assert "Your trainings" in desk
    assert "Your films" not in desk
    assert "data-rh-courses=\"cards\"" in desk
    assert "Coming Home Present first" not in desk
    assert "Walk in" not in desk
    assert "Want a baseline" not in desk
    assert "all four" not in desk.lower()
    assert "Same Team" not in desk
    assert "See your starting point. The Profile takes eight minutes. Answer honestly so this can fit you." in desk
    assert "rh-ticker" in desk
    assert "Watch first. An account keeps your progress." in desk
    assert "rh-door-login" in desk
    assert "mode=signup" in desk
    assert "Create account" in desk
    assert "get the most out of this" not in desk.lower()
    assert "unlock your potential" not in desk.lower()
    css = _fetch(server, "assets/css/forge.css")
    assert "max-width:1160px" in css
    assert ".rh-films{display:grid;grid-template-columns:repeat(3,1fr);gap:20px" in css
    assert "padding:28px 22px" in css
    assert ".rh-film.is-start" in css
    assert "body:has(.rh-door) .themeswitch.floating{display:none}" in css
    block = app.split("var RH_COURSES")[1].split("function playerHref")[0]
    assert "slug:'fundamentals'" in block
    assert block.find("slug:'fundamentals'") < block.find("slug:'anger'") < block.find("slug:'reentry'")
    assert "slug:'coparenting'" not in block
    assert "Same Team" not in block
    page.goto(f"{server}/rh-desk.html", wait_until="load")
    page.wait_for_timeout(400)
    desk_body = page.inner_text("body")
    assert "Pick a training and watch." in desk_body
    assert "Same Team" not in desk_body
    assert "all four" not in desk_body.lower()
    assert "See your starting point" in desk_body
    assert "See where you stand" not in desk_body
    cards = [a.query_selector(".rh-film-t").inner_text() for a in page.query_selector_all("a.rh-film")]
    assert cards == ["Fathering Fundamentals", "Steady Under Pressure", "Coming Home Present"]
    assert page.query_selector("a.rh-film .rh-film-go") is not None
    metas = [el.inner_text() for el in page.query_selector_all(".rh-film-meta")]
    assert metas == [
        "8 lessons. Training and a certificate.",
        "12 weeks. Training and a certificate.",
        "12 weeks. Training and a certificate.",
    ]
    lines = [el.inner_text() for el in page.query_selector_all(".rh-film-l")]
    assert lines == [
        "Connect with your child with meaning and impact.",
        "Steadiness when the moments get loud.",
        "Improving your most important relationships.",
    ]
    assert "A certificate needs a claimed seat later." not in desk_body
    assert "claimed seat" not in desk_body.lower()
    assert "Not a week" not in desk_body
    assert "Watch first. An account keeps your progress." in desk_body
    for el in page.query_selector_all(".rh-film-l"):
        fits = el.evaluate(
            """el => {
              const cs = getComputedStyle(el);
              const probe = document.createElement('span');
              probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font;
              probe.textContent = el.textContent;
              document.body.appendChild(probe);
              const need = probe.offsetWidth;
              probe.remove();
              return need <= el.clientWidth + 1;
            }"""
        )
        assert fits, f"subtitle wraps on desktop: {el.inner_text()!r}"
    assert _no_app_errors(page)

def test_rh_homebase_is_the_room(page, server):
    home = _fetch(server, "rh-home.html")
    assert "Welcome back." in home
    assert "This is your room." in home
    assert "rh-home.js" in home
    assert "keystone-report.js" in home
    assert "id=\"rhHomeContinue\"" in home
    assert "id=\"rhHomeReport\"" in home
    assert "next=rh-home.html" in home
    door = _fetch(server, "returning-home.html")
    assert "next=rh-home.html" in door
    app = _fetch(server, "assets/js/app.js")
    assert "homebaseHref" in app
    assert "[['Home','rh-home.html']" in app
    page.add_init_script("localStorage.setItem('fc_path','returning-home');")
    page.goto(f"{server}/rh-home.html", wait_until="load")
    page.wait_for_function("() => document.body.innerText.includes('Take the Profile')", timeout=8000)
    body = page.inner_text("body")
    assert "Welcome back." in body
    assert "Your trainings" in body
    assert "Fathering Fundamentals" in body
    assert "Steady Under Pressure" in body
    assert "Coming Home Present" in body
    assert "Same Team" not in body
    assert "Your report named" not in body
    assert "Finish a session. The four answers live here." in body
    assert "Take the Profile" in body
    assert page.query_selector(".rh-home-cont-go") is None
    rows = page.query_selector_all("a.rh-home-row")
    assert len(rows) == 3
    assert page.query_selector_all("a.rh-home-row.is-start") == []
    assert _no_app_errors(page)

def test_rh_homebase_shows_report_glance(page, server):
    page.add_init_script("""
      localStorage.setItem('fc_path','returning-home');
      localStorage.setItem('fc_rh_profile_done','1');
      localStorage.setItem('fc_rh_next_focus','consistency');
      localStorage.setItem('fc_pending_result', JSON.stringify({
        scored: {
          overall: 58,
          scales: {
            involvement: {label:'Involvement', pct:81, band:{label:'Strong'}, section:'dimensions'},
            consistency: {label:'Consistency', pct:34, band:{label:'Building'}, section:'dimensions'},
            awareness: {label:'Awareness', pct:55, band:{label:'Developing'}, section:'dimensions'},
            nurturance: {label:'Nurturance', pct:60, band:{label:'Solid'}, section:'dimensions'}
          },
          gap: 'consistency',
          strength: 'involvement'
        },
        at: Date.now(),
        assessment_slug: 'keystone-father-profile',
        completion_tier: 'quick'
      }));
      localStorage.setItem('fc-cw-preview-anger-writings', JSON.stringify({
        'demo-anger-1': {
          learned: 'The surge is a signal.',
          meaning: 'I can catch it.',
          apply: 'I will name the heat and step away.',
          share: '',
          savedAt: new Date().toISOString()
        }
      }));
    """)
    page.goto(f"{server}/rh-home.html", wait_until="load")
    page.wait_for_selector(".rp-gcard", timeout=8000)
    body = page.inner_text("body")
    assert "Your report named" not in body
    assert "Your strongest ground" in body
    assert "Your starting point" in body
    assert "What to strengthen" in body
    assert "Your standing" not in body
    assert "56 questions" in body
    assert "128 questions" not in body
    assert "Involvement" in body
    assert "Consistency" in body
    assert "Open the full report" in body
    assert "Start Coming Home Present" not in body
    go = page.query_selector("#rhHomeContinue .rh-home-cont-go")
    assert go is not None
    assert go.inner_text().strip() in ("Resume", "Start here")
    assert "Steady Under Pressure" in page.inner_text("#rhHomeContinue")
    assert "Session " in page.inner_text("#rhHomeContinue")
    assert page.query_selector("#rhHomeContinue .rh-home-bar") is not None
    assert "You wrote: I will name the heat and step away." in body
    more = page.query_selector("details.rh-home-more")
    assert more is not None
    assert "Your other trainings" in (more.inner_text() or "")
    assert page.query_selector_all("#rhHomeContinue .rh-home-cont-go") == [go]
    assert page.query_selector_all("a.rh-home-row.is-start") == []
    assert "Same Team" not in body
    assert _no_app_errors(page)

def test_rh_quick_report_counts_answered_questions(page, server):
    page.add_init_script("""
      localStorage.setItem('fc_path','returning-home');
      localStorage.setItem('fc_rh_profile_done','1');
      localStorage.setItem('fc_pending_result', JSON.stringify({
        scored: {
          overall: 58,
          scales: {
            involvement: {label:'Involvement', pct:81, band:{label:'Strong'}, section:'dimensions'},
            consistency: {label:'Consistency', pct:34, band:{label:'Building'}, section:'dimensions'}
          },
          gap: 'consistency',
          strength: 'involvement'
        },
        at: Date.now(),
        assessment_slug: 'keystone-father-profile',
        completion_tier: 'quick'
      }));
    """)
    page.goto(f"{server}/report.html", wait_until="load")
    page.wait_for_function("() => document.body.innerText.includes('questions you answered')", timeout=8000)
    body = page.inner_text("body")
    assert "56" in body
    assert "questions you answered" in body
    assert "128 questions" not in body
    assert "Fathering Practices" not in body
    assert _no_app_errors(page)

def test_rh_desk_after_report_names_training(page, server):
    page.add_init_script("""
      localStorage.setItem('fc_path','returning-home');
      localStorage.setItem('fc_rh_profile_done','1');
      localStorage.setItem('fc_rh_next_focus','involvement');
    """)
    page.goto(f"{server}/rh-desk.html", wait_until="load")
    page.wait_for_timeout(400)
    body = page.inner_text("body")
    assert page.query_selector(".rh-ticker") is None
    assert "See where you stand" not in body
    assert "See your starting point" not in body
    assert "Eight minutes" not in body
    assert "No order" not in body
    assert "Start here." in body
    assert "Your report named Coming Home Present." in body
    assert "Your report is on this device. An account keeps it." in body
    cards = [a.query_selector(".rh-film-t").inner_text() for a in page.query_selector_all("a.rh-film")]
    assert cards[0] == "Coming Home Present"
    mark = page.query_selector("a.rh-film.is-start .rh-film-mark")
    assert mark is not None and mark.inner_text().strip().lower() == "start here"
    href = page.query_selector("a.rh-film.is-start").get_attribute("href") or ""
    assert "cert=reentry" in href
    assert "preview=1" in href
    assert _no_app_errors(page)

def test_fundamentals_intro_has_real_outline(page, server):
    page.add_init_script("localStorage.setItem('fc_path','returning-home');")
    page.goto(f"{server}/course.html?preview=1&cert=fundamentals&welcome=0", wait_until="load")
    page.wait_for_timeout(700)
    assert _no_app_errors(page)
    body = page.inner_text("body")
    assert "when the training is live" not in body
    assert "Read this session" not in body
    assert "Take the checkpoint when you are ready." in body
    assert "THIS SESSION" in body
    assert "Welcome, overview, and take the assessment." in body
    go = page.query_selector("#cw-to-debrief")
    assert go is not None
    go.click()
    page.wait_for_timeout(500)
    body = page.inner_text("body")
    assert "Session 1 of" in body
    assert "Question 1" in body

def test_no_church_language_on_fundamentals(page, server):
    demo = _fetch(server, "assets/js/course-demo-data.js")
    checks = _fetch(server, "assets/js/session-checkpoints-data.js")
    fund = _fetch(server, "content/fundamentals.json")
    for blob in (demo, checks, fund):
        low = blob.lower()
        assert "church" not in low
        assert "chapel" not in low
        assert "scripture" not in low
        assert "religious institution" not in low
        assert "faith community" not in low
        assert "Grounded convictions you live" in blob
        assert "What do kids actually watch?" in blob

def test_session_writing_saves_on_device(page, server):
    page.add_init_script("localStorage.setItem('fc_path','returning-home');")
    page.goto(f"{server}/course.html?preview=1&cert=fundamentals&welcome=0", wait_until="load")
    page.wait_for_timeout(700)
    go = page.query_selector("#cw-to-debrief")
    assert go is not None
    go.click()
    page.wait_for_timeout(400)
    for pick in (1, 1, 0):
        choices = page.query_selector_all(".cw-choice")
        assert len(choices) > pick
        choices[pick].click()
        page.wait_for_timeout(150)
        nxt = page.query_selector("#cw-q-next")
        assert nxt is not None
        nxt.click()
        page.wait_for_timeout(350)
    body = page.inner_text("body")
    assert "What did you learn?" in body
    assert "What does that mean to you?" in body
    assert "How can you apply this moving forward?" in body
    assert "What else would you like to share?" in body
    assert "Session 1 of" in body
    page.fill("#cw-w-learned", "Presence is the work.")
    page.fill("#cw-w-meaning", "My child feels it.")
    page.fill("#cw-w-apply", "I will sit with him tonight.")
    page.click("#cw-w-save")
    page.wait_for_timeout(400)
    stored = page.evaluate("() => localStorage.getItem('fc-cw-preview-fundamentals-writings')")
    assert stored and "Presence is the work." in stored
    body = page.inner_text("body")
    assert "This stays with you." in body
    assert "Create account" in body
    assert "login.html?path=rh" in (page.content() or "")
    assert page.query_selector("#cw-w-keep") is not None
