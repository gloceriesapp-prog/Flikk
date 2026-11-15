// What a delivery means for the rider's pocket: the cash to collect from the
// customer (cash on delivery) and what the rider will earn for it. Attached to
// GET /rider/assignments and GET /rider/dispatch-offers rows.
//
// Pay comes from the database itself: rider_pay_preview (migration
// 20261115090000: per-km pay, road km, tip) before delivery, the stored
// rider_earnings row after. The settings mirror (riderDeliveryPayout) is only a
// fallback when the preview is unavailable. Cash follows cod_cash_due (108).
import { supabase } from '../db/supabase.js';
import { getRiderPaySettings } from './deliverySettings.js';
import { extraStopCount, riderDeliveryPayout, type RiderPaySettings, type RiderPayout } from './earningsBreakdown.js';
import { round2 } from './pricing.js';
import { logger } from './logger.js';

type Money = number | string | null | undefined;

// The order columns this needs (routes select them alongside their own).
// The trips embed names its foreign key: trips.cancel_origin_order_id also
// links the two tables, and an unnamed trips(...) fails with PGRST201.
export const DELIVERY_MONEY_COLUMNS = 'payment_method, total, delivery_fee, store_id, trips!orders_trip_id_fkey(delivery_fee, total)';

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

export interface StoredEarning { amount: Money; base_amount: Money; extra_stop_amount: Money; tip_amount?: Money; road_km?: Money }

// One rider_pay_preview row: pay before the tip, plus the tip and road km.
export interface PayPreview { road_km: Money; tip_amount: Money; amount: Money; base_amount: Money; extra_stop_amount: Money }

export interface DeliveryMoney {
  payment_method: 'cod' | 'online';
  // Rupees the rider collects in cash at the door; 0 when prepaid.
  cash_to_collect: number;
  // What the rider earns for the whole order or trip, tip included (the same
  // figure on every leg of a trip, never per leg).
  rider_payout: number;
  rider_payout_base: number;
  rider_payout_extra_stop: number;
  // The customer's tip inside rider_payout (paid in full on delivery).
  rider_tip: number;
  // Road km the per-km pay was priced on; null when unknown.
  road_km: number | null;
}

const num = (value: Money) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function deliveryMoney(order: DeliveryMoneyOrder, legs: TripLeg[], settings: RiderPaySettings, earned?: StoredEarning | null, preview?: PayPreview | null): DeliveryMoney {
  const paymentMethod = order.payment_method === 'online' ? 'online' : 'cod';
  const tripLegs = order.trip_id ? legs.filter((leg) => leg.trip_id === order.trip_id) : [];
  let cash = 0;
  if (paymentMethod === 'cod') {
    cash = order.trip_id
      ? num(order.trips?.total) - tripLegs.filter((leg) => leg.status === 'cancelled').reduce((sum, leg) => sum + num(leg.total), 0)
      : num(order.total);
  }
  let payout: RiderPayout;
  let tip = 0;
  let roadKm: Money = null;
  if (earned) {
    tip = num(earned.tip_amount);
    roadKm = earned.road_km;
    const amount = num(earned.amount);
    const extraStop = earned.extra_stop_amount == null ? 0 : num(earned.extra_stop_amount);
    payout = { amount, base: earned.base_amount == null ? round2(amount - tip - extraStop) : num(earned.base_amount), extraStop };
  } else if (preview) {
    tip = num(preview.tip_amount);
    roadKm = preview.road_km;
    payout = { amount: round2(num(preview.amount) + tip), base: num(preview.base_amount), extraStop: num(preview.extra_stop_amount) };
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
    rider_tip: round2(tip),
    road_km: roadKm == null ? null : num(roadKm),
  };
}

// Loads the trip legs, pay settings and (with riderId) any earning already
// recorded, then attaches DeliveryMoney to every row.
export async function withDeliveryMoney<T extends DeliveryMoneyOrder>(rows: T[], riderId?: string): Promise<(T & DeliveryMoney)[]> {
  if (rows.length === 0) return [];
  const tripIds = [...new Set(rows.map((row) => row.trip_id).filter((id): id is string => !!id))];
  const singleIds = rows.filter((row) => !row.trip_id).map((row) => row.id);
  const [settings, legs, earnings, previews] = await Promise.all([
    getRiderPaySettings(),
    tripIds.length
      ? supabase.from('orders').select('trip_id, store_id, status, total').in('trip_id', tripIds).then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TripLeg[];
      })
      : Promise.resolve([] as TripLeg[]),
    riderId ? riderEarnings(riderId, singleIds, tripIds) : Promise.resolve(new Map<string, StoredEarning>()),
    payPreviews(rows.map((row) => row.id)),
  ]);
  return rows.map((row) => ({ ...row, ...deliveryMoney(row, legs, settings, earnings.get(row.trip_id ?? row.id), previews.get(row.id)) }));
}

// Best effort: without the preview (older database, outage) the settings
// mirror still gives a figure, just without per-km pay or the tip.
async function payPreviews(orderIds: string[]): Promise<Map<string, PayPreview>> {
  const byOrder = new Map<string, PayPreview>();
  try {
    const { data, error } = await supabase.rpc('rider_pay_preview', { p_orders: orderIds.slice(0, 200) });
    if (error) throw error;
    for (const row of (data ?? []) as (PayPreview & { order_id: string })[]) byOrder.set(row.order_id, row);
  } catch (err) {
    logger.warn({ err }, 'rider_pay_preview unavailable; showing settings-based pay');
  }
  return byOrder;
}

async function riderEarnings(riderId: string, orderIds: string[], tripIds: string[]) {
  const byScope = new Map<string, StoredEarning>();
  const select = 'order_id, trip_id, amount, base_amount, extra_stop_amount, tip_amount, road_km';
  const queries = [];
  if (orderIds.length) queries.push(supabase.from('rider_earnings').select(select).eq('rider_id', riderId).is('trip_id', null).in('order_id', orderIds));
  if (tripIds.length) queries.push(supabase.from('rider_earnings').select(select).eq('rider_id', riderId).in('trip_id', tripIds));
  for (const { data, error } of await Promise.all(queries)) {
    if (error) throw error;
    for (const row of (data ?? []) as (StoredEarning & { order_id: string; trip_id: string | null })[]) byScope.set(row.trip_id ?? row.order_id, row);
  }
  return byScope;
}
