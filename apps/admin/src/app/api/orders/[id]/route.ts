// Admin order detail — everything about one order in one read: items,
// customer, delivery address snapshot, store, rider, trip legs, payment and
// refund state, promo, cancellation origin, delivery-code lifecycle (never the
// code itself) and a timeline built from status timestamps, the customer
// notification log (one row per status change, incl. cancelled/failed) and
// the admin_order_actions audit (migration 109). Service role; admin only.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { isUuid } from '@/lib/orders/adminActor';
import { orderReasonLabel } from '@/lib/orders/cancelReasons';
import type { DeliveryCodeState, OrderDetail, OrderTimelineEvent } from '@/lib/orders/orderDetail';
import type { OrderStatus } from '@/lib/types';

const MAX_CODE_ATTEMPTS = 5; // delivery_codes.attempts CHECK and complete_verified_delivery lock-out.

const ACTION_LABELS: Record<string, string> = {
  assign_rider: 'Admin assigned a rider',
  unassign_rider: 'Admin removed the rider',
  reassign_rider: 'Admin reassigned the rider',
  cancel: 'Admin cancelled the order',
  advance_status: 'Admin changed the status',
  reissue_delivery_code: 'Admin reissued the delivery code',
  trip_failure_refund: 'Admin approved a failed-trip refund',
};

const EVENT_LABELS: Record<string, string> = {
  placed: 'Order received',
  packed: 'Packed by the store',
  out_for_delivery: 'Picked up by the rider',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Delivery failed',
};

function num(value: unknown): number {
  return Number(value ?? 0);
}

