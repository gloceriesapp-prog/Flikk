# Shared product card

Used by every "grid of products" section on Home — Fresh Fish (`../fish/`),
Today's Deal and Bestsellers (`../sections/`). One implementation, not one
per section.

```
products/
  types.ts          the Product shape every section's data.ts conforms to
  ProductCard.tsx     one product tile — image card, weight/ADD overlap, price, name, rating
  ProductSection.tsx  section title + wrapped 3-column grid of ProductCards
```

Adding a new product section elsewhere on Home: write a `data.ts` with a
`Product[]`, then `<ProductSection title="..." products={...} />`. Don't copy
`ProductCard.tsx` — extend it here if a section genuinely needs something the
others don't.
