# Shared category-tab building blocks

Used by every "category tab with a sub-category grid + promo banner +
product teaser row" pattern on Home — `../bakery/` and `../essentials/` use
all three pieces; `../groceries/` swapped its `PromoBanner` for its own
`GroceriesDealImage.tsx` (a single deal image, no badge/heading/CTA) but
still uses `SubCategoryGrid` and `ProductTeaserRow` from here. Extracted
once the pattern repeated a third time (see `claude.md`'s own guidance:
leave similar-but-separate until a fourth near-identical use shows up —
three simultaneous new consumers here crossed that line).

```
category-tab/
  types.ts                    the SubCategory shape every tab's data.ts conforms to
  components/
    SubCategoryTile.tsx         top-rounded tile with a light-yellow gradient fading to nothing by the bottom (no border/rounding there) + 2-line bold label below
    SubCategoryGrid.tsx          optional section title + 4-column wrapped grid of tiles — Groceries passes no title
    PromoBanner.tsx               photo banner, gradient wash, badge/heading/CTA all passed in
    ProductTeaserRow.tsx          title + horizontal scroll, reuses ../../products/ProductCard
```

## Adding a new category tab with this pattern

1. `screens/home/<tab>/data.ts` — a `SubCategory[]` and a `Product[]`.
2. `screens/home/<tab>/<Tab>Tab.tsx` — compose `SubCategoryGrid` + `PromoBanner`
   + `ProductTeaserRow` with that data and tab-specific copy.
3. Add the branch in `HomeScreen.tsx` (both the render and
   `CATEGORIES_WITH_REAL_CONTENT`).

Don't copy these components into the new tab's folder — import from here.
