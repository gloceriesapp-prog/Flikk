// Real product search — GET /stores/products/search (backend/src/routes/
// stores.ts), cross-store on purpose: a customer searching "tomato" wants
// to know every store selling one, not just their own nearest store's
// catalog (unlike useDealsProducts.ts, which is deliberately scoped to one
// store since a promo card only ever means one store's own deals).
// useCartStore already has a real cross-store conflict flow
// (addItem returning 'store_conflict' + replaceCartWithItem) — tapping a
// searched product from a different store than what's already in the cart
// is a case this app already handles correctly, not new ground.
//
// Debounced by hand (setTimeout, no extra dependency) rather than firing a
// request on every keystroke — a customer typing "tomato" would otherwise
// fire 6 overlapping requests before finishing the word.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useProductSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  return useQuery({
    queryKey: ['search', 'products', debouncedQuery],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>(`/stores/products/search?q=${encodeURIComponent(debouncedQuery)}`, {
        auth: false,
      });
      return rows.map(mapApiProduct);
    },
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
  });
}
