# Shared category-tab building blocks

Used by every "category tab with a sub-category grid + promo banner +
product teaser row" pattern on Home — currently `../groceries/`, `../bakery/`,
`../essentials/`. Extracted once the pattern repeated a third time (see
`claude.md`'s own guidance: leave similar-but-separate until a fourth
near-identical use shows up — three simultaneous new consumers here crossed
that line).

```
category-tab/
  types.ts                    the SubCategory shape every tab's data.ts conforms to
  components/
    SubCategoryTile.tsx         one flat mist tile — image + 2-line bold label
    SubCategoryGrid.tsx          section title + 4-column wrapped grid of tiles
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
