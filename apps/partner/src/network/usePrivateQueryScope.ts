import { useAuthStore } from '../store/useAuthStore';
import { useStoreProfileStore } from '../store/useStoreProfileStore';
// Keep the resource prefix first so broad invalidation still works.
export function usePrivateQueryScope(): string {
  const epoch = useAuthStore((state) => state.sessionEpoch);
  const storeId = useStoreProfileStore((state) => state.profile.id);
  return `${epoch}:${storeId || 'onboarding'}`;
}
