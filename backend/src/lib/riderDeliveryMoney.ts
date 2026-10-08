// What a delivery means for the rider's pocket: the cash to collect from the
// customer (cash on delivery) and what the rider will earn for it. Attached to
// GET /rider/assignments and GET /rider/dispatch-offers rows.
//
// The rules mirror the database: cod_cash_due and rider_delivery_payout
// (migration 108), which complete_verified_delivery and
// record_atomic_rider_earning apply when the delivery completes.
import { supabase } from '../db/supabase.js';
import { getRiderPaySettings } from './deliverySettings.js';
import { extraStopCount, riderDeliveryPayout, type RiderPaySettings, type RiderPayout } from './earningsBreakdown.js';
import { round2 } from './pricing.js';

type Money = number | string | null | undefined;

// The order columns this needs (routes select them alongside their own).
export const DELIVERY_MONEY_COLUMNS = 'payment_method, total, delivery_fee, store_id, trips(delivery_fee, total)';

export interface DeliveryMoneyOrder {
  id: string;
  trip_id: string | null;
  store_id?: string | null;
  payment_method?: string | null;
  total?: Money;
  delivery_fee?: Money;
  trips?: { delivery_fee?: Money; total?: Money } | null;
}

export interface TripLeg { trip_id: string | null; store_id: string | null; status: string; total: Money }

export interface StoredEarning { amount: Money; base_amount: Money; extra_stop_amount: Money }

export interface DeliveryMoney {
  payment_method: 'cod' | 'online';
  // Rupees the rider collects in cash at the door; 0 when prepaid.
  cash_to_collect: number;
  // What the rider earns for the whole order or trip (the same figure on
  // every leg of a trip, never per leg).
  rider_payout: number;
  rider_payout_base: number;
  rider_payout_extra_stop: number;
}

const num = (value: Money) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function deliveryMoney(order: DeliveryMoneyOrder, legs: TripLeg[], settings: RiderPaySettings, earned?: StoredEarning | null): DeliveryMoney {
  const paymentMethod = order.payment_method === 'online' ? 'online' : 'cod';
  const tripLegs = order.trip_id ? legs.filter((leg) => leg.trip_id === order.trip_id) : [];
  let cash = 0;
  if (paymentMethod === 'cod') {
    cash = order.trip_id
      ? num(order.trips?.total) - tripLegs.filter((leg) => leg.status === 'cancelled').reduce((sum, leg) => sum + num(leg.total), 0)
      : num(order.total);
  }
  let payout: RiderPayout;
  if (earned) {
    const amount = num(earned.amount);
    const extraStop = earned.extra_stop_amount == null ? 0 : num(earned.extra_stop_amount);
    payout = { amount, base: earned.base_amount == null ? round2(amount - extraStop) : num(earned.base_amount), extraStop };
  } else {
    const fee = order.trip_id ? num(order.trips?.delivery_fee) : num(order.delivery_fee);
    payout = riderDeliveryPayout(fee, order.trip_id ? extraStopCount(tripLegs) : 0, settings);
  }
  return {
    payment_method: paymentMethod,
    cash_to_collect: round2(Math.max(0, cash)),
    rider_payout: payout.amount,
    rider_payout_base: payout.base,
    rider_payout_extra_stop: payout.extraStop,
  };
}

// Loads the trip legs, pay settings and (with riderId) any earning already
// recorded, then attaches DeliveryMoney to every row.
export async function withDeliveryMoney<T extends DeliveryMoneyOrder>(rows: T[], riderId?: string): Promise<(T & DeliveryMoney)[]> {
  if (rows.length === 0) return [];
  const tripIds = [...new Set(rows.map((row) => row.trip_id).filter((id): id is string => !!id))];
  const singleIds = rows.filter((row) => !row.trip_id).map((row) => row.id);
  const [settings, legs, earnings] = await Promise.all([
    getRiderPaySettings(),
    tripIds.length
      ? supabase.from('orders').select('trip_id, store_id, status, total').in('trip_id', tripIds).then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TripLeg[];
      })
      : Promise.resolve([] as TripLeg[]),
    riderId ? riderEarnings(riderId, singleIds, tripIds) : Promise.resolve(new Map<string, StoredEarning>()),
  ]);
  return rows.map((row) => ({ ...row, ...deliveryMoney(row, legs, settings, earnings.get(row.trip_id ?? row.id)) }));
}

async function riderEarnings(riderId: string, orderIds: string[], tripIds: string[]) {
  const byScope = new Map<string, StoredEarning>();
  const select = 'order_id, trip_id, amount, base_amount, extra_stop_amount';
  const queries = [];
  if (orderIds.length) queries.push(supabase.from('rider_earnings').select(select).eq('rider_id', riderId).is('trip_id', null).in('order_id', orderIds));
  if (tripIds.length) queries.push(supabase.from('rider_earnings').select(select).eq('rider_id', riderId).in('trip_id', tripIds));
  for (const { data, error } of await Promise.all(queries)) {
    if (error) throw error;
    for (const row of (data ?? []) as (StoredEarning & { order_id: string; trip_id: string | null })[]) byScope.set(row.trip_id ?? row.order_id, row);
  }
  return byScope;
}
