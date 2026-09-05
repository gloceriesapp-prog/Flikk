# Store list screen

Reached from `BottomNavBar`'s "Store" tab (`navigation.navigate('Store')`).

```
store-list/
  StoreListScreen.tsx            StoreHeader (gradient banner) + StoreFilterBar (search/filter
                                   pills) + AllStoresSection below; StoreFilterSheet is the
                                   bottom sheet StoreFilterBar's chips open
  all-stores/
    AllStoresSection.tsx           real store list (useAllStores.ts -> GET /stores)
    useAllStores.ts                 fetch + map real stores.* columns only
  top-stores/
    useFeaturedStore.ts             fetch for a single featured store — no longer rendered on
                                      this screen (FeaturedStoreBanner removed per an explicit
                                      ask), but Home's own LocalShopCard.tsx still uses this hook
  components/
    StoreHeader.tsx                 gradient banner, back button
    StoreFilterBar.tsx              favourite/filter icons + Sort by / Open now / Category /
                                      Rating pills
    StoreFilterSheet.tsx            bottom sheet StoreFilterBar's dropdown-style chips open
    StoreCard.tsx                   one card — photo (rating + open/closed badges overlaid),
                                      name, category/prep-time line, Shop now + Share + bookmark
```

## Real data, not placeholder

Replaced the old `STORE_LISTINGS` mock (fictional Shetty Stores/Krishna
Mart/etc) — every store here is real (`GET /stores`, admin's own Add Store
form). Only fields that actually exist on the `stores` table are shown:
no distance (no geolocation on stores yet, PRD v3 scope), no per-store
"owner note" copy or review count/quote (never real columns). Rating and
avg-prep-time are nullable on the real row — `StoreCard.tsx` only shows
them once a founder has actually set them, rather than faking a number.
