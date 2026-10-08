import type { PartnerOrder } from '../../screens/orders/data';
import { apiRequest } from '../../api/client';

// The accept window is the admin-set delivery_settings
// .store_response_timeout_minutes (default 10), served by GET
// /delivery-settings. The backend worker (jobs/storeNoResponse.ts) cancels an
// unanswered order after the same window even when this app is closed; this
// client timer just reacts sooner while the app is open.
export const DEFAULT_ACCEPT_WINDOW_MINUTES = 10;
let acceptWindowMs = DEFAULT_ACCEPT_WINDOW_MINUTES * 60 * 1000;

export function getOrderAcceptWindowMs(): number {
  return acceptWindowMs;
}

export function setOrderAcceptWindowMinutes(minutes: unknown): void {
  if (typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 3 && minutes <= 120) {
    acceptWindowMs = minutes * 60 * 1000;
  }
}

// Best-effort: on failure the default (and the server job) still apply.
export async function loadOrderAcceptWindow(): Promise<void> {
  try {
    const settings = await apiRequest<{ storeResponseTimeoutMinutes?: number }>('/delivery-settings');
    setOrderAcceptWindowMinutes(settings?.storeResponseTimeoutMinutes);
  } catch {
    // Keep the current window.
  }
}

// Reminder checkpoints at 30%, 60% and 85% of the window (3, 6 and 8.5
// minutes of the default 10).
export const REMINDER_CHECKPOINT_FRACTIONS = [0.3, 0.6, 0.85] as const;
export function getReminderCheckpointsMs(): number[] {
  return REMINDER_CHECKPOINT_FRACTIONS.map((fraction) => fraction * acceptWindowMs);
}
export type ReminderStage = 'first' | 'final';

// The window starts when the order reached the store (orders.store_visible_at:
// checkout for COD, payment for online), the same anchor the server job uses.
export function getElapsedMs(order: PartnerOrder, now: number = Date.now()): number {
  return now - (order.acceptWindowStartTimestamp ?? order.placedAtTimestamp);
}

export function getRemainingAcceptMs(order: PartnerOrder, now: number = Date.now()): number {
  return Math.max(0, acceptWindowMs - getElapsedMs(order, now));
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
