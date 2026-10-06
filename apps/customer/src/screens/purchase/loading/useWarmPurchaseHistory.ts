import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { purchaseHistoryOptions } from '../../../features/purchases/historyQuery';

export function useWarmPurchaseHistory() {
  const customerId = useAuthStore(state => state.customerId);
  const client = useQueryClient();
  useEffect(() => {
    if (!customerId) return;
    // Give initial home requests a head start. Fetch only one bounded page,
    // once per account mount; there is no history polling in the background.
    const timer = setTimeout(() => {
      if (AppState.currentState === 'active' && useAuthStore.getState().customerId === customerId)
        void client.prefetchInfiniteQuery({ ...purchaseHistoryOptions(customerId), pages: 1 });
    }, 750);
    return () => clearTimeout(timer);
  }, [client, customerId]);
}
