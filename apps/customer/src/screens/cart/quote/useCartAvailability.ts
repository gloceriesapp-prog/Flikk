import { useMemo } from 'react';
import { useCheckoutActivity } from './useCheckoutActivity';
import { useQuery } from '@tanstack/react-query';
import { fetchCartAvailability } from '../../../api/checkout';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkoutItems } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';

export function useCartAvailability(addressId?: string) {
  const active = useCheckoutActivity();
  const items = useCartStore((state) => state.items);
  const customerId = useAuthStore((state) => state.customerId);
  const input = useMemo(() => checkoutItems(items), [items]);
  const enabled = active && !!customerId && items.length > 0;
  const query = useQuery({ queryKey: ['cart-availability', customerId, input, addressId ?? null],
    queryFn: () => fetchCartAvailability(input, addressId), enabled, retry: false,
    staleTime: 0, gcTime: 0, refetchInterval: enabled ? 15_000 : false, refetchIntervalInBackground: false });
  return query;
}
