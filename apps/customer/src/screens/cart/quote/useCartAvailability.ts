import { useMemo } from 'react';
import { useCheckoutActivity } from './useCheckoutActivity';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCartAvailability } from '../../../api/checkout';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkoutItems } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';

// ready: wait until the delivery address is known, so the check runs once
// for that address instead of once without it and again with it.
export function useCartAvailability(addressId: string | undefined, ready: boolean) {
  const active = useCheckoutActivity();
  const items = useCartStore((state) => state.items);
  const customerId = useAuthStore((state) => state.customerId);
  const input = useMemo(() => checkoutItems(items), [items]);
  const enabled = active && ready && !!customerId && items.length > 0;
  const query = useQuery({ queryKey: ['cart-availability', customerId, input, addressId ?? null],
    queryFn: () => fetchCartAvailability(input, addressId), enabled, retry: false,
    // Show the last result while a changed cart is re-checked (no blank
    // bill); callers treat isFetching as not ready to pay.
    placeholderData: keepPreviousData,
    staleTime: 0, gcTime: 5 * 60_000, refetchInterval: enabled ? 15_000 : false, refetchIntervalInBackground: false });
  return query;
}
