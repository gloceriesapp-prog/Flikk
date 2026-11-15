import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { onlineStore } from '../../network/online';
import { CHECK_INTERVAL_MS, createBackgroundUpdates } from './backgroundUpdates';

const download = createBackgroundUpdates({
  check: () => Updates.checkForUpdateAsync(),
  fetch: () => Updates.fetchUpdateAsync(),
});

export function useBackgroundUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canDownload = () => mounted && AppState.currentState === 'active' && onlineStore.getSnapshot();
    const schedule = () => {
      clearTimeout(timer);
      if (!canDownload()) return;
      // Let startup, session recovery and first paint finish before network work.
      timer = setTimeout(() => { void download(canDownload); }, 10_000 + Math.random() * 5_000);
    };
    const foreground = AppState.addEventListener('change', schedule);
    const network = onlineStore.subscribe(schedule);
    // Also recheck while the app stays open, so a push shows without a relaunch.
    const periodic = setInterval(schedule, CHECK_INTERVAL_MS);
    schedule();
    return () => { mounted = false; clearTimeout(timer); clearInterval(periodic); foreground.remove(); network(); };
  }, []);
}
