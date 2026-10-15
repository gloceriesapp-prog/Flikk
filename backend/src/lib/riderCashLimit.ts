// Cash-on-delivery float limit. A rider who has collected cash and not yet
// handed it to Gloceries (rider_cash_collections with settled_at null,
// migration 108) may not take another cash order that would push what they
// hold over the limit. Prepaid orders are never blocked: they add no cash.
// Admin manual assignment is not gated, so ops can still override.
//
// RIDER_CASH_LIMIT is rupees; unset means the default, 0 turns the limit off.
import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';

export const DEFAULT_RIDER_CASH_LIMIT = 2000;

export function riderCashLimit(raw: string | undefined = process.env.RIDER_CASH_LIMIT): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_RIDER_CASH_LIMIT;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_RIDER_CASH_LIMIT;
}

// Blocked only when the rider already holds some cash. Without that, one
// large cash order above the limit could never be taken by anyone.
export function exceedsCashLimit(held: number, incoming: number, limit: number): boolean {
  return limit > 0 && incoming > 0 && held > 0 && held + incoming > limit;
}

export interface CashCollection { id: string; order_id: string | null; trip_id: string | null; amount: number; collected_at: string }

export async function unsettledCash(riderId: string): Promise<{ held: number; items: CashCollection[] }> {
  const { data, error } = await supabase
    .from('rider_cash_collections')
    .select('id, order_id, trip_id, amount, collected_at')
    .eq('rider_id', riderId)
    .is('settled_at', null)
    .order('collected_at', { ascending: false });
  if (error) throw error;
  const items = ((data ?? []) as (Omit<CashCollection, 'amount'> & { amount: number | string })[]).map((row) => ({ ...row, amount: Number(row.amount) || 0 }));
  const held = Math.round(items.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
  return { held, items };
}

export function cashLimitError(held: number, limit: number): AppError {
  return new AppError(
    409,
    'CASH_LIMIT_REACHED',
    `You are holding ₹${held} in cash (limit ₹${limit}). Hand it over to the Gloceries team to take more cash-on-delivery orders.`,
  );
}
