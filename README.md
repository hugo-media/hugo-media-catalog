# Hugo Media Catalog

New standalone project for the Hugo Media UA/PL product catalog.

## Current stage

Interactive design prototype approved for implementation. Includes categories, search, filters, product details, multi-product selection and a demonstration admin panel.

**This is not a production store:** all products are demonstration data, Telegram order sending is disabled, and admin changes are memory-only. No Supabase project or production administrator authentication is connected yet.

## Preview

Open `index.html` in a browser or serve the repository with any static HTTP server. `prototype.html` is the editable source fragment used for the design preview. The exported page includes its UI runtime; no npm build is required.

## Planned production implementation

- Supabase product database, image storage and admin authentication.
- Only the owner's account may create, edit or delete products; enforce this with database and storage policies.
- Ukrainian and Polish descriptions and category-specific filters.
- Telegram message draft to @HUGO_Media; customer must press Send.
- Real inventory and owner-supplied product photographs.

## Configuration

Never commit passwords, database connection strings, secret keys, service-role keys or `.env` files. No connection credentials are included in this repository.

Vercel deployment and Supabase setup have not been performed. Production hosting must meet the selected provider's terms and the owner's budget constraints.
