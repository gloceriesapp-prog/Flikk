# Fresh Fish grid

Shown on Home when the "Fresh Fish" category tab is selected (`HomeScreen.tsx`
owns that selection state and swaps this in for the placeholder body).

```
fish/
  data.ts              12 placeholder products — real name + local coastal name
  FishProductGrid.tsx   thin wrapper pairing FISH_PRODUCTS with its section title
```

The card UI itself (`ProductCard`) and the title+grid layout (`ProductSection`)
live in `../products/` — shared with `../sections/` (Today's Deal, Bestsellers)
so there's one card implementation, not three copies.

## Placeholder, not real

- **Images** are random (`picsum.photos`, seeded per item so they're stable
  across re-renders, not real product photos).
- **Prices, ratings, stock** are made up.
- **ADD button** doesn't add anything to a cart — there's no cart yet.

All of this gets replaced once real catalog browsing (PRD C4/C5,
`specs/01-customer-app/screens.md`) is built against `GET /stores/:id/products`.
This exists so the "select a category, see products" interaction has
something real to show today.
