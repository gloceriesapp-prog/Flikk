// Customer-facing. Source: specs/01-customer-app/api.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const zonesRouter = Router();

zonesRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('zones').select('*').eq('is_active', true);
    if (error) throw error;
    // Public and rarely edited: phones and any shared cache may reuse it for a
    // minute (shortCache already absorbs repeat reads on the server).
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
    res.json(data);
  } catch (err) {
    next(err);
  }
});
