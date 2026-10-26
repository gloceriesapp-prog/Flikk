import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const supportRouter = Router();
supportRouter.use(requireAuth, requireRole('customer'));
// Old installations must not keep creating tickets after the switch to email.
supportRouter.use((_req, _res, next) => {
  next(new AppError(410, 'SUPPORT_MOVED_TO_EMAIL', 'Customer support is now available by email. Open Help & support in the updated app, or email hello@gloceries.com.'));
});
