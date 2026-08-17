# Search screen

Reached by tapping the Home search bar (`screens/home/components/HomeSearchBar.tsx`
navigates here — it's a button, not a real input; actual typing only happens
on this screen).

```
search/
  SearchScreen.tsx              composes the pieces below
  data.ts                       placeholder top stores + most-searched products
  components/
    SearchHeader.tsx              back button + real, autofocused TextInput
    TopStoresRow.tsx                "Top Grocery Stores" title + "View all" + horizontal scroll
    StoreLogoItem.tsx                one circular store logo + name
```

An earlier version had quick-category filter chips here instead of the
stores row — removed entirely (not left as dead code) per a later revision.

Product grid reuses `../home/products/` (`ProductSection`/`ProductCard`) —
same shared module used by Fresh Fish, Groceries, Bakery, Essentials. This
screen is the first consumer of `ProductCard`'s `showDiscountBadge` prop
(off by default everywhere else) — see that file's comment for why it's
opt-in rather than always-on.

## Placeholder, not real

Store names are fictional (not the real chains from whatever reference UI
inspired this — those are that app's actual partners, not Flikk's) and their
logos are random images. "Most searched Product" is also static placeholder
data. No real search/catalog/store backend exists yet — typing in
`SearchHeader` doesn't filter anything currently.
