# Archived static site

These `*.html` files and `build_*.py` scripts are the **previous** Fathers.com front end. They are not the clean-pilot product.

The live app is Next.js in `/app`. `npm run dev` does not serve this folder.

Why they existed at the repo root: the old pipeline generated pages with Python and committed the HTML. That work predates the React app. They were left at root during the clean-pilot port, which made the review repo look like two products.

`assets/` here still holds CSS and JS those pages linked to. Do not treat that folder as Next.js source.

Playwright tests under `tests/e2e/` were written for this static tree. Current CI runs the Next.js typecheck, lint, and `tests/*.test.ts` only.
