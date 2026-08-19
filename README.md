# Fathers.com clean-pilot

This is the **Next.js 15 / React 19** app. Clone this repo, run it, harden `app/`, `lib/`, and `supabase/`.

It is not the old static HTML site. Those pages used to sit in the repo root. They now live in `archive/static-site/` and are not what `npm run dev` serves.

## Start (Eric)

```bash
git clone https://github.com/StrategyandDesign/fathers-com-clean-pilot.git
cd fathers-com-clean-pilot
git checkout review
cp .env.example .env.local
npm install
npm run dev
```

Open http://127.0.0.1:3000/login

Pilot password: `12345`  
Seats: `father@nwa` · `manager@nwa` · `reviewer@nwa` · `admin@fathers`

Missing Supabase env vars fall back to the Pilot project. Full seat list and hosts: `docs/engineering/PILOT.md`.

```bash
npm run lint
npx tsx --test tests/*.test.ts
npx tsc --noEmit
```

## What to work on

| Work here | Ignore unless you need history |
|---|---|
| `app/` pages and routes | `archive/static-site/` old HTML + Python builders |
| `components/` React UI | `docs/product/` discovery notes |
| `lib/` server and domain logic | `docs/archive/` outdated architecture writeups |
| `supabase/migrations/` schema and RLS | `handoff/` reviewer packet |
| `tests/*.test.ts` | `partner-kit/` field PDFs and scripts |
| `package.json` | `assets/` leftover CSS/JS from the old HTML site |

Stack evidence: `package.json` lists `react` `19.1.0` and `next` `15.5.23`. UI is `.tsx`. Interactive files start with `"use client"`.

## How this repo is numbered

| Mark | Meaning |
|---|---|
| **`review`** | Current shared drop. Use this to start work. |
| **`shared/N`** | Numbered snapshots of `review`. Ledger: `SHARED.md`. |
| **`submit/2`** | Frozen official stamp. Do not move it. Older tree. |

## Docs map

- `CONTRIBUTING.md` — how product discovery and backend hardening share this repo
- `docs/README.md` — index of everything else
- `docs/engineering/PILOT.md` — runbook, seats, Supabase
- `AGENTS.md` — notes for cloud agents (not required for your work)

Do not use https://fathers-com-platform.vercel.app to judge this line. That host is a different branch.
