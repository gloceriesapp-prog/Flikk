# Search screen

Reached by tapping the Home search bar (`screens/home/components/HomeSearchBar.tsx`
navigates here — it's a button, not a real input; actual typing only happens
on this screen).

```
search/
  SearchScreen.tsx              composes the pieces below
  useProductSearch.ts           real, debounced GET /stores/products/search
  components/
    SearchHeader.tsx              back button + real, autofocused TextInput
```

Matching stores reuse `../store-list/all-stores/useAllStores.ts` (already-real
`GET /stores`), filtered client-side by name — no separate store-search
backend endpoint, the whole zone's store list is small enough at this scale.
Matching products come from a real cross-store backend search
(`useProductSearch.ts`), unlike `useDealsProducts.ts`'s deliberate single-store
scoping — a customer searching wants every store selling a match, not just
their nearest one.

Store results reuse `../store-list/components/StoreCard.tsx` (self-navigates
to `StoreDetail`); product results reuse `../home/products/` (`ProductSection`/
`ProductCard`, self-opens `ProductDetailSheet`) — same components the rest of
the app already uses, so a tapped result behaves identically everywhere.

## Not built here

No typo tolerance, ranking, or multi-word AND/OR — a plain `ILIKE` substring
match on product name, real but simple, matching every other feed in
`backend/src/routes/stores.ts`. No recent-searches list (a different feature
from `useRecentSearchesStore.ts`, which is address search for delivery
locations, not this screen).
