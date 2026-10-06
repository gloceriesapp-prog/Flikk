import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
export const privacyRouter = Router();
privacyRouter.use(requireAuth, requireRole('customer'));
privacyRouter.get('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.from('customer_deletion_requests').select('id,status,created_at,reviewed_at,completed_at,review_note')
      .eq('customer_id', req.user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.set('Cache-Control', 'private, no-store').json(data);
  } catch (error) { next(error); }
});
privacyRouter.post('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    const reason = req.body.reason ?? '';
    if (typeof reason !== 'string' || reason.length > 1000) throw new AppError(400, 'INVALID_REASON', 'Keep your reason under 1,000 characters.');
    const { data, error } = await supabase.rpc('request_customer_deletion', { p_customer: req.user!.id, p_reason: reason });
    if (error) throw error;
    res.status(202).json({ id: data.id, status: data.status });
  } catch (error) { next(error); }
});
