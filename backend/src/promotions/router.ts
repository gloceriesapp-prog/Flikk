import { Router } from 'express';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { promotionsSwitchOn } from '../lib/platformSettings.js';
import { uuid } from '../support/contracts.js';
import { providerReady } from './providers.js';
import { CampaignError, deliveryRows, parseCampaign } from '../../../packages/promotions/campaign.cjs';
export const promotionsRouter = Router();
promotionsRouter.use(requireAuth, requireRole('admin'));
// Bounded explicit recipients; no whole-user-table scan or broadcast in a request.
// Validation and rows are shared with the admin Promotions page route
// (packages/promotions/campaign.cjs).
promotionsRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    let campaign;
    try { campaign = parseCampaign(req.body); } catch (error) {
      if (error instanceof CampaignError) throw new AppError(400, error.code, error.message);
      throw error;
    }
    if (!providerReady(campaign.channel)) throw new AppError(503, 'PROMOTIONS_DISABLED', 'Configure and enable the promotional provider first.');
    if (!(await promotionsSwitchOn())) throw new AppError(503, 'PROMOTIONS_DISABLED', 'Turn promotions on in admin first.');
    const ids = campaign.customerIds;
    const { data: customers, error: customerError } = await supabase.from('users').select('id').in('id', ids).eq('role', 'customer');
    if (customerError) throw customerError;
    if (customers?.length !== ids.length) throw new AppError(400, 'INVALID_RECIPIENTS', 'Select existing customer accounts.');
    const { error } = await supabase.from('promotional_deliveries').upsert(deliveryRows(campaign),
      { onConflict: 'campaign_id,customer_id,channel', ignoreDuplicates: true });
    if (error) throw error;
    res.status(202).json({ campaign_id: campaign.campaignId, recipients: ids.length });
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
