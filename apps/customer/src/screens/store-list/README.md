# Store list screen

Reached from `BottomNavBar`'s "Store" tab (`navigation.navigate('Store')`).

```
store-list/
  StoreListScreen.tsx            reuses ../home/components/HomeHeader.tsx for the top
                                   section (same component Home uses, not a copy) +
                                   a vertical list of StoreCard below
  data.ts                        placeholder store list — fictional names, same
                                   convention as ../search/data.ts's Top Grocery Stores
  components/
    StoreCard.tsx                  one card — image, name, distance, "Shop now" CTA
```

## Why HomeHeader is reused, not rebuilt

The ask was explicit: "keep the top section as it is." Since `HomeHeader` needs
`scrollY` (for the collapse-on-scroll effect) and category-selection state to
render, this screen owns its own copies of both — same pattern
`HomeScreen.tsx` uses. Category tab selection here is visual only; there's no
per-category store filtering yet, just the one list.

## Placeholder, not real

Store names, distances, and images are all placeholder — no real
store-listing backend wired to this screen (the `stores` table exists in
`specs/00-foundation/data-model.md`, nothing serves it here yet). "Shop now"
doesn't navigate anywhere yet — there's no store-detail screen to send it to.
