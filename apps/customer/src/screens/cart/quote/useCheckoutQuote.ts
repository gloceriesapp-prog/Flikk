import { useMemo } from 'react';
import { useCheckoutActivity } from './useCheckoutActivity';
import { useQuery } from '@tanstack/react-query';
import { fetchCheckoutQuote } from '../../../api/checkout';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkoutItems } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';

export function useCheckoutQuote(addressId?: string) {
  const active = useCheckoutActivity();
  const items = useCartStore((state) => state.items);
  const promo = useCartStore((state) => state.appliedPromo);
  const customerId = useAuthStore((state) => state.customerId);
  const input = useMemo(() => checkoutItems(items), [items]);
  const enabled = active && !!customerId && items.length > 0 && !!addressId;
  const query = useQuery({
    queryKey: ['checkout-quote', customerId, input, promo?.code ?? null, addressId ?? null],
    queryFn: () => fetchCheckoutQuote(input, promo?.code, addressId),
    enabled, retry: false, staleTime: 0, gcTime: 0,
    refetchInterval: enabled ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  return query;
}
