// Pure parsing for rider order pushes (backend lib/pushNotifications.ts:
// riderOfferPush / riderAssignmentPush). Kept free of Expo imports so
// offerPush.selfcheck.ts runs under plain Node.

export type RiderPush =
  | { type: 'dispatch_offer'; orderId: string | null }
  | { type: 'assignment'; orderId: string | null };

export function parseRiderPush(data: unknown): RiderPush | null {
  if (!data || typeof data !== 'object') return null;
  const { type, orderId } = data as { type?: unknown; orderId?: unknown };
  if (type !== 'dispatch_offer' && type !== 'assignment') return null;
  return { type, orderId: typeof orderId === 'string' && orderId ? orderId : null };
}

// Offers that appeared since the last refresh: what the in-app alert should
// ring for. Ids only, so a re-fetch of the same offers never re-alerts.
export function newOfferIds(previous: readonly { orderId: string }[], next: readonly { orderId: string }[]): string[] {
  const seen = new Set(previous.map((offer) => offer.orderId));
  return next.map((offer) => offer.orderId).filter((id) => !seen.has(id));
}
