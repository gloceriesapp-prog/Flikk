// Wall-clock reconciliation budget: backgrounding never restarts the timer.
// Timeout means unknown and opens backend recovery, never a new payment.
import { AppState } from 'react-native';
import { recoverPayment, type PaymentTarget } from '../api/payments';

const POLL_INTERVAL_MS = 4000;
export const POLL_TIMEOUT_SECONDS = 120;

export function paymentCheckDeadline(expiresAt?: string, nowMs = Date.now()): number {
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  const budget = nowMs + POLL_TIMEOUT_SECONDS * 1000;
  return Number.isFinite(expiry) ? Math.min(expiry, budget) : budget;
}

function waitForNextCheck(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(finish, Math.max(0, ms));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish();
    });
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      signal?.removeEventListener('abort', finish);
      resolve();
    }
    signal?.addEventListener('abort', finish, { once: true });
    if (signal?.aborted) finish();
  });
}

export async function pollOrderPaid(target: PaymentTarget, deadlineMs = paymentCheckDeadline(), signal?: AbortSignal): Promise<boolean> {
  // A bounded wall-clock deadline replaces attempt-count timeouts, which
  // accidentally stretched when requests were slow or the app was suspended.
  while (!signal?.aborted && Date.now() < deadlineMs) {
    if (AppState.currentState == null || AppState.currentState === 'active') {
      try {
        const recovery = await recoverPayment(target);
        if (signal?.aborted) return false;
        if (recovery.state === 'paid') return true;
        if (recovery.state === 'cancelled' || recovery.state === 'expired') return false;
      } catch {
        // Temporary connection errors keep the saved order and retry within
        // this same budget; restart recovery still comes from backend state.
      }
    }
    await waitForNextCheck(Math.min(POLL_INTERVAL_MS, deadlineMs - Date.now()), signal);
  }
  return false;
}
