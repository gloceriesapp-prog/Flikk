import { accountQueryClient } from '../account-session/accountCache';
import { useAuthStore } from '../../store/useAuthStore';

// Creating an order makes even a recently warmed empty history stale.
// Mark it locally; Purchase refreshes on entry without background polling.
export function invalidatePurchaseHistory() {
  const customerId = useAuthStore.getState().customerId;
  if (customerId) void accountQueryClient().invalidateQueries({ queryKey: ['my-orders', customerId], refetchType: 'none' });
}
