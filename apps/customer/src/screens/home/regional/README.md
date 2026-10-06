# Regional tab

RegionalTab is the Home Regional entry point. The previous hero and placeholder local-store stories have been removed.

```
regional/
  RegionalTab.tsx
  coconut-oil/
    CoconutOilSection.tsx
    CoconutOilScreen.tsx
    CoconutOilHeaderImage.tsx
    useCoconutOilProducts.ts
    data.ts
  brand-banner/
    RegionalBrandBanner.tsx
  all-district-products/
    AllDistrictProductsSection.tsx
    useDistrictCatalogue.ts
    data.ts
  preview/
    data.ts
    RegionalPreviewNotice.tsx
  nearby-shops/
    NearbyShopsSection.tsx
    useRegionalShops.ts
  something-new/
    SomethingNewSection.tsx
    DiscoveryProductCard.tsx
    useSomethingNew.ts
    data.ts
  local-offers/
    LocalOffersSection.tsx
    useLocalOffers.ts
  components/
    RegionalSectionState.tsx
  brands-around-here/
    BrandsAroundHereSection.tsx
    DistrictBrandCard.tsx
    useDistrictBrands.ts
    data.ts
  district-favourites/
    DistrictFavouritesSection.tsx
    useDistrictFavourites.ts
    data.ts
  shop-by-category/
    ShopByCategorySection.tsx
    RegionalCategoryTile.tsx
    RegionalCategoryScreen.tsx
    useRegionalCategories.ts
    data.ts
```

Shop by Category supports Local Snacks, Sweets, Pantry Staples, Spice Mixes, Drinks and Pickles in a responsive three-column grid. All six discovery tiles remain visible in a two-row, three-column grid, using pastel gradients and bold labels. Tile photos come from that category’s actual stock at nearby shops; a decorative icon is used when no matching photo is available. Showing a category does not imply stock: its listing shows only real available products and handles empty stock. Without an address, tiles open location selection. No sample products or fabricated shops are added.

Category definitions contain stable IDs, display styles and product-name matching rules. The same rules are reused by discovery and RegionalCategoryScreen, which renders the existing real-stock product listing and cart/detail interactions. Invalid category IDs provide a back action. Address, loading, retry and empty states are handled explicitly.

The shared nearby inventory query cache is reused; no additional API or database changes are required. Product-name rules are an interim catalogue classification, not proof of regional manufacture or origin. Local Snacks is a nearby-shopping label. Verified regional sourcing requires catalogue metadata before provenance claims can be displayed.

Your District’s Favourites follows Shop by Category with its original title and a plain horizontal row of up to six standard product cards (128px width, 12px gap, 140px snapping). The old cream background, heading icon and padded card wrappers are removed. Live selection balances regional food categories and uses actual photographed nearby stock. When no matching stock exists, six clearly labelled read-only design products keep the requested layout visible, without mixing samples into real stock. Address/retry controls remain available when needed. This is editorial discovery, not a measured popularity ranking or local-manufacture claim.

Brands from Around Here follows District Favourites with a three-column grid of brand cards showing a logo (or monogram), name and place of origin. Real records require a checked entry in VERIFIED_LOCAL_BRANDS, nonempty origin, explicit district coverage in DISTRICT_BRAND_COLLECTIONS and linked stock from nearby open stores. A seller’s district is never treated as brand provenance. Until district curation is configured, existing fictional concept brands are clearly marked Preview, with Concept brand as their origin; none carry a Verified badge. Cards are informative, without a false shopping action or fabricated product associations. Configured-but-empty districts use location/loading/retry/empty states.

From Nearby Shops follows the brand grid. Up to four distance-ranked partner shops show three balanced regional-category products from each seller’s own inventory. Each card has a View store button linked to that seller’s StoreDetail route. Closed shops remain browseable but cannot add products. When no real shops qualify, two sample neighbourhood shop cards show three read-only product cards side by side and a disabled gray View store button each. No design-preview caption is shown. Real shops replace samples automatically; address/retry controls remain below samples when needed.

Something New to Try follows the shops with up to six discovery cards. Editorial name rules select less-familiar food types; every item needs a nonempty real catalogue description. The short explanation is plain text derived from that description, limited visually to three lines; the product detail retains the full description. This is not a measured popularity/personalisation claim, and no explanations or sample products are invented.

Local Offers ends the current section list with a sage-backed product rail. Only nearby open-store stock in the regional category groups qualifies, with finite nonnegative current prices and recorded original prices strictly above the current price. Existing cards show genuine recorded savings and support shopping. No cross-district global deals feed, artificial discounts or fake availability are used. Local refers to address-nearby stock, not verified manufacture in the district.

All three new sections reuse the inventory query cache and RegionalSectionState for address/loading/retry/empty handling.

Temporary visual previews are enabled for the three newest sections when their matching live feed is empty. Something New shows three read-only examples with labelled sample explanations. Local Offers shows six read-only sample cards with illustrative prices and discounts. All carry a Design preview notice; sample product interactions, wishlist/cart and detail sheets are disabled via GroceryProductTile. Sample images use the existing shared placeholder, not claimed actual packaging. Any matching live stock takes priority, and previews are never mixed into a real rail. Location/retry controls remain available below previews when needed. These design fallbacks supersede the earlier no-samples behaviour for these three sections only.

RegionalBrandBanner replaces Meet the Maker after Local Offers. It displays the supplied regional-brand.png image with no extra title or story card. Native image metadata supplies the original width and height; display width uses 20px side gutters and a 420px maximum, with height calculated proportionally from the original aspect ratio. Top corners use 28px rounding; a bottom gradient fade blends into Home’s white page background. No fixed height, cropping or stretching is used. Metadata/image failures offer a manual reload action; late metadata callbacks are ignored after unmount.

All District Products follows Coconut Oil Picks with up to nine available products in three columns. Live stock takes priority; when empty, nine read-only sample cards show the layout. Repeated product IDs are removed while separate seller listings remain. The View all button, standalone catalogue screen, route and filtering code have been removed.

The shared BrandFooter ends the Regional page and owns bottom-navigation clearance.

Coconut Oil Picks sits between the regional brand banner and All District Products. A sage-to-cream background and decorative coconut illustration frame existing product cards, up to six horizontally, with Explore coconut oils opening a complete two-column listing. Original packaging imagery comes from real catalogue data; the coconut drawing is decorative.

The shared hook selects coconut/nariyal/copra oil with positive food-category or explicit edible/cooking labels, excluding hair, skin, personal-care and cosmetic terms. Only nearby open-store stock qualifies. Checked eligible district brands are prioritised, preserving nearest-store order within checked/other stock; an origin badge appears only for a linked checked brand. Generic nearby oils are not represented as district-made, pure, organic or cold-pressed unless those labels come from the product itself. When no matching stock exists, three labelled read-only sample pack sizes appear without brand or provenance claims. Location/retry actions remain available. The section and full listing share exactly the same filtering and preview logic.

Validation includes eleven classification assertions covering edible names, hyphenated names, explicit cooking labels, unknown categories, non-coconut products and exclusion of cosmetic oils.
