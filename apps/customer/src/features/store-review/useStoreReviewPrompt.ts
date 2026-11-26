// Calls the decision on the Track Order screen once a delivery has just
// finished, and if it says yes, asks the OS for its review popup after
// PROMPT_DELAY_MS. At most one attempt per mounted screen; leaving the
// screen within the delay cancels it. Any failure (storage, network, the
// store API) just skips the prompt.
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as StoreReview from 'expo-store-review';
import * as Sentry from '@sentry/react-native';
import { fetchOrderHistory, type ApiOrder } from '../../api/orders';
import { useAuthStore } from '../../store/useAuthStore';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { PROMPT_DELAY_MS, reviewPromptDecision, type ReviewSkipReason } from './decision';
import { readIssueReports, readLastReviewPrompt, writeLastReviewPrompt } from './storage';

function log(event: 'review_prompt_shown' | 'review_prompt_skipped', data: { reason?: ReviewSkipReason | 'error'; orderId: string }) {
  Sentry.addBreadcrumb({ category: 'store_review', message: event, level: 'info', data });
}

// Delivered orders for this customer, trips counted once. One page is enough:
// only "fewer than 2" vs "2 or more" matters.
async function deliveredOrderCount(): Promise<number> {
  const page = await fetchOrderHistory(new URLSearchParams({ status: 'delivered' }));
  return groupOrdersByTrip(page.items).length;
}

export function useStoreReviewPrompt(legs: ApiOrder[] | undefined, enabled: boolean) {
  const customerId = useAuthStore(state => state.customerId);
  const focused = useIsFocused();
  const attempted = useRef(false);
  // Latest order data without restarting the countdown on every poll.
  const legsRef = useRef(legs);
  useEffect(() => { legsRef.current = legs; });
  const allDelivered = !!legs?.length && legs.every(leg => leg.status === 'delivered');
  const orderId = legs?.[0]?.id;

  useEffect(() => {
    if (!enabled || !focused || !customerId || !allDelivered || !orderId || attempted.current) return;
    attempted.current = true;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [count, last, issues, available] = await Promise.all([
            deliveredOrderCount(), readLastReviewPrompt(customerId), readIssueReports(customerId), StoreReview.isAvailableAsync(),
          ]);
          const legs = legsRef.current;
          if (cancelled || !legs) return;
          const decision = reviewPromptDecision({
            legs, deliveredOrderCount: count, lastPromptAt: last?.at ?? null, lastPromptOrderId: last?.orderId ?? null,
            reportedOrderIds: issues.orderIds, lastIssueAt: issues.lastAt,
            storeReviewAvailable: available, now: Date.now(),
          });
          if (!decision.show) { log('review_prompt_skipped', { reason: decision.reason, orderId }); return; }
          // Record first: a crash inside the native call must not re-prompt.
          await writeLastReviewPrompt(customerId, { at: Date.now(), orderId });
          if (cancelled) return;
          await StoreReview.requestReview();
          log('review_prompt_shown', { orderId });
        } catch {
          log('review_prompt_skipped', { reason: 'error', orderId });
        }
      })();
    }, PROMPT_DELAY_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [allDelivered, customerId, enabled, focused, orderId]);
}
