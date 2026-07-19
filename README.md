# Fathers.com Platform

Static HTML prototype of the full platform, prepped for GitHub, Supabase, and Resend. Built to the fourteen-prompt series (P0-P13) and the FORGE design system.

**v4.0 reposition (July 2026):** NCF certifies organizations and facilitators; participants complete free and receive a Certificate of Completion at no cost. Two tracks (Fatherhood, Manhood). The military surface is dark behind `SHOW_MILITARY` in `build_pages.py`. Decisions, research basis, pricing, and gates live in `POSITIONING.md`. The draft Keystone Manhood Profile (KMP-0.1) is in `assets/js/keystone-manhood-data.js`, deployment gated on psychometric sign-off.

## Preview locally
```
python3 -m http.server 8000      # or: npx serve
```
Open http://localhost:8000

## Structure
```
index.html            P1  Marketing homepage
profile.html          P2  Keystone Profile (working 17-step engine, demo scoring)
stories.html          P3  Story hub          story.html    P3  Story detail + submissions
classes.html          P4  Catalog + search   class.html    P4  Class detail
player.html           P5  Lesson player
plan.html             P6  My Plan / Progress / My List
circles.html          P7  Circle member + leader + roster
groups.html           P7  Groups marketing + org admin
checkout.html         P8  Checkout + confirmation
gift.html             P8  Gift builder + redemption
sponsor.html          P8  Sponsor a Father
account.html          P9  Settings, membership, cancel path
certificates.html     P10 Certificate catalog + course + verification states
certificate.html      P10 The certificate artifact
verify.html           P10 Public serial verification (live or demo)
login.html            Auth  Magic-link sign in
admin.html            Admin dashboard: roles, content, orgs, audit
studio.html           Instructor: course-builder + instrument-builder
org.html              Org admin: seats, invites, participation
lead.html             Circle leader: weeks, announcements, roster
veterans.html         P11 Present at Home program
employers.html        P12 Design-partner landing
assets/               FORGE css, js, logomarks
emails/               P13 Nine Resend templates + manifest + README
supabase/             schema.sql + schema_rbac.sql + edge functions
ROLES.md              Roles, permissions, dashboards
LAUNCH.md             Go-live checklist
```

## Push to GitHub
```
git init && git add -A && git commit -m "Fathers.com platform v1"
git remote add origin git@github.com:YOUR-ORG/fathers-com.git
git push -u origin main
```
Deploy the static site with GitHub Pages (Settings > Pages > main), Vercel, or Netlify. No build step.

## Wire Supabase
1. Create a project at supabase.com.
2. SQL editor: paste `supabase/schema.sql` and run. Seeds the nine classes, four certificate courses, and the two demo serials used by verify.html.
3. Auth: enable Email (OTP) plus Apple and Google if wanted.
4. Put the project URL and anon key into `assets/js/supabase-client.js`, uncomment the client, and follow the wiring map in that file.
5. Certificates are issued server side only. The public `public_certificates` view backs verify.html.

## Wire Resend
1. Verify your sending domain in Resend.
2. `supabase secrets set RESEND_API_KEY=re_...`
3. `supabase functions deploy send-email`
4. See `emails/README.md` for the call shape and placeholder list.

## Live wiring (dual mode)
Empty keys in `assets/js/config.js` = demo mode: everything renders, progress stays on the device. Keys present = live: magic-link auth, Keystone results and plans persisted, live My Plan, lesson progress, database-backed certificate verification, all forms writing to tables, Stripe Payment Link checkout. Full go-live steps in LAUNCH.md.

Still stubbed in v1: ID-verified certificate issuance, gift redemption automation, live Circle threads, scheduled emails, and the Keystone scoring algorithm (demo only, replace before validity claims).

## FORGE v1.1 design tokens
- Dual palette: black (default) and light. The switch sits in the nav, floats on chromeless pages, and persists per device.
- Contrast raised across both palettes: white on black primary text, secondary text at 8:1 or better, strong hairlines, AA-passing buttons and pills.
- All sans serif: Barlow Condensed for display, Inter for UI and body, IBM Plex Mono for serials and data.

## Standing rules
- Images are placeholder slots with registry IDs (Appendix A of the prompt series). Photography maps to slot IDs. No design rework.
- IP rule: layout patterns only. No third-party assets, names, fonts, or copy anywhere in this repo.
- Voice: short declarative sentences. Training, standards, proof. No em dashes.
