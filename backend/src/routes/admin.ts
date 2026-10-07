import { readPage, cursorFilter, sendPage } from '../lib/cursorPagination.js';
// Source: specs/04-admin-dashboard/api.md — admin-only, no auto-assign/auto-approve logic.
// A3's assignment only succeeds against packed, unassigned orders — enforced here, not just in UI.
// Product routes are Inventory's own write path — admin-scoped (any store),
// not the store-owner-scoped ones in routes/partner.ts; both share the same
// lib/products.ts validation/mapping.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { saveCatalogueProduct } from '../db/productVariants.js';
import { AppError, asValidationError } from '../lib/errors.js';
import {
  toProductPatchRow,
  toProductRow,
  toVariantPayload,
  validateProductInput,
  validateProductPatch,
  type ProductInput,
} from '../lib/products.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { sendPushNotification } from '../lib/pushNotifications.js';
import { createNotification } from '../lib/notifications.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

// Inventory (admin dashboard's own screen) — same lib/products.ts
// validation/mapping routes/partner.ts uses for a store owner's own
// products, just without the store-scoping: a founder can list/create/edit
// a product for any store, storeId comes straight from the request body
// instead of being derived from the caller.
adminRouter.get('/products', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, stores(name, district), product_variants(*)')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const input: Partial<ProductInput> = req.body;
    validateProductInput(input);

    const productId = await saveCatalogueProduct({
      productId: null,
      storeScope: null,
      fields: toProductRow(input),
      variants: toVariantPayload(input.variants, input.stockQuantity),
    });
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, stores(name, district), product_variants(*)')
      .eq('id', productId)
      .single();
    if (refetchError) throw refetchError;

    res.status(201).json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    // Partial update: only fields present in the body are written.
    const input: unknown = req.body;
    validateProductPatch(input);
    const fields: Record<string, unknown> = { ...toProductPatchRow(input) };
    if ('storeId' in (input as object)) fields.store_id = (input as { storeId: unknown }).storeId;
    if (input.imageUrl !== undefined) {
      fields.image_url = input.imageUrl?.trim() || null;
      fields.pending_image_url = null;
    }
    const productId = await saveCatalogueProduct({
      productId: String(req.params.id),
      storeScope: null,
      fields,
      variants: input.variants ? toVariantPayload(input.variants, input.stockQuantity) : null,
    });
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, stores(name, district), product_variants(*)')
      .eq('id', productId)
      .single();
    if (refetchError) throw refetchError;

    res.json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

adminRouter.get('/stores/pending', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('stores').select('*, users!owner_user_id(is_approved)').eq('users.is_approved', false);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/riders/pending', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'rider').eq('is_approved', false);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/riders/pending/:userId', async (req, res, next) => {
  try {
    const { approve } = req.body as { approve: boolean };
    const { data, error } = await supabase.from('users').update({ is_approved: approve }).eq('id', req.params.userId).eq('role', 'rider').select().single();
    if (error || !data) throw new AppError(404, 'USER_NOT_FOUND', 'No pending rider with that id.');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/orders', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const page = readPage(req, `admin-orders:${(req as AuthedRequest).user!.id}:${status ?? ''}`);
    let query = supabase.from('orders').select('id, order_number, customer_id, store_id, rider_id, trip_id, status, total, item_total, delivery_fee, handling_fee, discount_amount, commission_amount, payment_method, placed_at, packed_at, picked_up_at, delivered_at, cancel_reason, refund_status');
    if (page.cursor) query = query.or(cursorFilter('placed_at', page.cursor));
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('placed_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;
    sendPage(res, data ?? [], page, 'placed_at');
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/orders/:id/assign-rider', async (req, res, next) => {
  try {
    const { rider_id } = req.body as { rider_id: string };
    // A multi-store trip has exactly one rider. Assigning one leg here would
    // leave its siblings open to dispatch to a different rider, and a trip
    // split across riders can never be delivered or failed. trip_id never
    // changes after checkout, so this read cannot race the update below.
    const { data: target } = await supabase.from('orders').select('trip_id').eq('id', req.params.id).maybeSingle();
    if (target?.trip_id) {
      throw new AppError(409, 'TRIP_ASSIGNMENT_REQUIRED', `This order is part of a trip. Assign the whole trip via /admin/trips/${target.trip_id}/assign-rider.`);
    }
    // only packed, unassigned orders are eligible — no auto-suggest logic here,
    // this is the single manual-assignment write path. See out-of-scope.md.
    const { data, error } = await supabase
      .from('orders')
      .update({ rider_id })
      .eq('id', req.params.id)
      .eq('status', 'packed')
      .is('rider_id', null)
      .select()
      .single();
    if (error || !data) {
      throw new AppError(409, 'NOT_ASSIGNABLE', 'Order is not packed or already has a rider.');
    }

    // Best-effort, never blocks the assignment itself — a rider who missed
    // the push still sees the real assignment next time their own app
    // polls GET /rider/assignments (apps/rider's useRiderOrdersStore.ts).
    const { data: rider } = await supabase.from('users').select('expo_push_token').eq('id', rider_id).single();
    void sendPushNotification(rider?.expo_push_token, 'New delivery assigned', `Order ${data.id.slice(0, 6).toUpperCase()} is ready for pickup.`);
    // Same event, persisted to the rider's feed (migration 054) — durable
    // behind the push. orderId links this single assignment to its one order.
    void createNotification({
      userId: rider_id,
      title: 'New delivery assigned',
      body: `Order ${data.id.slice(0, 6).toUpperCase()} is ready for pickup.`,
      type: 'assignment',
      orderId: data.id,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Trip-wide rider assignment — one manual action assigns every unassigned
// leg of a multi-store trip (routes/trips.ts) to the same rider, instead
// of the founder repeating the single-order assignment above once per
// store. Deliberately does NOT require every leg to already be 'packed'
// (unlike the single-order endpoint): the rider is assigned to the whole
// multi-stop trip upfront and travels to each store in turn, picking up
// whichever legs are ready by the time they arrive — apps/rider's own
// screen shows the trip as one job with N pickup stops + 1 drop, in the
// order the legs were created (routes/trips.ts's own GET /:id note).
adminRouter.patch('/trips/:id/assign-rider', async (req, res, next) => {
  try {
    const { rider_id } = req.body as { rider_id: string };
    // assign_trip_rider (migration 107) runs under the trip's advisory lock and
    // refuses when a live leg already belongs to another rider, so a rider
    // accept racing this call can never leave the trip split across riders.
    const { data, error } = await supabase.rpc('assign_trip_rider', { p_trip: req.params.id, p_rider: rider_id });
    if (error?.code === 'P0409') throw new AppError(409, 'TRIP_HAS_RIDER', 'Another rider already has this trip.');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new AppError(409, 'NOT_ASSIGNABLE', 'Trip has no unassigned legs.');
    }

    const { data: rider } = await supabase.from('users').select('expo_push_token').eq('id', rider_id).single();
    void sendPushNotification(
      rider?.expo_push_token,
      'New delivery assigned',
      `A ${data.length}-stop pickup is ready for you.`,
    );
    // Feed row for the same trip assignment. orderId is null — a multi-store
    // trip spans N orders, so no single order id belongs on the notification.
    void createNotification({
      userId: rider_id,
      title: 'New delivery assigned',
      body: `A ${data.length}-stop pickup is ready for you.`,
      type: 'assignment',
      orderId: null,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/payouts', async (req, res, next) => {
  try {
    const page = readPage(req, `admin-payouts:${(req as AuthedRequest).user!.id}`, 'date');
    let query = supabase.from('payouts').select('id, store_id, week_start, week_end, gross_amount, commission_deducted, net_payout, status, paid_at, utr, payment_mode');
    if (page.cursor) query = query.or(cursorFilter('week_start', page.cursor));
    const { data, error } = await query.order('week_start', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;
    sendPage(res, data ?? [], page, 'week_start');
  } catch (err) {
    next(err);
  }
});

// Support action: no code is returned here; only the order's customer can read it.
adminRouter.post('/orders/:id/delivery-code/reissue',async(req:AuthedRequest,res,next)=>{
  try {
    const {error}=await supabase.rpc('reissue_delivery_code',{p_order:req.params.id,p_actor:req.user!.id});
    if(error) throw new AppError(409,'CODE_REISSUE_UNAVAILABLE','A new code can only be issued for an active delivery.');
    res.json({reissued:true});
  } catch(error) {next(error);}
});

adminRouter.post('/trips/:id/failure-refund', async (req: AuthedRequest, res, next) => {
  try {
    const amount = req.body.amountPaise;
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new AppError(400, 'INVALID_REFUND', 'Enter an approved refund amount in paise.');
    const { error } = await supabase.rpc('approve_failed_trip_refund', { p_trip: req.params.id, p_amount_paise: amount });
    if (error) throw new AppError(409, 'REFUND_UNAVAILABLE', 'This trip cannot accept that refund amount.');
    res.json({ queued: true });
  } catch (error) { next(error); }
});
