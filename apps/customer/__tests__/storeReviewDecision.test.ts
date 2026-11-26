import { reviewPromptDecision, type ReviewPromptInput } from '../src/features/store-review/decision';

const now = Date.parse('2026-11-26T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const leg = { id: 'o2', status: 'delivered' as const, cancel_reason: null, refund_status: 'none' as const, payment_method: 'cod' as const,
  provider_payment_id: null, delivered_at: new Date(now - 5 * 60_000).toISOString() };
const input = (over: Partial<ReviewPromptInput> = {}): ReviewPromptInput => ({
  legs: [leg], deliveredOrderCount: 2, lastPromptAt: null, lastPromptOrderId: null, storeReviewAvailable: true, now, ...over,
});

it('never prompts on the first delivered order', () => {
  expect(reviewPromptDecision(input({ deliveredOrderCount: 1 }))).toEqual({ show: false, reason: 'first_order' });
});

it('prompts on the second good delivered order', () => {
  expect(reviewPromptDecision(input())).toEqual({ show: true });
});

it('skips refunded, cancelled and unpaid online orders', () => {
  expect(reviewPromptDecision(input({ legs: [{ ...leg, refund_status: 'completed' }] }))).toEqual({ show: false, reason: 'refund' });
  expect(reviewPromptDecision(input({ legs: [{ ...leg, cancel_reason: 'Out of stock' }] }))).toEqual({ show: false, reason: 'cancelled' });
  expect(reviewPromptDecision(input({ legs: [{ ...leg, payment_method: 'online' }] }))).toEqual({ show: false, reason: 'payment_issue' });
});

it('skips a trip when any leg had a problem', () => {
  expect(reviewPromptDecision(input({ legs: [leg, { ...leg, id: 'o3', refund_status: 'processing' }] }))).toEqual({ show: false, reason: 'refund' });
});

it('waits 60 days between prompts', () => {
  expect(reviewPromptDecision(input({ lastPromptAt: now - 30 * DAY, lastPromptOrderId: 'o1' }))).toEqual({ show: false, reason: 'cooldown' });
  expect(reviewPromptDecision(input({ lastPromptAt: now - 61 * DAY, lastPromptOrderId: 'o1' }))).toEqual({ show: true });
});

it('skips when the store review API is unavailable', () => {
  expect(reviewPromptDecision(input({ storeReviewAvailable: false }))).toEqual({ show: false, reason: 'unavailable' });
});

it('only right after delivery, and once per order', () => {
  expect(reviewPromptDecision(input({ legs: [{ ...leg, delivered_at: new Date(now - 2 * 60 * 60_000).toISOString() }] }))).toEqual({ show: false, reason: 'not_recent' });
  expect(reviewPromptDecision(input({ legs: [{ ...leg, status: 'out_for_delivery' }] }))).toEqual({ show: false, reason: 'not_delivered' });
  expect(reviewPromptDecision(input({ lastPromptAt: now - 61 * DAY, lastPromptOrderId: 'o2' }))).toEqual({ show: false, reason: 'already_prompted_for_order' });
});
