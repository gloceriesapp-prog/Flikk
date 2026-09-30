# Groceries tab

Home’s Groceries header tab renders the category grid without a heading, Everyday Picks, a promotional poster, Today’s Offers, Shops Near You, Kitchen Essentials, Breakfast Essentials, Snacks & Drinks, Local Pantry Brands, Pickles, Sauces & Spreads, then the shared app-brand footer. The poster uses the admin-uploaded Groceries banner when available, otherwise a styled restock message with no discount claims.

```
groceries/
  GroceriesTab.tsx
  data.ts
  isGroceryProduct.ts
  useNearbyGroceryInventory.ts
  selectBalancedProducts.ts
  components/
    GroceryCollectionSection.tsx
    GroceryCollectionScreen.tsx
    GroceryProductTile.tsx
    SeeAllProductsButton.tsx
  best-sellers/
    BestSellersSection.tsx
    useGroceryProducts.ts
  poster/
    GroceryPoster.tsx
  grocery-offers/
    GroceryOffersSection.tsx
    useGroceryOffers.ts
  shops-you-know/
    ShopsYouKnowSection.tsx
    GroceryStorePreviewCard.tsx
    useNearbyGroceryStores.ts
  kitchen-essentials/
    KitchenEssentialsSection.tsx
    KitchenEssentialsScreen.tsx
    previewProducts.ts
    data.ts
  breakfast-essentials/
    BreakfastEssentialsSection.tsx
    BreakfastEssentialsScreen.tsx
    data.ts
  pickles-sauces-spreads/
    PicklesSaucesSpreadsSection.tsx
    data.ts
    previewProducts.ts
  local-brands/
    LocalBrandsSection.tsx
    LocalBrandCard.tsx
    LocalBrandScreen.tsx
    useLocalPantryBrands.ts
    data.ts
  snacks-and-drinks/
    SnacksAndDrinksSection.tsx
    SnacksAndDrinksScreen.tsx
    previewProducts.ts
    data.ts
```

The product row reuses `PromoListCard` and the existing `ProductCard`, including their product-detail and cart behaviour. Loading, retry and empty states use no fabricated products.

The current source is the real `/stores/products/catalog` feed, filtered by grocery category labels. It is limited to 20 catalogue entries before filtering and ordered by name, not sales. The Everyday Picks title reflects the catalogue feed; genuine bestseller ranking would need a ranked, grocery-scoped feed. Category tiles remain the existing static shortcuts.

Today’s Offers uses `/stores/products/deals`, filtered to grocery categories and products whose original price exceeds their current price. The feed is limited to 12 entries before filtering; both product sections display at most six cards. Availability and approval gates are applied by the existing backend feeds. Loading, retry and empty states remain visible without fabricated offers.

Shops Near You follows Today’s Offers. It reuses the address-based nearby-store query, checks up to five nearby stores' actual catalogues and shows up to three stores with three grocery previews each. Grocery eligibility uses the same category-label filter as the other rows. The horizontal 308px panels match PopularStorePanel: rounded white shell, blue Nearby badge, store header and stacked PopularProductRow previews in a pale-grey inset. Distance and open/closed status remain visible. The header opens that seller's StoreDetail screen. Open-store rows support existing product details and add controls; closed-store rows open the store with add controls unavailable. Location, loading, retry and empty states are supported. The title is editorial and does not claim the customer previously purchased from these stores.

The three food collections share `useNearbyGroceryInventory` with the shop previews, so each candidate store catalogue is cached once. Only open, in-range stores contribute orderable collection products. Selection uses product-name groups, chooses across groups before repeating a type, removes duplicate named packs across sellers and displays up to eight products with the existing ProductCard. Kitchen Essentials covers rice, flour, pulses, oil/ghee, salt, sugar and spices; Breakfast Essentials covers dairy, bread, eggs, cereal, poha, batter and spreads; Snacks & Drinks covers biscuits, namkeen, chips, juices and drinks. Missing groups are skipped rather than filled with fabricated products. Product-name matching is an interim classification until structured merchandising tags are available; it may miss products whose names do not contain recognised terms. Each collection uses the shared plain 18px bold SectionTitle heading without a subtitle, matching Shops Near You, with no header background, icon or eyebrow label. Location/loading/error/empty states remain supported.

Breakfast Essentials shows at most three real products in a fixed three-column row with no horizontal scrolling. Missing products leave their column space empty rather than stretching the remaining cards. A full-width View more breakfast essentials button opens BreakfastEssentialsScreen, a two-column vertical listing of all matching stock from the same nearby open stores. Kitchen Essentials now uses the same three-column preview and full-width View more button, opening KitchenEssentialsScreen. Snacks & Drinks shows up to six real products in a fixed three-column, two-row grid and opens SnacksAndDrinksScreen from the same Explore more button. It now uses six explicitly requested read-only design samples when matching real inventory is empty, so the layout can be previewed. Real snack inventory takes priority.

Kitchen Essentials includes three explicitly requested temporary design samples (rice, atta and dal) when no real kitchen products are available. They use the existing placeholder image, carry a visible sample-products label and render through a read-only card wrapper that blocks cart, wishlist and detail actions. Real matching inventory always takes priority. Remove the previewProducts prop/import from the Kitchen section and screen when preview data is no longer wanted. Both listing screens share GroceryCollectionScreen.

Kitchen, Breakfast and Snacks & Drinks collection buttons use SeeAllProductsButton: a compact 52px full-width light-grey rounded surface, up to three overlapping circular product thumbnails, an indigo Explore more label and a small triangular arrow. Each retains navigation to its corresponding collection listing.

Local Pantry Brands is a compact discovery rail rather than a copy of the Regional tab. Three square image-only brand cards sit in a fixed row and open dedicated brand pages. Cards have no visible text, badges, monograms, arrows or horizontal scrolling; each image uses the configured brand image, a linked product photo or the shared placeholder. The card accessibility labels and detail pages identify concept previews. There is currently no brand identity/verification table or API, so VERIFIED_LOCAL_BRANDS is intentionally empty and the interface uses fictional concept-brand previews, identified in accessibility labels and their detail pages. The detail preview shows read-only sample products explicitly not attributed to the concept brand. To enable real discovery, configure checked local brand definitions with real product IDs and origin information; only verified definitions with matching pantry stock from nearby open stores appear. Never infer brand locality from the seller district or advertise a product as verified based on seller approval. Once the registry exists, unavailable brands show an empty/address/loading/error state rather than concept previews.

Pickles, Sauces & Spreads adds a horizontally scrolling row of meal accompaniments after the image-only brands. It uses the shared address-scoped inventory and product cards, with six labelled read-only design samples if matching inventory is empty. Real stock takes priority. The existing BrandFooter follows as the final element and owns the bottom navigation clearance, so the tab does not add a second bottom-padding block.

All Groceries section headings use 18px bold text and no descriptive subtitles. The category grid has no heading; category tiles remain visible. The fallback poster contains only the Stock Up on Essentials headline. Store distance/open status, sample-product notices and the shared app-brand footer remain because they are functional or brand information, not section subtitles.
