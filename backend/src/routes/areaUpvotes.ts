// Public. Source: UpvoteAreaBar.tsx/UnavailableZoneSection.tsx — "bring the
// app to my area" vote, anonymous (no requireAuth: a customer outside the
// delivery zone may not even be signed in yet).
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';

export const areaUpvotesRouter = Router();

areaUpvotesRouter.post('/', async (req, res, next) => {
  try {
    const { latitude, longitude, addressLabel } = req.body ?? {};
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new AppError(400, 'INVALID_COORDS', 'latitude/longitude must be numbers');
    }
    if (typeof addressLabel !== 'string' || !addressLabel.trim() || addressLabel.length > 500) {
      throw new AppError(400, 'INVALID_ADDRESS_LABEL', 'addressLabel is required');
    }

    const { error } = await supabase
      .from('area_upvotes')
      .insert({ latitude, longitude, address_label: addressLabel.trim() });
    if (error) throw error;

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

areaUpvotesRouter.post('/subscribe', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { latitude, longitude, addressLabel } = req.body ?? {};
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || typeof addressLabel !== 'string' || !addressLabel.trim() || addressLabel.length > 500)
      throw new AppError(400, 'INVALID_WAITLIST', 'Choose a valid delivery location.');
    const { error } = await supabase.rpc('subscribe_area_waitlist', { p_customer: req.user!.id, p_lat: latitude, p_lng: longitude, p_address: addressLabel.trim() });
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) { next(error); }
});
