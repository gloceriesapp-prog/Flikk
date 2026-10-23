# Order rating

- `DeliveredOrderRatingBar.tsx`: compact floating prompt in the home navigation shell; live tracking takes priority.
- `screens/OrderRatingScreen.tsx`: selected editorial rider and item rating page, currently a local design preview.
- `components/DeliveryRatingSection.tsx`: unboxed delivery section with the blue rider and stars.
- `components/OrderItemRatingRow.tsx`: one ordered-item row with a thumbnail, independent rating and subtle divider.
- `components/RatingStars.tsx`: compact stars used by the experience page.
- `components/RatingPromptArrow.tsx`: the exact supplied arrow icon.
- `layout.ts`: shared 520-point maximum width and 20-point content padding.
- `useOrderRating.ts`: existing real overall-order review and shared dismissal state.
- `preview.ts`: development-only sample controls; no backend writes.

The `OrderRating` route is registered only in development. Its Submit button
requires a delivery score and a score for every sample item, then completes
the local preview. It does not average these scores or send them as an overall
store review: the current `/reviews` API cannot persist separate rider/item
ratings. Production's compact prompt continues to open Purchase, where the
existing overall-order review remains available. Wiring structured feedback
requires a separate backend contract and storage before enabling this page in
production. The sample never becomes a real review mutation target.
