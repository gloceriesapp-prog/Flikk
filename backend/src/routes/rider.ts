// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const riderRouter = Router();
riderRouter.use(requireAuth, requireRole('rider'), requireApproved);

riderRouter.get('/assignments', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('rider_id', req.user!.id)
      .order('placed_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/earnings', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rider_earnings')
      .select('*')
      .eq('rider_id', req.user!.id)
      .order('paid_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
