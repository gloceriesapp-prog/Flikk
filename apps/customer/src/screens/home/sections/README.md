# "All" tab sections

Everything shown on Home's "All" category tab, below the header — the deals
promo card, then Today's Steal Deals (9 products, 3-column grid — today's
cheapest picks). Only rendered when `all` is the selected category
(`HomeScreen.tsx`); every other category shows its own content instead
(Fresh Fish grid) or the placeholder.

```
sections/
  data.ts             placeholder product list for Today's Steal Deals
  AllTabSections.tsx   composes DealsSection + the ProductSection
```

Card UI comes from `../products/` (shared with Fresh Fish), deals promo card
from `../deals/`. This folder just decides what shows up together on "All".
