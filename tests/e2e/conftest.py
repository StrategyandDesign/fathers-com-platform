"""Shared test infrastructure. Serves the built site locally and provides a
browser page whose external requests are aborted, so every test is offline,
deterministic, and can never touch the production database."""
import subprocess, time, socket
import pytest
from playwright.sync_api import sync_playwright

PORT = 8899
BASE = f"http://localhost:{PORT}"

def _wait_port(port, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return True
        time.sleep(0.2)
    raise RuntimeError("test server did not start")

@pytest.fixture(scope="session")
def server():
    proc = subprocess.Popen(
        ["python3", "-m", "http.server", str(PORT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    _wait_port(PORT)
    yield BASE
    proc.terminate()

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()

@pytest.fixture()
def page(browser, server):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    # Abort every non-local request: no CDN, no Supabase, no network flake.
    pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.errors = errors
    yield pg
    ctx.close()
