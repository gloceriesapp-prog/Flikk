# Search screen

Reached by tapping the Home search bar (`screens/home/components/HomeSearchBar.tsx`
navigates here — it's a button, not a real input; actual typing only happens
on this screen).

```
search/
  SearchScreen.tsx              composes the pieces below
  data.ts                       placeholder quick-categories + most-searched products
  components/
    SearchHeader.tsx              back button + real, autofocused TextInput
    QuickCategoryGrid.tsx          wrapped row of QuickCategoryChip
    QuickCategoryChip.tsx           one bordered pill — icon + label
```

Product grid reuses `../home/products/` (`ProductSection`/`ProductCard`) —
same shared module used by Fresh Fish, Groceries, Bakery, Essentials. This
screen is the first consumer of `ProductCard`'s `showDiscountBadge` prop
(off by default everywhere else) — see that file's comment for why it's
opt-in rather than always-on.

## Placeholder, not real

Quick categories and "Most searched Product" are static placeholder data —
no real search/catalog backend exists yet. Typing in `SearchHeader` doesn't
filter anything currently.
