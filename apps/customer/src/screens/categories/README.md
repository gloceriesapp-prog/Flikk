# Categories screen

Reached from `BottomNavBar`'s "Categories" tab (`navigation.navigate('Categories')`
— the one real navigation wired into BottomNavBar besides Home; order-again
and store are still visual-only stubs, see `components/BottomNavBar/BottomNavBar.tsx`).

```
categories/
  CategoriesScreen.tsx           header (back + title) + scrollable section list
  data.ts                        grouped placeholder categories
  components/
    CategorySectionGroup.tsx      section title + 4-column wrapped grid
    CategoryTile.tsx               one tile — image card + 2-line label
```

Own screen, not a Home tab — has its own back button, doesn't render
`BottomNavBar`, matching how the reference UI treats it as a dedicated page
rather than another Home category filter.

## Placeholder, not real

Images (`picsum.photos`) and the section/category list are placeholder —
there's no categories endpoint yet (same caveat as `screens/home/products/`).
Tapping a tile doesn't do anything yet.
