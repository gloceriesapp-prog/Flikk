# Notched product image

`notchedCardGeometry.ts` owns the 4:4.5 tile, 16px corners, button diameter
(max of 40px and 28% of the measured card width), 5px transparent clearance,
and tangent 8px fillets. The quantity pill and SVG clip share one 180ms width
animation. On narrow cards, the pill width is bounded to keep the wishlist
control separate. Quantity changes do not change the image or footer height.

`NotchedProductGallery` keeps native gesture handling outside the SVG. Photos
still use `AppImage` for existing caching, resizing and fallback behaviour;
SVG ForeignObject clips their drawing. A decoded-photo callback invalidates
the SVG cache. Photos after the first remain unmounted until a horizontal
swipe. Vertical gestures stay with the browse list.

`ProductWishlistButton` uses the existing account-backed store. Its 44px
hit area positions the 25px heart approximately 8px from the visible edges.
All cart identities, prices, option selection and stock checks remain in the
existing card/store code. No dependency or native-module changes.

## Checks

- `npm test -- --watchman=false --runInBand --watch=false --runTestsByPath __tests__/notchedProductCard.test.tsx __tests__/flavourPicker.test.tsx __tests__/productCardCartControl.test.tsx`
- `node scripts/visual/notched-product-card.mjs` (from apps/customer)
  or `node apps/customer/scripts/visual/notched-product-card.mjs` (repo root).
- Serve `output/playwright` on localhost and open `notched-card-360.html` and
  `notched-card-430.html`. These deterministic browser fixtures use production
  SVG geometry and cover default, quantities 1/5, unavailable, veg/non-veg,
  unset veg and wishlist on/off, in grids and horizontal rails.

The PNGs are browser-rendered visual fixtures, not native-device screenshots.
Native image decoding, SVG clipping and gesture animation should also be
checked on iPhone and Android before a release.
