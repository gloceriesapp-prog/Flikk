import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useOrdersStore } from '../../store/useOrdersStore';
import { orderPollDelay } from './orderPollDelay';

// One app-wide foreground loop. A lightweight digest triggers full details only
// when the active queue changes; failures back off and background work stops.
export function useOrderPolling(): void {
  const refresh = useOrdersStore(state => state.refreshUpdates);
  useEffect(() => {
    let stopped = false;
    let running = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (!stopped && AppState.currentState === 'active') timer = setTimeout(() => void tick(), orderPollDelay(failures));
    };
    const tick = async () => {
      if (stopped || running || AppState.currentState !== 'active') return;
      running = true;
      try { await refresh(); failures = 0; } catch { failures += 1; }
      finally { running = false; schedule(); }
    };
    void tick();
    const listener = AppState.addEventListener('change', state => {
      clearTimeout(timer);
      if (state === 'active') void tick();
    });
    return () => { stopped = true; clearTimeout(timer); listener.remove(); };
  }, [refresh]);
}
