# Verification checklist

Run these on a clone of `fathers-com-clean-pilot` (`review`). Do not use `fathers-com-platform.vercel.app` or the stale `fathers-com-pilot.vercel.app` to confirm this tree.

## A. Identity

- [ ] `git remote -v` points at `StrategyandDesign/fathers-com-clean-pilot`, not `fathers-com-platform`.
- [ ] `git rev-parse --abbrev-ref HEAD` is `review` (or the SHA you were sent).
- [ ] There is no `main` from the old platform in this clone.

## B. Cleanup

- [ ] These paths are gone: `components/father/group-membership.tsx`, `components/father/session-steps.tsx`, `components/father/session-complete-mark.tsx`, `lib/father/evaluate.ts`.
- [ ] `components/assessments/assigned-list.tsx` is present (used by `/father/assessments` after Keystone is complete).
- [ ] `rg FatherGroupMembership\|SessionSteps\|SessionCompleteMark\|evaluatePlaceholder` in `*.ts,*.tsx` is empty.
- [ ] `README.md` starts with “Fathers.com — clean-pilot”.
- [ ] Root `*.md` is only `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `SHARED.md`, `SUBMITS.md`.
- [ ] No `*.html` at the repo root. Old pages are under `archive/static-site/`.
- [ ] `docs/engineering/PILOT.md` has the 18 Aug 2026 host table.

## C. Automated

```bash
npx tsx --test tests/*.test.ts
npx tsc --noEmit
npm run lint
```

Expect: tests pass; tsc clean; eslint clean on the Next app.

## D. Signed-out HTTP (local `npm run dev`)

- [ ] `GET /` → 307 `/login`
- [ ] `GET /father` → 307 `/login?next=/father`
- [ ] `GET /manager` → 307 `/login?next=/manager`
- [ ] `GET /admin` → 307 `/login?next=/admin`
- [ ] `GET /login` → 200
- [ ] `GET /privacy` → 200
- [ ] `GET /this-page-does-not-exist` → 404

## E. Signed-in smoke (Pilot seats; local or PR preview)

Father:

- [ ] `/login` → `/father` (or `/father/start` if first-run)
- [ ] Sidebar: Home, Trainings, Assessments, Certificates
- [ ] Open a training session → film → check-in → action
- [ ] Assessments lists Keystone and/or assigned custom assessments
- [ ] A finished Keystone shows its results on `/father/assessments`
- [ ] A training with an overview URL opens the film before sessions
- [ ] Check-in radios save without sticking on Saving
- [ ] Streak dialog has no green week square
- [ ] `/father/account` from the avatar

Leader:

- [ ] `/login` → `/manager`
- [ ] Participants, Trainings, Assessments, Impact load
- [ ] Certificate of Completion is under the participant list
- [ ] Home update preview is blank until you type
- [ ] `/manager/reviews` → `/manager/trainings`
- [ ] `/manager/compare` → `/manager/impact?tab=compare`

Admin:

- [ ] `/login` → `/admin`
- [ ] Organizations, Users, Trainings, Assessments, Support load
- [ ] Assessments uses the same desk list as Trainings
- [ ] Opening a training does not 500
- [ ] Training stage has an Overview film field (YouTube/Vimeo)

Wrong door:

- [ ] Father opening `/manager` lands on `/father`
- [ ] Leader opening `/admin` lands on `/manager`

## F. Do not regress

- [ ] No new links to `/super-admin` (that path does not exist; admin is `/admin`).
- [ ] Deleted files are not imported.
- [ ] Root `veterans.html` / `employers.html` / `gatherings.html` are not in `git ls-files`.
