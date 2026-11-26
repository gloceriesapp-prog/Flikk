import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCheckoutEstimate } from '../../../api/checkout';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkoutItems } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';
import { useLocationStore } from '../../../store/useLocationStore';
import { useCheckoutActivity } from './useCheckoutActivity';

// Guest cart bill: server prices for the browsing pin. Signed-in customers
// use useCheckoutQuote (saved address, promo, tip) instead.
export function useGuestEstimate() {
  const active = useCheckoutActivity();
  const items = useCartStore((state) => state.items);
  const customerId = useAuthStore((state) => state.customerId);
  const pin = useLocationStore((state) => state.location);
  const input = useMemo(() => checkoutItems(items), [items]);
  return useQuery({
    queryKey: ['checkout-estimate', input, pin?.latitude, pin?.longitude],
    queryFn: () => fetchCheckoutEstimate(input, pin!),
    enabled: active && !customerId && !!pin && items.length > 0,
    retry: false, placeholderData: keepPreviousData, staleTime: 30_000, gcTime: 5 * 60_000,
  });
}
