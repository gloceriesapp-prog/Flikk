# "All" tab sections

Everything shown on Home's "All" category tab, below the header — the deals
promo card, then Today's Deal, then Bestsellers. Only rendered when `all` is
the selected category (`HomeScreen.tsx`); every other category shows its own
content instead (Fresh Fish grid) or the placeholder.

```
sections/
  data.ts             placeholder product lists for Today's Deal and Bestsellers
  AllTabSections.tsx   composes DealsSection + the two ProductSections
```

Card UI comes from `../products/` (shared with Fresh Fish), deals promo card
from `../deals/`. This folder just decides what shows up together on "All".
