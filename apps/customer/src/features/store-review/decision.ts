// When Gloceries asks the OS for its store-review popup (StoreReview
// .requestReview): right after a good delivery, from the customer's 2nd
// delivered order on, at most once every 60 days. Pure, so every rule is
// unit-tested (__tests__/storeReviewDecision.test.ts).
//
// Store rules this follows: no sentiment gating (our own star ratings are
// never read here, and nothing of ours is shown before the native popup), no
// rewards, no custom "rate us" button promising the popup. The OS may still
// decide not to show it; that is fine.
import type { ApiOrder } from '../../api/orders';

export const REVIEW_PROMPT_COOLDOWN_DAYS = 60;
export const MIN_DELIVERED_ORDERS = 2;
// "Just delivered": the customer is looking at a delivery that finished
// within this window, not reopening an old order from history.
export const JUST_DELIVERED_WINDOW_MS = 60 * 60 * 1000;
export const PROMPT_DELAY_MS = 2_500;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewSkipReason =
  | 'not_delivered' | 'not_recent' | 'cancelled' | 'refund' | 'payment_issue'
  | 'first_order' | 'cooldown' | 'already_prompted_for_order' | 'unavailable';

export interface ReviewPromptInput {
  // Every leg of the delivery (one order, or each shop's order of a trip).
  legs: Pick<ApiOrder, 'id' | 'status' | 'cancel_reason' | 'refund_status' | 'payment_method' | 'provider_payment_id' | 'delivered_at'>[];
  // The customer's delivered orders (a trip counts once), this one included.
  deliveredOrderCount: number;
  lastPromptAt: number | null;
  lastPromptOrderId: string | null;
  storeReviewAvailable: boolean;
  now: number;
}

export function reviewPromptDecision(input: ReviewPromptInput): { show: true } | { show: false; reason: ReviewSkipReason } {
  const { legs, now } = input;
  if (!legs.length || legs.some(leg => leg.status !== 'delivered')) return { show: false, reason: 'not_delivered' };
  const deliveredAt = Math.max(...legs.map(leg => Date.parse(leg.delivered_at ?? '')));
  if (!Number.isFinite(deliveredAt) || now - deliveredAt > JUST_DELIVERED_WINDOW_MS || deliveredAt > now + 60_000) {
    return { show: false, reason: 'not_recent' };
  }
  // A good order: nothing cancelled, nothing refunded or being refunded, and
  // an online order actually paid. (Missing-item or complaint reports aren't
  // recorded on orders yet; customer care runs by email.)
  if (legs.some(leg => leg.cancel_reason)) return { show: false, reason: 'cancelled' };
  if (legs.some(leg => leg.refund_status && leg.refund_status !== 'none')) return { show: false, reason: 'refund' };
  if (legs.some(leg => leg.payment_method === 'online' && !leg.provider_payment_id)) return { show: false, reason: 'payment_issue' };
  if (input.deliveredOrderCount < MIN_DELIVERED_ORDERS) return { show: false, reason: 'first_order' };
  if (input.lastPromptOrderId && legs.some(leg => leg.id === input.lastPromptOrderId)) return { show: false, reason: 'already_prompted_for_order' };
  if (input.lastPromptAt !== null && now - input.lastPromptAt < REVIEW_PROMPT_COOLDOWN_DAYS * DAY_MS) return { show: false, reason: 'cooldown' };
  if (!input.storeReviewAvailable) return { show: false, reason: 'unavailable' };
  return { show: true };
}
