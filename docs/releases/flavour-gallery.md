# Flavour photo galleries

Each flavour has a cover and up to seven extra photos. Admins can replace its
cover and reorder/remove extra photos in Add/Edit product. Save waits for all
flavour uploads to finish. Removing a flavour while uploading cannot attach its
photos to another row. Removing a photo removes the reference, not a potentially
shared object in storage.

The customer detail gallery shows only the selected flavour's photos, starting
at its cover. A flavour without photos uses the product gallery. Existing single
cover flavours and older clients remain supported. Prices, sizes and checkout
selection are unchanged.

## Deployment order

1. Apply `20261111160000_flavour_extra_images.sql` through the approved migration
   runner. It adds an empty array to existing flavour records; no images are deleted.
2. Deploy backend and admin. Both query the new column, so do not deploy them first.
3. Deliver the customer JavaScript change through the compatible preview/release
   process; verify two flavours with different galleries on Android and iPhone.
   Older installed versions continue showing their existing single-cover behavior.

Validation: migration manifest, fresh PostgreSQL migration chain and flavour SQL
regressions; admin validation/persistence tests; customer gallery/cart tests;
admin/customer/backend type checks and targeted lint.

Rollback: revert application code first and retain the additive database column
and image references. Do not drop the column while any deployed selector uses it.
