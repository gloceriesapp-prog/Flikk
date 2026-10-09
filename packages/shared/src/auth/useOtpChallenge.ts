import { useCallback, useEffect, useRef, useState } from 'react';

// Supabase controls OTP generation/expiry. This client cooldown is only UX;
// the API must still enforce its own limits across devices and replicas.
export const OTP_RESEND_COOLDOWN_MS = 60_000;

export function useOtpChallenge(initialCooldown = true) {
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialCooldown ? 60 : 0);
  const deadline = useRef(initialCooldown ? Date.now() + OTP_RESEND_COOLDOWN_MS : 0);
  const active = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    active.current = true;
    // Use a deadline, rather than decrementing a counter: timers pause while
    // a phone is backgrounded and must catch up immediately on the next tick.
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 500);
    return () => {
      active.current = false;
      clearInterval(timer);
    };
  }, []);

  const restartCooldown = useCallback(() => {
    deadline.current = Date.now() + OTP_RESEND_COOLDOWN_MS;
    setSecondsLeft(60);
  }, []);

  const canResend = useCallback(() => Date.now() >= deadline.current, []);

  const run = useCallback(async (operation: (isCurrent: () => boolean) => Promise<void>) => {
    // A ref guards auto-submit and a button tap in the same render frame.
    if (inFlight.current || !active.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await operation(() => active.current);
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }, []);

  return { busy, secondsLeft, canResend, restartCooldown, run };
}
