import { useEffect, useRef } from 'react';

interface Input {
  requested: boolean;
  active: boolean;
  ready: boolean;
  eligible: boolean;
  consume: () => void;
  start: () => void | Promise<void>;
  invalid: () => void;
}

// One explicit chooser tap authorizes one cart checkout. Consume navigation
// intent before asynchronous payment work; rerenders/foregrounding cannot replay it.
export function usePaymentSelectionStart({ requested, active, ready, eligible, consume, start, invalid }: Input) {
  const consumed = useRef(false);
  useEffect(() => {
    if (!requested) { consumed.current = false; return; }
    if (consumed.current || !active || !ready) return;
    consumed.current = true;
    consume();
    if (eligible) void start();
    else invalid();
  }, [requested, active, ready, eligible, consume, start, invalid]);
}
