// Source: specs/04-admin-dashboard/api.md — admin-only, no auto-assign/auto-approve logic.
// A3's assignment only succeeds against packed, unassigned orders — enforced here, not just in UI.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/stores/pending', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('stores').select('*, users!owner_user_id(is_approved)').eq('users.is_approved', false);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/stores/pending/:userId', async (req, res, next) => {
  try {
    const { approve } = req.body as { approve: boolean };
    const { data, error } = await supabase.from('users').update({ is_approved: approve }).eq('id', req.params.userId).eq('role', 'store_owner').select().single();
    if (error || !data) throw new AppError(404, 'USER_NOT_FOUND', 'No pending store owner with that id.');
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
    let query = supabase.from('orders').select('*').order('placed_at', { ascending: false }).limit(100);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/orders/:id/assign-rider', async (req, res, next) => {
  try {
    const { rider_id } = req.body as { rider_id: string };
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
    res.json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/payouts', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('payouts').select('*').order('week_start', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
