// Customer-facing browse/catalog. Source: specs/01-customer-app/api.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export const storesRouter = Router();

storesRouter.get('/', async (req, res, next) => {
  try {
    const zoneId = req.query.zone_id as string | undefined;
    if (!zoneId) throw new AppError(400, 'MISSING_ZONE', 'zone_id query param is required.');
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

storesRouter.get('/:id/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
