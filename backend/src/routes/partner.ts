// Source: specs/02-partner-app/api.md — every query scoped to the caller's own store,
// never trusting a store_id from the request body.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const partnerRouter = Router();
partnerRouter.use(requireAuth, requireRole('store_owner'), requireApproved);

async function ownStoreId(userId: string): Promise<string> {
  const { data, error } = await supabase.from('stores').select('id').eq('owner_user_id', userId).single();
  if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
  return data.id;
}

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

partnerRouter.get('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.post('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { name, unit, price, category, image_url } = req.body;
    const { data, error } = await supabase
      .from('products')
      .insert({ store_id: storeId, name, unit, price, category, image_url, is_in_stock: true })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch('/products/:id', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    // scoped by store_id so a store owner cannot edit another store's product
    // even with a guessed product id
    const { data, error } = await supabase
      .from('products')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select()
      .single();
    if (error || !data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Not found for this store.');
    res.json(data);
  } catch (err) {
    next(err);
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
