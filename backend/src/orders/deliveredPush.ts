import { supabase } from '../db/supabase.js';
import { round2 } from '../lib/pricing.js';
import { formatPayoutDateLabel, nextPayoutDate } from '../lib/payoutSchedule.js';
import { embeddedPushToken, sendPushNotification } from '../lib/pushNotifications.js';

interface DeliveredLeg { id: string; store_id: string; item_total: unknown; commission_amount: unknown }

// Real earning-transparency push — the store's revenue is never written to
// any ledger before delivery (weeklyPayouts.ts's own computeWeeklyPayouts
// scopes strictly to delivered orders), so 'delivered' is the one truthful
// point to tell the owner "you earned this", with the real amount and the
// next settlement date. complete_verified_delivery delivers every leg of a
// trip at once, so each delivered leg's own store gets its own push with its
// own net amount — not just the store of the order named in the request.
// Best-effort: never throws.
export async function notifyStoresOfDelivery(
  order: { id: string; store_id: string; trip_id: string | null },
  delivered: Record<string, unknown>,
): Promise<void> {
  try {
    let legs: DeliveredLeg[] = [{ id: order.id, store_id: order.store_id, item_total: delivered.item_total, commission_amount: delivered.commission_amount }];
    if (order.trip_id) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, store_id, item_total, commission_amount')
        .eq('trip_id', order.trip_id)
        .eq('status', 'delivered');
      if (!error && data?.length) legs = data as DeliveredLeg[];
    }
    const payoutLabel = formatPayoutDateLabel(nextPayoutDate());
    await Promise.all(legs.map(async (leg) => {
      const netEarned = round2(Number(leg.item_total) - Number(leg.commission_amount));
      const { data: storeRow } = await supabase
        .from('stores')
        .select('users!owner_user_id(expo_push_token)')
        .eq('id', leg.store_id)
        .single();
      await sendPushNotification(
        embeddedPushToken(storeRow?.users),
        `₹${netEarned} earned`,
        `Order delivered — added to your balance, paid out on ${payoutLabel}.`,
        { data: { type: 'order_delivered', orderId: leg.id } },
      );
    }));
  } catch {
    // Push is best-effort; the delivery itself already committed.
  }
}
