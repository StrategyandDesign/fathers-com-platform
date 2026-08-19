# Fathers.com clean-pilot

This **is** the Next.js 15 / React 19 app.

You are already on the current tree. There is no extra branch to check out.

The product is `app/`, `components/`, `lib/`, and `supabase/`. Root HTML is gone on purpose. Those old static pages live in `archive/static-site/` and are not what this app is.

Yes, it is React. `package.json` lists `react` `19.1.0` and `next` `15.5.23`. UI is `.tsx`. Interactive files start with `"use client"`.

## Open these

| This is the product | This is history — skip it |
|---|---|
| `app/` pages and routes | `archive/static-site/` old HTML + Python builders |
| `components/` React UI | `docs/product/` discovery notes |
| `lib/` server and domain logic | `docs/archive/` outdated architecture writeups |
| `supabase/` schema and RLS | `handoff/` reviewer packet |
| `tests/` | `partner-kit/` field PDFs |
| `CONTRIBUTING.md` | `assets/` leftover CSS/JS from the old HTML site |

Pilot login if you run it: password `12345` · `father@nwa` · `manager@nwa` · `reviewer@nwa` · `admin@fathers`. Seats and hosts: `docs/engineering/PILOT.md`.

```bash
cp .env.example .env.local
npm install
npm run dev
```

http://127.0.0.1:3000/login

```bash
npm run lint
npx tsx --test tests/*.test.ts
npx tsc --noEmit
```

## Numbering

This default tree is the shared drop. Snapshots are tagged `shared/N` in `SHARED.md`. `submit/2` is a frozen official stamp — leave it alone.

Do not use https://fathers-com-platform.vercel.app to judge this line.
