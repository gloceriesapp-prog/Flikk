# Flavour Add picker and pack prices

Product card Add opens a separate, lazy-mounted two-column picker only for products with added flavours. The original product is included. Product-body taps keep the current full product detail page. No fabricated products or prices are introduced.

Admin Add/Edit Product exposes optional store price and MRP per flavour/pack. Blank fields inherit pack pricing; clearing an override restores inheritance. Existing images, stock settings and markup rules remain. Overrides are keyed by normalized unit/quantity so routine pack ID-preserving edits retain the right price. A differently sized pack inherits its own base price until explicitly overridden.

The customer API returns only calculated customer prices keyed by real pack ID. Checkout resolves ownership, availability and pricing again, and the database order-line trigger checks the amount and stores the seller/customer/MRP snapshots. The original product uses a null option ID. Cuts, serving choices and pre-order slots remain part of cart selection. Quotes distinguish flavours of the same pack.

## Rollout

1. Apply `20261114020000_flavour_pack_prices.sql` through the approved migration runner and record its manifest checksum.
2. Deploy backend and Admin. Empty override maps preserve all existing prices. Raw store overrides are not publicly selectable.
3. Validate the compatible customer update/build on preview before releasing it. Do not configure live flavour-specific prices for old clients that do not support them.
4. Test card Add versus product-body taps, main/flavour selection, sizes, sold-out flavours, cart quantities, and quoted price changes. No new real payment is needed for picker verification.

## Validation

- 47 backend/pricing contract tests, including exact flavour quote matching.
- 14 customer UI/cart/recommendation tests.
- 11 existing Admin validation tests; new flavour-price validation is also exercised in the backend contract suite.
- All 187 migrations rebuilt successfully on isolated PostgreSQL 17.
- SQL regressions verified inherited prices, flavour snapshots, MRP caps, stale-price rejection and private-column permissions.
- Type checks passed for customer, Admin and backend.

The active local iPhone source was updated with a scoped patch, preserving its other UI edits. Physical visual confirmation is pending while the iPhone is in use in another app. No production migration, live price edit, store/OTA release or payment was performed for this feature.
