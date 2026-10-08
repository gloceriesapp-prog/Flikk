// Store reject reasons — mirror of STORE_REJECT_REASONS in
// packages/shared/src/orders/cancelReasons.ts (this Next.js app is not a
// @gloceries/shared member). The chosen code is sent as the reject reason
// (PATCH /orders/:id/status) and stored as the order's cancel_reason, which
// admin shows with a readable label. Keep the lists identical.
export const STORE_REJECT_REASONS = [
  { code: 'store_out_of_stock', label: 'Items out of stock' },
  { code: 'store_closed', label: 'Shop is closed / closing' },
  { code: 'store_too_busy', label: 'Too busy right now' },
  { code: 'store_price_or_item_issue', label: 'Price or item issue' },
  { code: 'other', label: 'Other' },
] as const;
