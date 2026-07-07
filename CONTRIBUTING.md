# Contributing and Deploying

This repository ships a live platform. The process below is what keeps a push safe.

## The rules

1. Edit sources, never generated HTML. Pages come from `build_pages.py` and `build_dashboards.py`. CI rejects drift.
2. Never touch `assets/js/config.js`. It holds the live public keys. If keys are rotated deliberately, update the pinned md5 in `.github/workflows/ci.yml` in the same PR and say why.
3. Every database change is a new file in `supabase/migrations/` (see the README there). No dashboard-only SQL after the baseline.
4. Money, secrets, approvals: server-side only (edge functions). The browser never computes a price or holds a token.
5. Every feature lands with tests. At minimum, extend `tests/e2e/test_smoke.py` for new critical surfaces.

## Local loop

```bash
python3 build_pages.py && python3 build_dashboards.py     # rebuild
for f in $(find assets/js -name '*.js'); do node --check "$f"; done
pip install -r requirements-dev.txt && python3 -m playwright install chromium   # once
python3 -m pytest tests/e2e -q                             # smoke tests
```

## Deploying

Work lands through a branch and a pull request so CI gates it before it goes live:

```bash
cd ~/Downloads/fathers-com
git checkout -b feature/short-name
git add -A
git commit -m "What and why"
git push -u origin feature/short-name
```

Then open the PR on GitHub. CI runs automatically; Vercel posts a preview link on the PR for visual review. Merge when green. Merging to `main` deploys production.

Rollback: revert the merge commit and push. The site is static, so rollback is immediate.

## One-time repository setup (owner)

GitHub → Settings → Branches → Add branch protection rule for `main`:
- Require a pull request before merging (1 approval once the team reviews; 0 while solo)
- Require status checks to pass: select the `Build, integrity, and smoke tests` check
- Do not allow bypassing the above (optional, recommended once the team is active)

## Definition of done

Code, rebuilt pages, tests, migration file (if schema changed), flag (if user-facing rollout), and a PR description stating what and why.
