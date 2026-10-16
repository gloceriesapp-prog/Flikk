// Foreground discovery must not race the cart's quote/create/verify flow.
// This only coordinates navigation in this process; saved attempt IDs and the
// backend remain responsible for recovery and payment idempotency after restart.
let activeCheckouts = 0;

export function isCheckoutFlowActive(): boolean {
  return activeCheckouts > 0;
}

export function beginCheckoutFlow(): () => void {
  activeCheckouts += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCheckouts -= 1;
  };
}
