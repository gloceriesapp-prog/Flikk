# Store list screen

Reached from `BottomNavBar`'s "Store" tab (`navigation.navigate('Store')`).

```
store-list/
  StoreListScreen.tsx            reuses ../home/components/HomeHeader.tsx for the top
                                   section (same component Home uses, not a copy) +
                                   FeaturedStoreBanner + AllStoresSection below
  all-stores/
    AllStoresSection.tsx           real store list (useAllStores.ts -> GET /stores)
    useAllStores.ts                 fetch + map real stores.* columns only
  components/
    StoreCard.tsx                   one card — photo, name, category, open/closed,
                                      rating/prep-time (only when set), district, "Shop now"
```

## Why HomeHeader is reused, not rebuilt

The ask was explicit: "keep the top section as it is." Since `HomeHeader` needs
`scrollY` (for the collapse-on-scroll effect) and category-selection state to
render, this screen owns its own copies of both — same pattern
`HomeScreen.tsx` uses. Category tab selection here is visual only; there's no
per-category store filtering yet, just the one list.

## Real data, not placeholder

Replaced the old `STORE_LISTINGS` mock (fictional Shetty Stores/Krishna
Mart/etc) — every store here is real (`GET /stores`, admin's own Add Store
form). Only fields that actually exist on the `stores` table are shown:
no distance (no geolocation on stores yet, PRD v3 scope), no per-store
"owner note" copy (never a real column). Rating and avg-prep-time are
nullable on the real row — `StoreCard.tsx` only shows them once a founder
has actually set them, rather than faking a number.
