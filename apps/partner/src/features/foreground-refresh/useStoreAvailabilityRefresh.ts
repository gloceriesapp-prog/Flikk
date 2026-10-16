import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';

// One read at the server's next boundary, rather than polling the profile
// continuously. A bounded retry handles worker lag; foreground resume is
// also handled by useForegroundRefresh.
export function useStoreAvailabilityRefresh(enabled: boolean) {
  const boundary = useStoreProfileStore(state => state.profile.availabilityNextChangeAt);
  useEffect(() => {
    if (!enabled || !boundary || !Number.isFinite(Date.parse(boundary))) return;
    let stopped = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped || AppState.currentState !== 'active') return;
      await useStoreProfileStore.getState().loadProfile();
      if (!stopped && Date.parse(useStoreProfileStore.getState().profile.availabilityNextChangeAt ?? '') <= Date.now()) {
        timer = setTimeout(() => void tick(), Math.min(30_000, 5000 * 2 ** Math.min(retries++, 3)));
      }
    };
    timer = setTimeout(() => void tick(), Math.max(1000, Date.parse(boundary) - Date.now() + 1000));
    return () => { stopped = true; clearTimeout(timer); };
  }, [enabled, boundary]);
}
