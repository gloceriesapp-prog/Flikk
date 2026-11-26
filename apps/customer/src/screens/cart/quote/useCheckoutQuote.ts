import { useMemo } from 'react';
import { useCheckoutActivity } from './useCheckoutActivity';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCheckoutQuote } from '../../../api/checkout';
import { useAuthStore } from '../../../store/useAuthStore';
import { checkoutItems } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';

export function useCheckoutQuote(addressId?: string) {
  const active = useCheckoutActivity();
  const items = useCartStore((state) => state.items);
  const promo = useCartStore((state) => state.appliedPromo);
  const tip = useCartStore((state) => state.tipAmount);
  const customerId = useAuthStore((state) => state.customerId);
  const input = useMemo(() => checkoutItems(items), [items]);
  const enabled = active && !!customerId && items.length > 0 && !!addressId;
  const query = useQuery({
    queryKey: ['checkout-quote', customerId, input, promo?.code ?? null, addressId ?? null, tip],
    queryFn: () => fetchCheckoutQuote(input, promo?.code, addressId, tip),
    enabled, retry: false,
    // Show the last result while a changed cart is re-checked (no blank
    // bill); callers treat isFetching as not ready to pay.
    placeholderData: keepPreviousData, staleTime: 0,
    // Kept a few minutes so reopening an unchanged cart shows its bill at
    // once; it still refetches on open and Pay waits for the fresh quote.
    gcTime: 5 * 60_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  return query;
}
