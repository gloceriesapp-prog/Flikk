# Fresh tab

Fresh now renders FreshTab rather than the generic HomeTabTileGrid. Its old admin tile grid and poster are not displayed; the shared grid remains available to other tabs.

```
fresh/
  FreshTab.tsx
  everyday-fresh/
    EverydayFreshSection.tsx
    data.ts
  home-grown-nearby/
    HomeGrownNearbySection.tsx
    HomeGrownBackground.tsx
    HomeGrownHeaderImage.tsx
    HomeGrownProduceScreen.tsx
    useHomeGrowers.ts
    data.ts
  everyday-vegetables/
    EverydayVegetablesSection.tsx
    EverydayVegetablesScreen.tsx
    data.ts
  fruit-favourites/
    FruitFavouritesSection.tsx
    FruitFavouritesScreen.tsx
    data.ts
  shop-fresh/
    ShopFreshSection.tsx
    FreshCategoryTile.tsx
    FreshCategoryScreen.tsx
    data.ts
  fresh-nearby-shops/
    FreshNearbyShopsSection.tsx
    useFreshNearbyShops.ts
  seasonal-picks/
    SeasonalPicksSection.tsx
    useSeasonalPicks.ts
    data.ts
  greens-and-herbs/
    GreensAndHerbsSection.tsx
    data.ts
  components/
    FreshSectionState.tsx
```

Fresh starts with Everyday Fresh, using an 18px bold title and a horizontally scrolling row of at most six existing product cards. It balances onion, tomato, potato, banana, lemon and coriander groups from real address-available stock, excluding common processed forms. Missing groups are skipped; no duplicate or sample products are inserted to fill six slots. Existing card detail/cart interactions and location/loading/retry/empty states are reused.

Shop Fresh follows Everyday Fresh with six category tiles in a three-column grid: Vegetables, Fruits, Leafy Greens, Herbs, Exotic Produce and Fresh Cuts. Tiles use actual matching product photos where available, otherwise decorative category icons. Each opens a dedicated real-stock listing, without the legacy CategoryDetail mock fallback. Category membership is based on product-name rules, with common processed forms excluded and fresh-cut products requiring explicit preparation terms. No prepared-product availability is fabricated.

The section order is Everyday Fresh, Shop Fresh, Everyday Vegetables, Fruit Favourites, Home-grown Nearby, Fresh From Nearby Shops, Seasonal Picks, Greens & Herbs and the shared BrandFooter. Collection titles are 18px bold without decorative subtitles; the Home-grown banner has its own larger headline.

Home-grown Nearby uses the full-width sage background with subtle foliage. Its padded two-line Your Neighbourhood / Harvest title can overlap the supplied fresh1.png image on the right. The image uses native SVG alpha masks on its left and bottom edges, revealing the actual background gradient rather than painting a flat-colour overlay. Its size is responsive and aligned to the top-right. Below are up to four deduplicated grower-linked products in one horizontal row, using 128px-wide cards, 12px gaps and 140px snapping, followed by Explore local produce. The button opens HomeGrownProduceScreen. There is currently no grower identity/verification API, so VERIFIED_HOME_GROWERS is empty and products are clearly labelled read-only samples. Real records require verified identity, locality and linked available product IDs. Missing real stock is not padded with samples.

Everyday Vegetables and Fruit Favourites each show up to six products in a three-column grid with the same 52px grey avatar-style Explore more button used by Groceries. Buttons open full vertical collection listings. Real matching stock takes priority; six labelled read-only design samples keep each layout visible when stock is absent. Sample products use the existing placeholder image, cannot enter cart/wishlist and are not attributed to real growers.

Fresh keeps its plain existing screen background. The sage treatment is confined to the Home-grown Nearby feature banner.

Fresh From Nearby Shops reuses the rounded shop panels from Groceries, but selects only fresh produce from each seller’s own inventory, up to three balanced products per shop and four shops. Store navigation, distance, open/closed state and disabled ordering for closed shops are retained. No sample shops or stock are inserted.

Seasonal Picks shows a six-product horizontal rail. Real picks require curated product IDs, explicit start/end dates and geographic bounds in SEASONAL_COLLECTIONS, then must be available at nearby open stores. Dates use the India calendar date. Availability or product names alone never imply seasonality. The registry is currently empty, so clearly labelled, read-only design products are displayed until local seasonal curation is configured.

Greens & Herbs shows up to six existing cards horizontally, matching the leafy-green and herb category rules. Actual available stock takes priority, with clearly labelled read-only samples only when no matching stock is found.

The shared BrandFooter ends Fresh with the same brand sign-off as Home and Groceries. It owns bottom-navigation clearance, so FreshTab does not add extra bottom padding.
