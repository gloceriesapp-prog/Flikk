# Deals / ads section

Always visible on Home, regardless of which category tab is selected —
sits between the header and the category-specific body content.

```
deals/
  DealsSection.tsx        the actual card (border, rounded, no shadow) — composes the two below
  DealsBannerCard.tsx      heading, subtext, CTA, image, pagination dots — content only, no outer card styling
  DealsCountdownRow.tsx     "Deals end in HH:MM:SS" + "Shop early" blurb — content only
  useCountdown.ts           ticks a target Date down to HH:MM:SS, used by DealsCountdownRow
```

`DealsBannerCard` and `DealsCountdownRow` deliberately don't style their own
container (bg/border/rounding) — `DealsSection` owns that, with a single `h-px`
divider between them, so the two read as one continuous card rather than two
stacked boxes. No shadow anywhere in this section, by design — matches the
flat reference UI.

## Placeholder, not real

Copy ("Thousands of deals", "Low Prices. Every day") and the image
(`picsum.photos`) are placeholders — there's no promotions/campaigns backend
yet. The countdown is real (ticks to end of today), everything else is static.
