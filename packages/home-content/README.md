# Managed Home content

`apps/admin` and `apps/customer` use this dependency-free content contract.
The customer tabs no longer keep separate copies of their section order,
headings, categories, brand lists or selection rules.

- `model.js`: supported section types and empty section/item factories.
- `defaults.js`: initial Grocery, Fruit & Veg and Regional layouts.
- `validation.js`: bounded, strict validation used before publishing and rendering.
- `selection.js`: deterministic product selection and reference extraction.
- `index.d.ts`: the shared TypeScript contract.

Admin: **Home Tab Content** (`/home-content`). Select a tab, arrange sections,
edit content, then **Publish to customer app**. Editing is a local draft;
publication updates one database row atomically. Hidden sections retain their
settings. Removed sections can be recovered using publish history. Saving
against a stale revision returns HTTP 409 and preserves the editor's draft.
Home Categories still manages header ordering; linked tab titles and visibility
stay synchronized in both directions through guarded database triggers.

Available renderers: product collections, category tiles, local brands, nearby
shops, image banners, illustrated product heroes, and the app brand footer.
Collections support horizontal scrolling or grids, 2–4 columns, item limits,
editable buttons, optional backgrounds, and empty-state visibility. Category
and brand items have their own title, image, description, visibility, order,
and product rules; brands also have an origin field.

Curated products retain their selected order. Automatic collections match
literal, case-insensitive terms. Category, store, exclusion and discount rules
also apply to curated products. Category references select real subcategories
from the catalogue, rather than relying on free-text category labels.

The customer intersects every selection with the existing delivery-address
inventory (the nearest five shops). Closed-shop products are read-only in shop
previews and excluded from orderable collections. Deleted, unapproved and
out-of-stock listings cannot become invented replacements. No demo products,
brand identities, grower identities or pack sizes are synthesized by this feed.
Home-grown produce, seasonal picks, new discoveries and local brands must be
curated by the admin; defaults make no unsupported verification claims.

Temporary layout preview: `preview.js` builds explicit seed documents from
existing approved food listings. Sparse sections intentionally reuse those
listings, so category/grower/seasonal placement is illustrative. Empty brand
rows get three clearly named sample brands. Discount collections retain actual
discount eligibility. This helper is not imported by the customer feed and does
not create inventory, stores or producer verification. Published seed documents
are editable in admin; restore the preceding revision from publish history to
discard the preview. Replace these selections before a production launch.

Database: `backend/migrations/059_home_content.sql` creates `home_content`,
immutable publication snapshots in `home_content_history`, revision/audit/header
sync triggers, public read-only content access and Realtime publication entries.
Apply migrations before deploying the admin/backend/customer changes together.
Build the admin from the repository checkout: its shared contract lives outside
the admin directory and is covered by its Turbopack/tracing root configuration.

Public API: `GET /home/content` and `GET /home/content/events`. Admin API:
`GET/PUT /api/home-content/:tab`, `GET /api/home-content/:tab?history=1`, and
paginated `GET /api/home-content/catalogue`. Writes require the allowed founder
session, validate catalogue references, and compare the current revision.
Public access excludes the editor identity and publication history.

Customer devices share one foreground SSE connection per app runtime. Each
backend process shares one database channel across its customer connections.
Events contain only content/stock invalidations, not private database rows.
Reconnects refresh content and inventory; a single 30-second foreground timer
provides recovery when streaming is unavailable. Admin drafts are never replaced
by incoming updates; the editor flags newer publications and offers reload.

Checks: backend Home content contract/API tests, all three TypeScript builds,
targeted lint, admin production build and customer iOS export. Database checks
should exercise RLS, optimistic revisions and bidirectional header sync inside
a transaction that is rolled back. A live invalidation smoke test may publish
an identical document to confirm database-to-backend streaming.
