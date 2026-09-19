// Multi-store checkout — a cart spanning more than one store becomes one
// trip: one payment, one delivery fee, one real order per store (own
// store_id/order_items/status each), linked by a shared trip_id. See
// migrations/014_trips.sql's own note on why this exists (a single rider
// does one multi-stop pickup instead of the customer being blocked from
// buying from two stores at once).
//
// A single-store cart should keep using POST /orders (routes/orders.ts,
// unaffected by this file) — this route explicitly rejects a cart that
// only touches one store, so there's exactly one code path for that
// common case, not two that could quietly drift apart.

import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { CartValidationError, validateMultiStoreCart } from '../lib/orderValidation.js';
import { calcTripTotal, groupCartByStore } from '../lib/trips.js';
import { calcOrderTotal, COMMISSION_RATE } from '../lib/pricing.js';
import { resolveAddressId, type AddressInput } from '../lib/resolveAddress.js';
import { sendPushNotification } from '../lib/pushNotifications.js';
import { lookupPromoForCheckout } from './promos.js';
import { getDeliverySettings } from '../lib/deliverySettings.js';

export const tripsRouter = Router();

// COMMISSION_RATE now imported from lib/pricing.ts, the one real source
// (that module's own header note) — this file used to declare its own
// local copy, manually kept in sync with routes/orders.ts's own duplicate.
// The base delivery fee itself comes from lib/deliverySettings.ts (the
// same admin-editable row POST /orders reads), not a hardcoded constant
// here.
//
// EXTRA_STOP_FEE — the multi-stop pickup surcharge (lib/trips.ts's own
// calcTripTotal note): every store beyond the first in a trip adds this
// much to the delivery fee, which is also exactly what the rider earns
// extra for that trip (routes/orders.ts reads trips.delivery_fee as the
// rider's payout amount). A founder-set number, same "flat ₹20-30" PRD
// convention as the base fee itself (PRD Section 22) — not yet wired into
// the admin settings table (only the base fee/free-delivery toggle are),
// since nothing has asked for that yet.
const EXTRA_STOP_FEE = 15;

interface CreateTripBody extends AddressInput {
  items: { product_id: string; quantity: number }[];
  // Same promo contract as POST /orders (routes/orders.ts's own note) —
  // one code against the whole trip's item_total, re-validated here.
  promo_code?: string;
  // Same real distinction routes/orders.ts's own note documents — one
  // payment method for the whole trip, cascaded onto every leg's own
  // orders row (migrations/034_order_payment_method.sql's own
  // create_trip_orders update).
  payment_method?: 'cod' | 'online';
}

tripsRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as CreateTripBody;
    if ((!body.address_id && !body.address?.line1) || !body.items?.length) {
      throw new AppError(400, 'INVALID_TRIP', 'An address and items are required.');
    }

    const addressId = await resolveAddressId(req.user!.id, body);

    const productIds = body.items.map((i) => i.product_id);
    const { data: products, error: productErr } = await supabase
      .from('products')
      .select('id, store_id, price, is_in_stock')
      .in('id', productIds);
    if (productErr) throw productErr;

    try {
      validateMultiStoreCart(body.items, products ?? []);
    } catch (validationErr) {
      if (validationErr instanceof CartValidationError) {
        throw new AppError(400, validationErr.code, validationErr.message);
      }
      throw validationErr;
    }

    const legs = groupCartByStore(body.items, products ?? [], COMMISSION_RATE);
    if (legs.length <= 1) {
      // Not an error a real customer can hit through the app (the cart
      // itself decides which endpoint to call based on how many distinct
      // stores are in it) — this only fires against a hand-crafted
      // request, so a plain 400 is enough; no need to silently fall
      // through to single-store behavior and blur the two paths.
      throw new AppError(400, 'SINGLE_STORE_CART', 'This cart only touches one store — use POST /orders instead.');
    }

    const deliverySettings = await getDeliverySettings();
    const { itemTotal, deliveryFee: baseDeliveryFee } = calcTripTotal(legs, deliverySettings.flatDeliveryFee, EXTRA_STOP_FEE);
    // Free-delivery waiver applies to the WHOLE trip fee (base + multi-stop
    // surcharge together) once eligible — same all-or-nothing waiver
    // lib/deliverySettings.ts's own calcDeliveryFee applies for a single-
    // store order, just computed here against the trip's already-combined
    // fee since calcTripTotal owns the base+surcharge math.
    const deliveryFee =
      deliverySettings.freeDeliveryEnabled && itemTotal >= deliverySettings.freeDeliveryThreshold ? 0 : baseDeliveryFee;

    let promoCodeId: string | null = null;
    let discountAmount = 0;
    if (body.promo_code) {
      const promoResult = await lookupPromoForCheckout(body.promo_code, req.user!.id, itemTotal);
      promoCodeId = promoResult.promoCodeId;
      discountAmount = promoResult.discountAmount;
    }
    const total = calcOrderTotal(itemTotal, deliveryFee, discountAmount, deliverySettings.handlingFee);

    const { data: trip, error: rpcErr } = await supabase.rpc('create_trip_orders', {
      p_customer_id: req.user!.id,
      p_address_id: addressId,
      p_delivery_fee: deliveryFee,
      p_item_total: itemTotal,
      p_total: total,
      p_legs: legs.map((leg) => ({
        store_id: leg.storeId,
        item_total: leg.itemTotal,
        commission_amount: leg.commissionAmount,
        items: leg.items,
      })),
      p_promo_code_id: promoCodeId,
      p_discount_amount: discountAmount,
      p_payment_method: body.payment_method ?? 'cod',
    });
    if (rpcErr) throw new AppError(500, 'TRIP_CREATE_FAILED', rpcErr.message);

    // Best-effort "new order" push to every store involved — same alert
    // POST /orders already sends on a single-store order, just fanned out
    // per leg. Each store owner only ever hears about their own leg; they
    // have no idea (and don't need to) that this was part of a bigger trip.
    for (const leg of legs) {
      const { data: store } = await supabase
        .from('stores')
        .select('users!owner_user_id(expo_push_token)')
        .eq('id', leg.storeId)
        .single();
      void sendPushNotification(
        store?.users?.[0]?.expo_push_token,
        'New order received',
        `New order — ₹${leg.itemTotal} — tap to view.`,
      );
    }

    // Razorpay payment intent initiated by the caller once the trip id is
    // known — same separation POST /orders already documents (a second
    // external-service failure mode kept out of this handler).
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
});

// GET /trips/:id — the combined view a customer's tracker/receipt needs:
// the trip's own one payment/delivery-fee total, plus every child order
// (each with its own real status/order_items), oldest-created first (the
// order they were placed in, which is also pickup order — legs are
// created in the same order the cart grouped them in).
tripsRouter.get('/:id', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data: trip, error: tripErr } = await supabase.from('trips').select('*').eq('id', req.params.id).single();
    if (tripErr || !trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
    // Real RLS (trips_customer_read, 014_trips.sql) already scopes this to
    // the caller's own trip via a user-scoped client; this explicit check
    // is defense in depth for the service-role fetch above, same reasoning
    // orders.ts's own GET /:id already documents.
    if (trip.customer_id !== req.user!.id) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url, unit)), stores(name, avg_prep_minutes)')
      .eq('trip_id', trip.id)
      .order('placed_at', { ascending: true });
    if (ordersErr) throw ordersErr;

    // Same real riders.user_id lookup routes/orders.ts's own GET /:id
    // makes — one rider does the whole trip's multi-stop pickup (this
    // file's own header note), so every leg shares the identical
    // rider_id; fetched once here and attached to every leg rather than
    // once per leg. Only present once a rider is actually assigned
    // (out_for_delivery onward) — same "never a placeholder" rule.
    const ridersById = new Map<string, { name: string; phone: string; deliveries: number }>();
    const riderIds = [...new Set((orders ?? []).map((o) => o.rider_id).filter((id): id is string => !!id))];
    if (riderIds.length > 0) {
      await Promise.all(
        riderIds.map(async (riderId) => {
          const [{ data: riderRow }, { count: deliveries }] = await Promise.all([
            supabase.from('riders').select('name, phone').eq('user_id', riderId).single(),
            supabase.from('orders').select('id', { count: 'exact', head: true }).eq('rider_id', riderId).eq('status', 'delivered'),
          ]);
          if (riderRow) ridersById.set(riderId, { ...riderRow, deliveries: deliveries ?? 0 });
        }),
      );
    }
    const ordersWithRiders = (orders ?? []).map((o) => ({ ...o, riders: o.rider_id ? (ridersById.get(o.rider_id) ?? null) : null }));

    res.json({ ...trip, orders: ordersWithRiders });
  } catch (err) {
    next(err);
  }
});
