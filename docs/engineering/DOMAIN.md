# Canonical domain: where it stands

## Status
- Current production origin: https://fathers-com-platform.vercel.app
- Canonical custom domain: DECISION PENDING (owner: Micah). Recommendation on
  the table: a subdomain of fathers.com, for example app.fathers.com, so the
  NCF site and the platform stay distinct.

## The single change point
`build_pages.py`, line near the top:

    SITE_URL = "https://fathers-com-platform.vercel.app"

Everything that emits an absolute URL reads this constant:
1. Share cards and canonical links on every generated page (build_pages.py).
2. The partner kit print artifacts (partner-kit/make_inserts.py imports
   SITE_URL and derives the profile and verify URLs and their QR codes).

## The print rule
Paper outlives URLs. Nothing in the partner kit goes to a commercial printer
until the canonical domain is set. Once SITE_URL changes:
1. python3 build_pages.py
2. python3 partner-kit/make_inserts.py
3. Commit both. Vercel serves the new pages; the kit PDFs carry the new URLs.

## When the domain is set
- Add the domain in Vercel, point DNS, confirm certificates.
- Change SITE_URL, run the two commands above, commit.
- Old vercel.app URLs keep working (Vercel serves both); QR codes printed
  before the change still resolve.
