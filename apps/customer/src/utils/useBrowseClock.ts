import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

// One shared local clock for all cards: no API polling or per-card timers.
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
let subscription: ReturnType<typeof AppState.addEventListener> | undefined;
function tick() { now = Date.now(); listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    timer = setInterval(() => { if (AppState.currentState === 'active') tick(); }, 30_000);
    subscription = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = undefined; subscription?.remove(); subscription = undefined; }
  };
}

export function useBrowseClock() {
  return useSyncExternalStore(subscribe, () => now);
}
