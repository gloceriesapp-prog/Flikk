# Order summary

`OrderSummaryScreen.tsx` is the dedicated page opened from Track Order's
“View order summary” button. Route parameters contain only the order/trip
identifier; order contents and charges come from the API.

- `useOrderSummary.ts`: tracking query cache reuse, foreground status refresh,
  loading, errors, and retry.
- `data.ts`: single-order/trip mapping, original prices, payment labels,
  and combined trip totals.
- `components/`: item rows, bill breakdown, bill rows, and order details.
- `utils/`: price formatting, also used by the tracking preview card.

The page reuses delivery details. Apply backend migration
`060_order_item_mrp_snapshot.sql` to capture MRP for new checkout items.
Older MRP values remain “Not recorded”; live catalogue prices cannot
reconstruct historical discounts. “Our price” is the stored selling subtotal;
“Item total” subtracts the order offer. Delivery and handling fees are
shown separately, with the stored order/trip total as the final amount.
