# Shared category-tab building blocks

Used by every "category tab with a sub-category grid + promo poster +
product teaser row" pattern on Home — `../groceries/`, `../bakery/`,
`../protein/`, `../fish/` all use `PosterBanner` now, fed real admin data
(`GET /home-tabs`'s own `banners`, managed from admin's Home Categories
screen) via a `banner?` prop each tab component takes — image only, no
badge/heading/subheading text, and the section renders only when a founder
has actually added one for that tab. Extracted once the pattern repeated a
third time (see `claude.md`'s own guidance: leave similar-but-separate
until a fourth near-identical use shows up — three simultaneous new
consumers here crossed that line).

```
category-tab/
  types.ts                    the SubCategory shape every tab's data.ts conforms to
  components/
    SubCategoryTile.tsx         top-rounded tile with a light-yellow gradient fading to nothing by the bottom (no border/rounding there) + 2-line bold label below
    SubCategoryGrid.tsx          optional section title + 4-column wrapped grid of tiles — Groceries passes no title
    PosterBanner.tsx               pure image poster, no text overlay — image passed in
    ProductTeaserRow.tsx          title + horizontal scroll, reuses ../../products/ProductCard
```

## Adding a new category tab with this pattern

1. `screens/home/<tab>/data.ts` — a `SubCategory[]` and a `Product[]`.
2. `screens/home/<tab>/<Tab>Tab.tsx` — compose `SubCategoryGrid` + `PosterBanner`
   (behind a `banner?` prop, real data from `useHomeTabs.ts`) + `ProductTeaserRow`.
3. Add the tab's name to `RICH_SCREEN_BY_NAME` in `HomeScreen.tsx`.

Don't copy these components into the new tab's folder — import from here.
