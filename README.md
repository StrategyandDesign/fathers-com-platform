# Fathers.com — clean-pilot

This repository is the **Next.js 15** app. The product is `app/`, `components/`, `lib/`, and `supabase/`.

Root HTML is gone on purpose. The old static site lives in `archive/static-site/` and is not what `npm run dev` serves.

Official copies for Erik are even-numbered and date-stamped. See `SUBMITS.md`. **Submit 2** (19 Aug 2026) is frozen on `submit/2`.

## Transfer

Read in this order. Do not start in `docs/product/` or `archive/`.

1. This file
2. [docs/engineering/PILOT.md](docs/engineering/PILOT.md) — run, seats, hosts
3. [handoff/00-SUBMISSION-GUIDE.md](handoff/00-SUBMISSION-GUIDE.md) — what to send a reviewer
4. [CONTRIBUTING.md](CONTRIBUTING.md) — who owns what

| What | Where |
|---|---|
| How we work | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Official submit record | [SUBMITS.md](SUBMITS.md) |
| Shared desk marks | [SHARED.md](SHARED.md) |
| Everything else written down | [docs/README.md](docs/README.md) |

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://127.0.0.1:3000/login

Pilot seats (password `12345` on local and Vercel): `father@nwa`, `manager@nwa`, `reviewer@nwa`, plus the Unit 8200 `*@il` seats and `admin@fathers`. Details in the runbook.

```bash
npm run lint
npx tsx --test tests/*.test.ts
npx tsc --noEmit
```

## What belongs where

| Keep reading | History — skip unless you need it |
|---|---|
| `app/` routes | `archive/static-site/` old HTML and Python builders |
| `components/` React UI | `docs/product/` discovery notes |
| `lib/` server and domain logic | `docs/archive/` outdated architecture writeups |
| `supabase/` schema and RLS | `handoff/` reviewer packet |
| `tests/` | `partner-kit/` field PDFs |
| `public/` brand files for Next | `emails/` unused Resend HTML kit |

Do not add new markdown to the repo root. Product notes go in `docs/product/`. Engineering runbooks go in `docs/engineering/`. The only root docs are `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `SHARED.md`, and `SUBMITS.md`.

This repo is the review line. Do not use https://fathers-com-platform.vercel.app to judge it.
