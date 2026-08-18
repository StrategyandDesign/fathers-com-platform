# Fathers.com — clean-pilot (Next.js)

This repository is the **Next.js clean-pilot app** for review and hardening. It is not the older static HTML Fathers.com site, and it is not a production cutover of `fathers.com`.

| What | Where |
|---|---|
| Runbook | `PILOT.md` |
| App | `app/` — Next.js 15 App Router |
| Auth / data | Pilot Supabase project `koeplcybddrvbliuepsy` |
| Handoff for reviewers | `handoff/` |

```bash
npm install
# Copy .env.example to .env.local. Missing Supabase keys fall back to the Pilot project.
npm run dev
```

Open http://localhost:3000

- Lint: `npm run lint`
- Unit tests: `npx tsx --test tests/*.test.ts`
- Typecheck: `npx tsc --noEmit`

Start here: `handoff/00-SUBMISSION-GUIDE.md`

This repo is the review line. Do not use https://fathers-com-platform.vercel.app to judge it. That host serves a different line.
