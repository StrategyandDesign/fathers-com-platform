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

def test_veterans_front_door(page, server):
    page.goto(f"{server}/veterans.html", wait_until="load"); page.wait_for_timeout(500)
    films = page.query_selector_all(".vet-film")
    assert len(films) == 3                                    # three free lead-gen films
    assert page.query_selector("#vetVideoModal") is not None
    films[0].click(); page.wait_for_timeout(300)
    assert page.is_visible("#vetVideoModal")                  # modal opens
    assert page.query_selector(".vet-crisis") is None         # no crisis banner on the door
    assert _no_app_errors(page)

def test_certificates_explore_is_cert_specific(page, server):
    page.goto(f"{server}/certificates.html", wait_until="load"); page.wait_for_timeout(500)
    cards = page.query_selector_all(".cert-card")
    assert len(cards) >= 5
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

def test_voice_page_identity(page, server):
    page.goto(f"{server}/voice.html", wait_until="load"); page.wait_for_timeout(500)
    assert page.query_selector(".voice-hero") is not None
    assert page.query_selector("#voiceApp") is not None
    assert page.query_selector(".voice-secure") is not None    # the security promise section
    assert _no_app_errors(page)

def test_admin_certificate_console_present(page, server):
    # admin.html is auth-gated; assert the shipped console structure via raw fetch.
    html = _fetch(server, "admin.html")
    for hook in ['id="cert-course-select"', 'id="cert-videos"', 'id="cert-approvals"', "admin-certs.js"]:
        assert hook in html

def test_enroll_sends_intent_not_money(page, server):
    # The enroll page must reference the server-side checkout and carry no
    # client-side coupon verdict. Structural check on the shipped script.
    js = _fetch(server, "assets/js/enroll.js")
    assert "create_checkout" in js                      # calls the server protocol
    assert "functions.invoke('checkout'" in js
    assert "raw === CODE" not in js                     # old client-side verdict is gone
    page.goto(f"{server}/enroll.html?cert=fundamentals", wait_until="load"); page.wait_for_timeout(500)
    assert page.query_selector("#couponInput") is not None
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
