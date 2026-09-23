# Hugo Media Catalog

UA/PL catalog for notebooks, phones, tablets, headphones, smartwatches and monitors. White/gray/lavender design using the supplied Hugo Media logo.

## Implemented

- Search, category-specific filters, numeric price sorting and product links (`?product=ID`).
- Multi-product selection retained locally; availability rechecked before opening a Telegram draft to **@HUGO_Media**. The customer must press Send. No bot, automatic message, payment or automatic reservation.
- Admin email/password sign-in through Supabase; account allowlist enforced by PostgreSQL RLS, not only UI controls.
- Persistent product create/edit/duplicate/delete and status changes. Drafts are private; available/reserved/sold product pages are public. The main catalog lists available products.
- Up to 8 genuine photographs per item. JPEG/PNG/WebP input is compressed to 1600px WebP before upload. Photos can be removed or made primary.
- Real empty/loading/error states. No demonstration inventory is inserted into the database.

## Current deployment state

Supabase schema and photo bucket were applied to project lukxdctqcaprfwfisblw. Transactional anonymous/non-admin/admin database access tests passed, and the temporary test records were rolled back. The actual owner account remains to be provisioned; there are no real products yet. A Vercel preview deployment was submitted; final readiness and browser acceptance remain to be verified.

`prototype.html` is the approved design reference only. The production build excludes it and its simulated admin UI.

## Local checks / build

Node.js 22 or later; no npm install needed for the build or tests.

```sh
npm run check
npm test
npm run build
python3 -m http.server 3000 --directory dist
```

The browser imports Supabase JS **2.57.4** from esm.sh and Lucide **0.453.0** from jsDelivr. These services must be reachable. Failed backend loading displays a retry state. Serve over HTTPS in production.

## Supabase setup (existing free project)

1. Apply `supabase/schema.sql` as database owner. It creates isolated `hmg_catalog_*` tables and the `hmg-catalog-photos` bucket without changing the old CRM/catalog tables.
2. Create or invite the actual owner's account via Supabase Auth. Do not invent an email or password. Disable public signups.
3. Insert that user's verified UUID into `public.hmg_catalog_admins`. Users cannot grant themselves admin access. Existing non-admin accounts cannot manage products.
4. Run `supabase/tests/access.sql`. It performs public/non-admin/owner checks inside a rolled-back transaction. A provisioned owner is required.
5. Inspect database security advisors and verify Storage policies. This repository's tests cannot establish the safety of unrelated policies already present in the chosen project.

For the daily recommendations feature, apply `supabase/daily_picks.sql` after `supabase/audit.sql`. The recommendations are selected in the admin tab «Рекомендуємо сьогодні» and expire at midnight in Warsaw. The database enforces a maximum of two distinct products per day; changes appear in the owner's activity log.

Photo objects are public merchandise images, including uploaded photos that have not yet been published. Never upload private documents. Removing a photo or product does not immediately delete its Storage object because duplicate products may share the image. Review unattached photos in Storage periodically to control free-tier space.

## Vercel

Import **hugo-media/hugo-media-catalog** into the intended Vercel account. The supplied `vercel.json` sets the build command and `dist` output. No new paid service should be enabled.

Public client settings are supplied in public-config.json (safe to expose; all write access is enforced by RLS). The following environment variables can override them:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (preferred), or legacy `SUPABASE_ANON_KEY`

Only public client settings are emitted to `dist/config.js`. The build rejects service-role/secret keys. Never put database passwords, access tokens or secret keys in the repository.

No configured credentials: the site shows an explicit preparing-catalog state. It never silently switches to fake inventory or a fake administrator.

For local configured builds, export the public variables into the shell before `npm run build`. The build does not load `.env` automatically.

## Required live acceptance checks

- Public visitor sees published products but cannot read draft rows or write data.
- Authenticated non-owner cannot edit products, grant admin access or upload/delete photos.
- Owner signs in, uploads a real test image, saves a draft, publishes, edits, marks sold and deletes a disposable test product.
- Refresh in a separate browser proves database persistence; sign out proves admin removal.
- UA/PL views, filters and Telegram draft work on desktop and mobile. Telegram dispatch remains a deliberate customer action.
- Check the actual hosting plan permits intended usage before a commercial launch.

## Sources used

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://core.telegram.org/api/links#public-username-links
