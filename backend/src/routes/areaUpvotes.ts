// Public. Source: UpvoteAreaBar.tsx/UnavailableZoneSection.tsx — "bring the
// app to my area" vote, anonymous (no requireAuth: a customer outside the
// delivery zone may not even be signed in yet).
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export const areaUpvotesRouter = Router();

areaUpvotesRouter.post('/', async (req, res, next) => {
  try {
    const { latitude, longitude, addressLabel } = req.body ?? {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError(400, 'INVALID_COORDS', 'latitude/longitude must be numbers');
    }
    if (typeof addressLabel !== 'string' || !addressLabel.trim()) {
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
