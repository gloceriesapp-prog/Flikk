// "Buy It Again" row (BuyItAgainSection.tsx) — real repeat-purchase
// products from this customer's own delivered order history
// (GET /orders/buy-it-again, backend/src/routes/orders.ts). Row->Product
// mapping happens inside fetchBuyItAgain itself (api/orders.ts), reusing
// the same mapApiProduct every other product feed already uses.
//
// Gated on a real session (accessToken) — a guest browsing without an
// account (useAuthStore's own isGuest flag) has no order history behind
// this endpoint at all, and it requires auth server-side; querying
// without a token would just 401 on every guest page load for no reason.

import { useQuery } from '@tanstack/react-query';
import { fetchBuyItAgain } from '../../../api/orders';
import { useAuthStore } from '../../../store/useAuthStore';

export function useBuyItAgain() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['home', 'buy-it-again'],
    queryFn: fetchBuyItAgain,
    enabled: accessToken != null,
  });
}
