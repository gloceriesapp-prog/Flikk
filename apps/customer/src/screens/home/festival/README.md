# Festival tab

Navratri is the dedicated Home destination for the festival content previously rendered in All. All keeps its header palette, blue welcome-image panel and decorative scalloped edge, but no longer mounts festival content or fetches festival products/greetings.

```
festival/
  FestivalTab.tsx
  data.ts
  greeting/
    FestivalGreetingPanel.tsx
    FestivalGreetingSection.tsx
    FestivalScallopEdge.tsx
    useFestivalGreeting.ts
    useFestivalProducts.ts
    data.ts
  picks/
    FestivalPicksSection.tsx
    useFestivalSection.ts
  puja-essentials/
    PujaEssentialsSection.tsx
    usePujaEssentials.ts
    data.ts
    previewProducts.ts
  flowers-and-garlands/
    FlowersAndGarlandsSection.tsx
    data.ts
    previewProducts.ts
    previewArtwork.ts
  collections/
    FestivalCollectionScreen.tsx
    useFestivalCollection.ts
  components/
    FestivalProductRow.tsx
    FestivalProductDetails.tsx
  sweets-to-share/
    SweetsToShareSection.tsx
    data.ts
    previewProducts.ts
  fruits-for-the-festival/
    FruitsForTheFestivalSection.tsx
    data.ts
    previewProducts.ts
  light-up-home/
    LightUpHomeSection.tsx
    data.ts
  from-local-shops/
    FromLocalShopsSection.tsx
    FestivalStoreCard.tsx
    useFestivalShops.ts
  festival-offers/
    FestivalOffersSection.tsx
    data.ts
```

The greeting panel contains the existing Navratri banner, three festival category boxes, live product rail and scalloped bottom trim. Their layout and existing data endpoints are preserved. The active Navratri category, banner content panel and scalloped trim share the light cream #FFF1D6 background. The top header retains its separate palette. The banner uses its original 2116×743 proportions without external vertical spacing. The greeting API isActive flag and legacy festival-greeting Home section visibility controls remain effective; the festival configuration owns its background color. Disabled greeting content does not fetch festival products. Failed product requests offer retry without removing the banner/categories. Query keys remain unchanged, preserving cached data.

The separate optional admin-curated shelf lives under picks; it was not mounted in the All layout immediately before this move and remains unmounted. Admin-added Navratri tab tiles/posters can still follow the greeting panel.

Puja essentials follows the greeting in a six-card, three-column grid. Flowers & garlands follows it with four larger cards in a horizontal snapping row. Both have a light gray explore button with two product avatars opening the typed FestivalCollection route. The catalogue and shelves share address-scoped nearby inventory and balanced product matching; the catalogue removes the Home card limit. Real cards retain uploaded product images, genuine pack labels, seller names and the existing cart/detail interactions. Empty, loading, address and retry states remain explicit. Development-only read-only samples appear when no matching stock is available; flower samples use local vector illustrations, not seller photographs. Production never substitutes sample stock.

Top-level data.ts owns the stable fallback ID, title, normalized display name and explicit visibility. The tab appears immediately after All. A matching admin tab takes priority with its original ID, tiles and banner; duplicates are removed. Header and Home body use the same resolver. No automatic calendar expiry is enabled until campaign dates are configured.

Sweets to share and Fruits for the festival follow Flowers & garlands and reuse FestivalProductRow. Fruits uses its three-column grid mode, capped at six cards with the explore button below; the development fallback includes six read-only samples. Sweet box options come only from genuine variants and are selected through the existing product detail sheet. Fruit assortments display seller descriptions; missing contents are never inferred. Light up home has two wide discovery cards linking to Lights & Diyas and Rangoli & Decor. Every collection key derives from the collection registry, keeping navigation and filtering in sync.

From local shops uses actual nearby merchants matching festival stock or explicit puja/florist/sweet-shop names. Store cards show uploaded storefront photos (a neutral shop icon if absent), address/city, backend opening status and direct store navigation. Closed shops remain browseable. No sample merchant, locality, photo or opening status is manufactured. Inventory queries reuse the shared nearby-shop cache and its existing five-store bound; location changes use the existing coordinate-keyed ranking.

Festival offers follows From local shops in a compact 140px product row, capped at six items. It shares the festival relevance groups and nearby open-shop inventory. Only finite, positive prices with a strictly higher genuine original price qualify; filtering precedes balanced selection. Existing product cards show the actual price, comparison price and discount badge. No sample offers or invented comparison prices are supplied, including in development. Address, loading, retry and no-offer states use the shared collection UI.
