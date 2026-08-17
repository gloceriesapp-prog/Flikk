# Deals / ads section

Shown on Home's "All" tab (see `../sections/AllTabSections.tsx`) — one
full-width deal image, nothing else.

```
deals/
  DealsSection.tsx     padding wrapper around the image below
  DealsImageCard.tsx     one rounded, full-width image — no text/badge/CTA
  data.ts                the single image URL
```

Earlier versions of this section had a heading, CTA button, a live countdown
timer, and later a horizontal scroll of multiple images — all removed
deliberately across a few revisions that wanted progressively simpler: one
image, no scroll, no chrome. If any of that is wanted again, that's a new
deliberate ask, not something to silently restore.

## Placeholder, not real

Image is a placeholder URL (hotlinked reference image) — there's no
promotions/campaigns backend yet.
