# Optional flavour stock quantities

Admin Products > Add/Edit > Flavours now accepts an optional available-pack count for each flavour. Blank preserves shared product-stock behaviour, zero makes that choice unavailable, and a positive count limits the flavour across all pack sizes. Product and pack stock remain the overall limits, as stated beside the input. The In stock checkbox remains a separate manual switch.

Checkout aggregates flavour quantities across sizes/cuts/servings. Existing inventory reservations atomically decrement counted flavour stock under the same parent-first lock ordering. Release from held/committed restores exactly once; consumed stock stays consumed. Historical reservations are not retrospectively counted. Clearing a counted flavour or deleting it is blocked while its counted reservations are active.

Flavour-list saving is transactional through service-role-only save_product_options, preserving omitted old-client stock, pricing and gallery fields. A conflict rolls back temporary names and the entire option-list edit. New stock changes emit the existing scoped inventory signal.

Customer feeds expose the effective availability, including to older builds that understand only is_available. Updated customer code adds flavour low-stock labels, correct availability identity and quantity limits. The current local styling is preserved. This PR also carries the previously requested shared-card low-stock label under the title in red and removes card ETA badges.

Validation:
- 70 backend/Admin-adapter/pricing/stock tests.
- 14 customer picker, cart and recommendation tests.
- 11 Admin validation tests.
- Type checks: backend, Admin, customer and active local customer source.
- All 188 canonical migrations applied on isolated PostgreSQL 17.
- SQL regressions: stock reservation, insufficient-stock rollback, restore-once, consumed stock, atomic edit conflicts, gallery preservation, inherited prices and permission restrictions.
- Two simultaneous local checkouts for one remaining flavour pack: one accepted, one rejected; no oversell.

Rollout: apply 20261114030000_flavour_stock_quantities.sql and record its manifest checksum before deploying backend/Admin. Existing rows start with null counts. No production migration, count changes, orders, payments, OTA or store release has been performed for this feature. Customer changes are present in the active local source; exact-device visual verification is pending.
