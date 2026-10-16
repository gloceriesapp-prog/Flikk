import { expect, it } from 'vitest';
import { attentionTiming } from '../../../apps/partner/src/features/incoming-order-alert/attentionTiming';

it('uses a 50-second attention window with a reminder after 25 seconds', () => {
  const start = 100_000;
  expect(attentionTiming(start, start)).toEqual({ secondsLeft: 50, reminderDue: false });
  expect(attentionTiming(start, start + 24_999)).toEqual({ secondsLeft: 26, reminderDue: false });
  expect(attentionTiming(start, start + 25_000)).toEqual({ secondsLeft: 25, reminderDue: true });
});

it('catches up after a delayed tick and never reminds after the window expires', () => {
  expect(attentionTiming(100_000, 138_500)).toEqual({ secondsLeft: 12, reminderDue: true });
  expect(attentionTiming(100_000, 150_000)).toEqual({ secondsLeft: 0, reminderDue: false });
  expect(attentionTiming(100_000, 170_000)).toEqual({ secondsLeft: 0, reminderDue: false });
});

it('bounds the display if the device clock moves backwards', () => {
  expect(attentionTiming(100_000, 99_000)).toEqual({ secondsLeft: 50, reminderDue: false });
});
