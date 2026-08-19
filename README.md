# Fathers.com — clean-pilot (Next.js)

This repository is the **Next.js clean-pilot app** for review and hardening. It is not the older static HTML Fathers.com site, and it is not a production cutover of `fathers.com`.

Official copies for Erik are even-numbered and date-stamped in the isolated repo. See `SUBMITS.md`. The first official stamp is **Submit 2** (19 Aug 2026) on frozen branch `submit/2`.

| What | Where |
|---|---|
| Official submit record | `SUBMITS.md` |
| Isolated frozen copy | https://github.com/StrategyandDesign/fathers-com-clean-pilot/tree/submit/2 |
| Runbook | `PILOT.md` |
| App | `app/` — Next.js 15 App Router |
| Auth / data | Pilot Supabase project `koeplcybddrvbliuepsy` |
| Handoff for reviewers | `handoff/` |

```bash
npm install
# Copy .env.example to .env.local. Missing Supabase keys fall back to the Pilot project.
npm run dev
```

Open http://127.0.0.1:3456/login

Pilot seats (password `12345` on local and Vercel): `father@nwa`, `manager@nwa`, `reviewer@nwa`, plus the Unit 8200 `*@il` seats and `admin@fathers`. See `PILOT.md`.

- Lint: `npm run lint`
- Unit tests: `npx tsx --test tests/*.test.ts`
- Typecheck: `npx tsc --noEmit`

Start here: `handoff/00-SUBMISSION-GUIDE.md`

This repo is the review line. Do not use https://fathers-com-platform.vercel.app to judge it. That host serves a different line.
