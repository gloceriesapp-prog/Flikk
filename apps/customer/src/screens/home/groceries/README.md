# Groceries tab

Shown on Home when the "Groceries" category tab is selected (`HomeScreen.tsx`
owns that selection state, same pattern as `../fish/` and `../sections/`).

```
groceries/
  data.ts             placeholder sub-categories + farm-teaser products
  GroceriesTab.tsx      composes ../category-tab/'s shared components with this data
```

The tile grid, promo banner, and teaser row are shared with `../bakery/` and
`../essentials/` — see `../category-tab/README.md`. This folder only holds
Groceries-specific data and copy.

## Placeholder, not real

Sub-category list, promo copy, and farm products are all placeholder — no
real catalog/promotions backend exists yet. "Fresh Picks" badge and "Shop
now" copy are Flikk's own, not any reference app's branding.