export async function GET(_request: Request, ctx: RouteContext<'/api/orders/[id]'>) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  try {
    const { data: o, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_id, store_id, rider_id, trip_id, address_id, status, item_total, delivery_fee, handling_fee, discount_amount, total, commission_amount, payment_method, payment_provider, provider_payment_id, refund_status, provider_refund_id, refunded_at, promo_code_id, cancel_reason, cancelled_by, placed_at, packed_at, picked_up_at, delivered_at, delivery_address_at_order')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!o) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    const scope = (o.trip_id ?? o.id) as string;

    const [itemsRes, customerRes, storeRes, riderRes, tripRes, legsRes, promoRes, codeRes, resetsRes, actionsRes, eventsRes, orderJobRes, tripJobRes, addressRes] = await Promise.all([
      supabaseAdmin.from('order_items').select('id, quantity, unit_price_at_order, unit_at_order, product_name_at_order, product_image_at_order, products(name, unit, image_url)').eq('order_id', id),
      supabaseAdmin.from('users').select('id, name, phone').eq('id', o.customer_id).maybeSingle(),
      supabaseAdmin.from('stores').select('id, name, phone, district').eq('id', o.store_id).maybeSingle(),
      o.rider_id ? supabaseAdmin.from('riders').select('id, name, phone, status, last_location_update').eq('user_id', o.rider_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      o.trip_id ? supabaseAdmin.from('trips').select('id, status, total, delivery_fee, cancelled_by, cancel_origin_order_id, cancel_origin_store_id').eq('id', o.trip_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      o.trip_id ? supabaseAdmin.from('orders').select('id, order_number, store_id, status, total, rider_id, cancel_reason, refund_status, placed_at, stores(name)').eq('trip_id', o.trip_id).order('placed_at').order('id') : Promise.resolve({ data: [], error: null }),
      o.promo_code_id ? supabaseAdmin.from('promo_codes').select('code').eq('id', o.promo_code_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabaseAdmin.from('delivery_codes').select('expires_at, attempts, consumed_at').eq('scope_id', scope).maybeSingle(),
      supabaseAdmin.from('delivery_code_resets').select('created_at').eq('order_id', id).order('created_at', { ascending: false }),
      supabaseAdmin.from('admin_order_actions').select('action, from_value, to_value, reason, admin_email, created_at, order_id')
        .or(o.trip_id ? `order_id.eq.${id},trip_id.eq.${o.trip_id}` : `order_id.eq.${id}`).order('created_at'),
      supabaseAdmin.from('customer_notifications').select('event, created_at').eq('order_id', id).order('created_at'),
      supabaseAdmin.from('order_refund_jobs').select('status, target_paise, attempts, last_error').eq('order_id', id).maybeSingle(),
      o.trip_id ? supabaseAdmin.from('trip_refunds').select('status, target_paise, refunded_paise, attempts, last_error').eq('trip_id', o.trip_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      o.delivery_address_at_order ? Promise.resolve({ data: null, error: null })
        : supabaseAdmin.from('addresses').select('label, line1, landmark, recipient_name, recipient_phone, delivery_instructions').eq('id', o.address_id).maybeSingle(),
    ]);
    for (const res of [itemsRes, customerRes, storeRes, riderRes, tripRes, legsRes, promoRes, codeRes, resetsRes, actionsRes, eventsRes, orderJobRes, tripJobRes, addressRes]) {
      if (res.error) throw res.error;
    }

    type LegRow = { id: string; order_number: string | null; store_id: string; status: OrderStatus; total: number; rider_id: string | null; cancel_reason: string | null; refund_status: string; stores: { name: string } | null };
    const legs = ((legsRes.data ?? []) as unknown as LegRow[]).map((leg) => ({
      id: leg.id,
      orderNumber: leg.order_number ?? leg.id.slice(0, 8).toUpperCase(),
      storeId: leg.store_id,
      storeName: leg.stores?.name ?? 'Unknown store',
      status: leg.status,
      total: num(leg.total),
      riderId: leg.rider_id,
      cancelReason: leg.cancel_reason,
      refundStatus: leg.refund_status,
    }));
    const trip = tripRes.data as { id: string; status: string; total: number; delivery_fee: number; cancelled_by: string | null; cancel_origin_order_id: string | null; cancel_origin_store_id: string | null } | null;

    const code = codeRes.data as { expires_at: string; attempts: number; consumed_at: string | null } | null;
    const resets = (resetsRes.data ?? []) as { created_at: string }[];
    const now = Date.now();
    const deliveryCode: DeliveryCodeState = {
      exists: !!code,
      expiresAt: code?.expires_at ?? null,
      attempts: code?.attempts ?? 0,
      maxAttempts: MAX_CODE_ATTEMPTS,
      consumedAt: code?.consumed_at ?? null,
      state: !code ? 'none' : code.consumed_at ? 'used' : code.attempts >= MAX_CODE_ATTEMPTS ? 'locked' : Date.parse(code.expires_at) <= now ? 'expired' : 'active',
      resets: resets.length,
      lastResetAt: resets[0]?.created_at ?? null,
      canReissue: o.status === 'out_for_delivery',
    };

    const timeline: OrderTimelineEvent[] = [];
    const seen = new Set<string>();
    for (const event of (eventsRes.data ?? []) as { event: string; created_at: string }[]) {
      seen.add(event.event);
      timeline.push({
        at: event.created_at,
        label: EVENT_LABELS[event.event] ?? event.event,
        detail: event.event === 'cancelled' || event.event === 'failed' ? orderReasonLabel(o.status, o.cancel_reason) : null,
        kind: 'status',
      });
    }
    // Orders that predate the notification log still show their timestamps.
    for (const [status, at] of [['placed', o.placed_at], ['packed', o.packed_at], ['out_for_delivery', o.picked_up_at], ['delivered', o.delivered_at]] as const) {
      if (at && !seen.has(status)) timeline.push({ at, label: EVENT_LABELS[status], kind: 'status' });
    }
    for (const action of (actionsRes.data ?? []) as { action: string; from_value: string | null; to_value: string | null; reason: string | null; admin_email: string; created_at: string; order_id: string | null }[]) {
      const change = action.action === 'advance_status' ? `${action.from_value} → ${action.to_value}` : null;
      const otherLeg = action.order_id && action.order_id !== id ? ' (from another stop of this trip)' : '';
      timeline.push({
        at: action.created_at,
        label: (ACTION_LABELS[action.action] ?? action.action) + otherLeg,
        detail: [change, action.reason, action.admin_email].filter(Boolean).join(' · '),
        kind: 'admin',
      });
    }
    timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

    const snapshot = (o.delivery_address_at_order ?? addressRes.data) as Record<string, string | null> | null;
    const rider = riderRes.data as { id: string; name: string; phone: string; status: string | null; last_location_update: string | null } | null;
    const customer = customerRes.data as { id: string; name: string | null; phone: string | null } | null;
    const store = storeRes.data as { id: string; name: string; phone: string | null; district: string | null } | null;
    const orderJob = orderJobRes.data as { status: string; target_paise: number; attempts: number; last_error: string | null } | null;
    const tripJob = tripJobRes.data as { status: string; target_paise: number; refunded_paise: number; attempts: number; last_error: string | null } | null;
    type ItemRow = { id: string; quantity: number; unit_price_at_order: number; unit_at_order: string | null; product_name_at_order: string | null; product_image_at_order: string | null; products: { name: string; unit: string | null; image_url: string | null } | null };

    const detail: OrderDetail = {
      id: o.id,
      orderNumber: o.order_number ?? o.id.slice(0, 8).toUpperCase(),
      status: o.status as OrderStatus,
      placedAt: o.placed_at,
      packedAt: o.packed_at,
      pickedUpAt: o.picked_up_at,
      deliveredAt: o.delivered_at,
      cancelReason: o.cancel_reason,
      cancelledBy: o.cancelled_by,
      itemTotal: num(o.item_total),
      deliveryFee: num(o.delivery_fee),
      handlingFee: num(o.handling_fee),
      discountAmount: num(o.discount_amount),
      total: num(o.total),
      commissionAmount: num(o.commission_amount),
      items: ((itemsRes.data ?? []) as unknown as ItemRow[]).map((item) => ({
        id: item.id,
        name: item.product_name_at_order ?? item.products?.name ?? 'Product',
        unit: item.unit_at_order ?? item.products?.unit ?? null,
        quantity: item.quantity,
        unitPrice: num(item.unit_price_at_order),
        imageUrl: item.product_image_at_order ?? item.products?.image_url ?? null,
      })),
      customer: { id: o.customer_id, name: customer?.name ?? null, phone: customer?.phone ?? null },
      address: snapshot
        ? {
            text: [snapshot.label, snapshot.line1, snapshot.landmark].filter(Boolean).join(', '),
            recipientName: snapshot.recipient_name ?? null,
            recipientPhone: snapshot.recipient_phone ?? null,
            instructions: snapshot.delivery_instructions ?? null,
          }
        : null,
      store: { id: o.store_id, name: store?.name ?? 'Unknown store', phone: store?.phone ?? null, district: store?.district ?? null },
      rider: o.rider_id
        ? { userId: o.rider_id, riderId: rider?.id ?? null, name: rider?.name ?? null, phone: rider?.phone ?? null, presence: rider?.status ?? null, lastSeenAt: rider?.last_location_update ?? null }
        : null,
      trip: trip
        ? {
            id: trip.id,
            status: trip.status,
            total: num(trip.total),
            deliveryFee: num(trip.delivery_fee),
            cancelledBy: trip.cancelled_by,
            cancelOriginOrderId: trip.cancel_origin_order_id,
            cancelOriginStoreName: legs.find((leg) => leg.storeId === trip.cancel_origin_store_id)?.storeName ?? null,
            legs,
          }
        : null,
      payment: {
        method: o.payment_method,
        provider: o.provider_payment_id ? o.payment_provider : null,
        providerPaymentId: o.provider_payment_id,
        refundStatus: o.refund_status,
        providerRefundId: o.provider_refund_id,
        refundedAt: o.refunded_at,
        refundJob: tripJob
          ? { scope: 'trip', status: tripJob.status, targetPaise: num(tripJob.target_paise), refundedPaise: num(tripJob.refunded_paise), attempts: tripJob.attempts, lastError: tripJob.last_error }
          : orderJob
            ? { scope: 'order', status: orderJob.status, targetPaise: num(orderJob.target_paise), refundedPaise: null, attempts: orderJob.attempts, lastError: orderJob.last_error }
            : null,
      },
      promo: promoRes.data ? { code: (promoRes.data as { code: string }).code, discountAmount: num(o.discount_amount) } : null,
      deliveryCode,
      timeline,
    };

    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Order detail failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load this order.' }, { status: 500 });
  }
}
