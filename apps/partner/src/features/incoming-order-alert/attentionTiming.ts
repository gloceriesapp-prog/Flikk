export const ATTENTION_SECONDS = 50;
export const REMINDER_AFTER_SECONDS = 25;

// Elapsed wall time survives delayed JS ticks; the countdown cannot drift
// just because rendering, a request or backgrounding delayed an interval.
export function attentionTiming(startedAt: number, now: number) {
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  return {
    secondsLeft: Math.max(0, Math.ceil(ATTENTION_SECONDS - elapsed)),
    reminderDue: elapsed >= REMINDER_AFTER_SECONDS && elapsed < ATTENTION_SECONDS,
  };
}
