// Pre-orders (migration 20261106090000): a cart of pre-order products is
// delivered today or on a later day in one of preorder_slots' windows. The customer
// sends { date: 'YYYY-MM-DD' (India), slot_id }; this turns it into the
// order's deliver_from/deliver_until. Mixing pre-order and instant products
// and the bulk minimum are checked when the cart is priced (checkoutItems.ts).
import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';
import type { PricedCheckoutItem } from './checkoutItems.js';

export const PREORDER_SLOT_SELECT = 'id, label, starts_minute, ends_minute';
// Bookable days: today and the next 4. A product's lead days (0-4) grey out
// the first ones.
export const PREORDER_BOOKING_DAYS = 5;
// A slot can be booked until this long before it starts (the shop needs time).
export const PREORDER_CUTOFF_MS = 2 * 3_600_000;
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PreorderRequest { date: string; slot_id: string }
export interface PreorderSlot { id: string; label: string; starts_minute: number; ends_minute: number }

export function parsePreorder(value: unknown): PreorderRequest | null {
  if (value == null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row !== 'object' || typeof row.date !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(row.date)
    || Number.isNaN(Date.parse(`${row.date}T00:00:00Z`)) || typeof row.slot_id !== 'string' || !UUID.test(row.slot_id)) {
    throw new AppError(400, 'INVALID_PREORDER', 'Choose a delivery day and time slot for your pre-order.');
  }
  return { date: row.date, slot_id: row.slot_id.toLowerCase() };
}

// Days from today (India) to `date`.
export function daysAhead(date: string, now: Date): number {
  const today = new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function preorderWindow(request: PreorderRequest, slot: PreorderSlot | null, leadDays: number, now: Date) {
  if (!slot) throw new AppError(409, 'PREORDER_SLOT_UNAVAILABLE', 'That delivery slot is no longer offered. Choose another slot.');
  const days = daysAhead(request.date, now);
  if (days < leadDays) {
    throw new AppError(409, 'PREORDER_TOO_SOON', leadDays === 1 ? 'These items are delivered from tomorrow. Choose a later day.'
      : `These items need ${leadDays} days' notice. Choose a later day.`);
  }
  if (days >= PREORDER_BOOKING_DAYS) throw new AppError(409, 'PREORDER_TOO_FAR', `Choose a delivery day within the next ${PREORDER_BOOKING_DAYS} days.`);
  const midnight = Date.parse(`${request.date}T00:00:00+05:30`);
  if (midnight + slot.starts_minute * 60_000 < now.getTime() + PREORDER_CUTOFF_MS) {
    throw new AppError(409, 'PREORDER_SLOT_CLOSED', 'That slot is too soon to book. Choose a later slot.');
  }
  return {
    deliver_from: new Date(midnight + slot.starts_minute * 60_000).toISOString(),
    deliver_until: new Date(midnight + slot.ends_minute * 60_000).toISOString(),
  };
}

// The order's delivery window, or null for an ordinary (instant) cart.
export async function resolvePreorder(input: unknown, items: PricedCheckoutItem[], now = new Date()) {
  const request = parsePreorder(input);
  const leads = items.map((item) => item.preorder_lead_days);
  if (leads.every((lead) => lead == null)) {
    if (request) throw new AppError(400, 'PREORDER_NOT_ALLOWED', 'Only Pre-order section items can be scheduled. Refresh your cart.');
    return null;
  }
  if (!request) throw new AppError(400, 'PREORDER_SLOT_REQUIRED', 'Choose a delivery day and time slot for your pre-order. Update the app if you cannot see slots.');
  const { data, error } = await supabase.from('preorder_slots').select(PREORDER_SLOT_SELECT)
    .eq('id', request.slot_id).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return preorderWindow(request, data as PreorderSlot | null, Math.max(...leads.map(Number)), now);
}

// "Fri 7 Nov, 7:00 – 9:00 am" in India time, for store alerts.
export function formatDeliveryWindow(from: string, until: string): string {
  const zone = { timeZone: 'Asia/Kolkata' } as const;
  const day = new Intl.DateTimeFormat('en-IN', { ...zone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(from));
  const time = new Intl.DateTimeFormat('en-IN', { ...zone, hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time.format(new Date(from))} – ${time.format(new Date(until))}`;
}
