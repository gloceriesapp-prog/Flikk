import { Router } from 'express';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { uuid } from '../support/contracts.js';
import { providerReady } from './providers.js';
export const promotionsRouter = Router();
promotionsRouter.use(requireAuth, requireRole('admin'));
// Bounded explicit recipients; no whole-user-table scan or broadcast in a request.
promotionsRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const { campaign_id, customer_ids, channel, subject, body } = req.body;
    const campaignId = uuid(campaign_id);
    if (!['sms', 'email'].includes(channel) || !Array.isArray(customer_ids) || !customer_ids.length || customer_ids.length > 100 ||
        typeof subject !== 'string' || !subject.trim() || subject.length > 120 || typeof body !== 'string' || !body.trim() || body.length > 2000) {
      throw new AppError(400, 'INVALID_CAMPAIGN', 'Use one channel and up to 100 recipients with a subject and message.');
    }
    if (!providerReady(channel)) throw new AppError(503, 'PROMOTIONS_DISABLED', 'Configure and enable the promotional provider first.');
    const ids = [...new Set(customer_ids.map(id => uuid(id)))];
    const { data: customers, error: customerError } = await supabase.from('users').select('id').in('id', ids).eq('role', 'customer');
    if (customerError) throw customerError;
    if (customers?.length !== ids.length) throw new AppError(400, 'INVALID_RECIPIENTS', 'Select existing customer accounts.');
    const { error } = await supabase.from('promotional_deliveries').upsert(ids.map(customer_id => ({
      campaign_id: campaignId, customer_id, channel, subject: subject.trim(), body: body.trim(),
    })), { onConflict: 'campaign_id,customer_id,channel', ignoreDuplicates: true });
    if (error) throw error;
    res.status(202).json({ campaign_id: campaignId, recipients: ids.length });
  } catch (error) { next(error); }
});
promotionsRouter.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('promotional_deliveries').select('id,customer_id,channel,status,attempts,provider_id,updated_at')
      .eq('campaign_id', uuid(req.params.id)).order('id').limit(100);
    if (error) throw error;
    res.json({ items: data });
  } catch (error) { next(error); }
});
