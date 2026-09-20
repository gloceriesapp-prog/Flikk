import type { PartnerOrder } from '../../screens/orders/data';

// Updated to 10 minutes (10 * 60 * 1000)
export const ORDER_ACCEPT_WINDOW_MS = 10 * 60 * 1000;

// Adjusted reminder checkpoints across the 10-minute window
export const REMINDER_CHECKPOINTS_MS = [3 * 60 * 1000, 6 * 60 * 1000, 8.5 * 60 * 1000] as const;
export type ReminderStage = 'first' | 'final';

export function getElapsedMs(order: PartnerOrder, now: number = Date.now()): number {
  return now - order.placedAtTimestamp;
}

export function getRemainingAcceptMs(order: PartnerOrder, now: number = Date.now()): number {
  return Math.max(0, ORDER_ACCEPT_WINDOW_MS - getElapsedMs(order, now));
}

export function hasAcceptWindowExpired(order: PartnerOrder, now: number = Date.now()): boolean {
  return getRemainingAcceptMs(order, now) <= 0;
}

// Formats accurately as "09:59", "08:12", "00:05", etc.
export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}