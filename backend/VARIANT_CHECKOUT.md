# Product pack checkout

Customer cart rows have a UI `id`, a base `productId` and an optional `variantId`. UI keys may use `productId::variantId`, but API requests always send separate `product_id` and `variant_id` fields. `expected_unit_price` is a comparison with the displayed cart price, never an authoritative price. Changed prices return 409 and require the customer to reselect the pack.

`checkoutItems.ts` validates input and resolves catalogue pack prices, labels and MRP. `checkoutCatalog.ts` performs the shared catalogue read. Both single-store and multi-store routes use the same priced lines, and grouping never collapses different packs of the same product. Duplicate aliases for the same actual pack combine quantities. Products without variants remain supported using their recorded base price and unit. Legacy clients without a variant ID resolve to the actual default pack.

Only actual database packs are exposed by `mapApiProduct`. One pack is displayed without inventing another; no packs uses the base unit. Cart persistence version 1 separates legacy composite keys and drops synthetic `preview-*` packs. Product cards and the product sheet use the same default-pack line key. Wishlist requests always use base product IDs.

Migration `062_order_product_variants.sql` adds nullable `variant_id`, `unit_at_order` and `variant_mrp_at_order` snapshots to order items and updates both existing order RPCs without changing signatures. The insert trigger rechecks parent-product availability, variant ownership, price and pack inside the transaction, using share locks to prevent catalogue changes before commit. A concurrent price/pack change rolls back the entire order/trip. Historical items retain null fields; deleting a variant clears its FK without losing the recorded pack or price.

Availability is currently product-level: `product_variants` has no independent stock flag. All packs inherit the product's stock availability. This change does not introduce quantity reservations or a per-pack stock-management UI.

Customer order summaries, partner order preparation and rider pickup verification prefer the recorded pack, falling back to the product unit for historical orders. Bill calculations prefer the variant MRP snapshot; migration 060 is independent and is not applied by this migration.

Apply migration 062 before deploying the updated backend and then the customer app. Existing RPC calls still work after migration; the updated backend requires it to store pack metadata. Configured-database activation requires approval when blocked by automatic review.

The backend checks snapshot-column availability before checkout. A successful check is shared and cached per process; failures are retried. Checkout returns 503 while the migration is absent, rather than creating orders that silently lose the selected pack.

Tests: run `npm test` in `backend`. To verify SQL, create an empty isolated PostgreSQL database named `flikk_variant_tests` and run `psql -d flikk_variant_tests -f backend/tests/sql/variant-checkout.sql` from the repository root. The fixture refuses other database names. Never run it against application data.
