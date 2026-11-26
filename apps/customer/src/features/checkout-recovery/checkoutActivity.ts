import { useSyncExternalStore } from 'react';

// Foreground discovery must not race the cart's quote/create/verify flow.
// This only coordinates navigation in this process; saved attempt IDs and the
// backend remain responsible for recovery and payment idempotency after restart.
let activeCheckouts = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export function isCheckoutFlowActive(): boolean {
  return activeCheckouts > 0;
}

export function beginCheckoutFlow(): () => void {
  activeCheckouts += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCheckouts -= 1;
    notify();
  };
}

// For screens that show a busy state while the cart places the order.
export function useCheckoutFlowActive(): boolean {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, isCheckoutFlowActive);
}
