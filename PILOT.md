# Clean Pilot — runbook

This Next.js app lives on the `clean-pilot` branch and talks to the **Pilot** Supabase project. It is not the old static HTML site.

## 1. Create a Manager

Signup (`/signup`) is for fathers and requires an invite code. The first Manager cannot use that form.

### In the Supabase dashboard

1. Open the **Pilot** project (not production).
2. **Authentication → Users → Add user**
   - Email and password
   - Auto-confirm the email
3. **SQL Editor** → paste `supabase/sql/promote_pilot_role.sql`
   - Change `manager@example.com` to that email
   - Run
4. Sign in at `/login`, then **sign out and sign in once** so the JWT picks up `role: manager`.

The script sets both places the app reads:

| Store | Used for |
|---|---|
| `auth.users.raw_app_meta_data.role` | Middleware and page routing |
| `public.profiles.role` | RLS (`current_user_role()`) |

Dashboard-only alternative for step 3: open the user → **App Metadata** → `{ "role": "manager" }`, then in SQL:

```sql
update public.profiles
set role = 'manager'
where id = (select id from auth.users where email = 'manager@example.com');
```

A Reviewer is the same flow with the Reviewer block at the bottom of the SQL file.

## 2. Invite code

After the Manager script runs, it creates **Pilot Group** if none exists and prints the code.

**From the app:** sign in as Manager → `/manager` → **Group invite code** → Copy. If no group exists, name it and click **Create group**.

**From SQL:**

```sql
select name, invite_code
from public.groups
order by created_at;
```

Fathers enter that code on `/signup`.

For local testing, turn off **Authentication → Providers → Email → Confirm email** on the Pilot project so signup creates a session immediately.

## 3. Manual test checklist

Use three browsers or three profiles (Manager, Father, Reviewer).

### Manager
- [ ] Sign in at `/login` → lands on `/manager`
- [ ] Summary cards render (zeros are fine)
- [ ] Invite code is visible and Copy works
- [ ] `/manager/participants` is empty until a father joins

### Father join
- [ ] `/signup` with the invite code, email, password
- [ ] Lands on `/father`
- [ ] Manager → Participants shows the new father
- [ ] Bad invite code is rejected

### Father sessions
- [ ] Home shows **Continue Training** and the three trainings
- [ ] Open a session → YouTube placeholder plays
- [ ] **I watched this** → Check-in (3 questions) → Action
- [ ] **I’ll do this later** returns home; session is not complete
- [ ] **I completed this Action** → session counts as done
- [ ] Continue card moves to the next incomplete session

### Father Profile
- [ ] **Start Profile** → Question 1 of 128
- [ ] **Save & Exit** → Home shows in-progress
- [ ] **Continue Profile** resumes the next unanswered question
- [ ] Submit the last question → `/father/profile/results` shows Primary Edge and Determination
- [ ] Manager participant detail shows the same Edge / Determination (no raw answers required)

### Manager actions
- [ ] Assign a training
- [ ] Mark a training complete
- [ ] Send Certificate → serial appears (no PDF yet)
- [ ] Needs Attention updates

### Reviewer
- [ ] Sign in as Reviewer → `/reviewer`
- [ ] Sees totals only and the line **All data is anonymized and aggregated.**
- [ ] No names, emails, or participant links
- [ ] `/manager` and `/father` redirect away

### Locked doors
- [ ] Signed-out `/father`, `/manager`, `/reviewer` → `/login`
- [ ] Father cannot open `/manager` or `/reviewer`

## 4. Deploy to a **new** Vercel project

Do **not** change the existing production Vercel project (`fathers-com-platform.vercel.app` / the static HTML site). Do **not** point that project at `clean-pilot`. Do **not** attach `fathers.com` or the current production domain to this app.

### Create the project

1. [vercel.com/new](https://vercel.com/new) → **Add New Project**
2. Import this GitHub repo
3. Settings:
   - **Project name:** `fathers-com-pilot` (or similar — not the production project name)
   - **Branch:** `clean-pilot` only
   - **Framework Preset:** Next.js
   - **Build command:** `npm run build`
   - **Install command:** `npm install`
4. Environment variables (Pilot Supabase, not production):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Pilot project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pilot publishable/anon key |
   | `NEXT_PUBLIC_SITE_URL` | `https://fathers-com-pilot.vercel.app` (or your new subdomain) |

5. Deploy. After the first URL exists, set `NEXT_PUBLIC_SITE_URL` to that URL and redeploy if needed.

### Supabase Auth allow-list

In the **Pilot** project: **Authentication → URL Configuration**

- Site URL: the new Vercel URL
- Redirect URLs: `http://localhost:3000/**` and `https://<your-pilot-host>/**`

### Custom subdomain (optional)

In the **new** Vercel project only: **Settings → Domains** → add something like `pilot.fathers.com`. Leave production domains on the old project.

### Local

```bash
npm install
# .env.local already points at the Pilot Supabase project
npm run dev
```

Open http://localhost:3000
