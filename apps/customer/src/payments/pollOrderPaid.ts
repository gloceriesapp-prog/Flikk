// Poll current backend state while UPI is processing. Timeout means unknown,
// so the caller opens recovery and reconciles with the provider rather than
// starting a new checkout. Created/authorized payment failures do not cancel
// the checkout; explicit cancellation and reservation expiry own that state.
import { AppState } from 'react-native';
import { recoverPayment } from '../api/payments';

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 30; // 30 * 4s = 120s

// Exported so PaymentProcessingScreen's own countdown always matches this
// function's real timeout budget exactly — a hardcoded duplicate number
// there could silently drift from this one if either ever changes.
export const POLL_TIMEOUT_SECONDS = (MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000;

function waitForNextCheck(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(finish, ms);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish();
    });
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve();
    }
  });
}

export async function pollOrderPaid(id: { orderId: string } | { tripId: string }): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const recovery = await recoverPayment(id);
    if (recovery.state === 'paid') return true;
    if (recovery.state === 'cancelled' || recovery.state === 'expired' || recovery.state === 'unpaid') return false;
    await waitForNextCheck(POLL_INTERVAL_MS);
  }
  return false;
}
