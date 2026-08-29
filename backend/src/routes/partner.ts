// Source: specs/02-partner-app/api.md — every query scoped to the caller's own store,
// never trusting a store_id from the request body.
//
// A product a store owner adds/edits here lands with products.approval_status
// = 'pending' (POST /products below) — it's real, scoped to their own
// store, visible in their own GET /products, but every customer-facing
// feed (routes/stores.ts, routes/categories.ts) filters to 'approved' only,
// so it stays invisible to shoppers until a founder approves it from
// admin. This is the same "store owner writes, admin approval gates
// visibility" shape as store onboarding itself (storeOnboarding.ts).
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { replaceProductVariants } from '../db/productVariants.js';
import { AppError, asValidationError } from '../lib/errors.js';
import { toProductRow, validateProductInput, type ProductInput } from '../lib/products.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const partnerRouter = Router();
partnerRouter.use(requireAuth, requireRole('store_owner'), requireApproved);

async function ownStoreId(userId: string): Promise<string> {
  const { data, error } = await supabase.from('stores').select('id').eq('owner_user_id', userId).single();
  if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
  return data.id;
}

partnerRouter.get('/store', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, category, is_active, district, photo_url, phone, open_time, close_time, avg_prep_minutes')
      .eq('owner_user_id', req.user!.id)
      .single();
    if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch('/store', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { name, category, is_active, district, open_time, close_time, avg_prep_minutes } = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (category !== undefined) patch.category = category;
    if (is_active !== undefined) patch.is_active = is_active;
    if (district !== undefined) patch.district = district;
    if (open_time !== undefined) patch.open_time = open_time;
    if (close_time !== undefined) patch.close_time = close_time;
    if (avg_prep_minutes !== undefined) patch.avg_prep_minutes = avg_prep_minutes;

    const { data, error } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', storeId)
      .select('id, name, category, is_active, district, photo_url, phone, open_time, close_time, avg_prep_minutes')
      .single();
    if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.get('/orders', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('store_id', storeId).order('placed_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Product photo upload — base64 in, public Storage URL out. Same
// bucket/pattern as admin's own upload route (apps/admin/src/app/api/
// upload — 'product-images'), so a photo uploaded from either app renders
// identically wherever products.image_url is read.
partnerRouter.post('/product-photo', async (req: AuthedRequest, res, next) => {
  try {
    const { base64, contentType } = req.body as { base64?: string; contentType?: string };
    if (!base64 || !contentType) throw new AppError(400, 'MISSING_FIELDS', 'base64 and contentType are required.');

    const storeId = await ownStoreId(req.user!.id);
    const extension = contentType.split('/')[1] ?? 'jpg';
    const path = `${storeId}/${randomUUID()}.${extension}`;
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(path, Buffer.from(base64, 'base64'), { contentType });
    if (uploadErr) throw new AppError(500, 'UPLOAD_FAILED', uploadErr.message);

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
});

partnerRouter.get('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data, error } = await supabase.from('products').select('*, product_variants(*)').eq('store_id', storeId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.post('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    // storeId always comes from the caller's own store, never req.body —
    // a store owner can only ever create a product for themselves, even if
    // the request body carries a different storeId.
    const input: Partial<ProductInput> = { ...req.body, storeId };
    validateProductInput(input);

    // A store owner's own product never goes live on its own — see this
    // router's own note at the top and backend/src/routes/stores.ts's
    // customer-facing feeds, every one of which filters to 'approved'
    // only. Admin's own POST /api/products (apps/admin) sets 'approved'
    // instead, since a founder adding a product for a store is already the
    // approval.
    const { data: product, error } = await supabase
      .from('products')
      .insert({ ...toProductRow(input), approval_status: 'pending' })
      .select()
      .single();
    if (error) throw error;

    await replaceProductVariants(product.id, input.variants);
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', product.id)
      .single();
    if (refetchError) throw refetchError;

    res.status(201).json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

partnerRouter.patch('/products/:id', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const input: Partial<ProductInput> = { ...req.body, storeId };
    validateProductInput(input);

    // scoped by store_id so a store owner cannot edit another store's product
    // even with a guessed product id
    const { data: product, error } = await supabase
      .from('products')
      .update(toProductRow(input))
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select()
      .single();
    if (error || !product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Not found for this store.');

    await replaceProductVariants(product.id, input.variants);
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', product.id)
      .single();
    if (refetchError) throw refetchError;

    res.json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

partnerRouter.get('/payouts', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data, error } = await supabase.from('payouts').select('*').eq('store_id', storeId).order('week_start', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
