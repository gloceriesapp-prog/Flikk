// Customer-facing. Single global row (migrations/029_delivery_settings.sql)
// — apps/admin writes it directly via its own service-role Supabase client
// (apps/admin/src/app/api/delivery-settings/route.ts), this is read-only.
// Reuses lib/deliverySettings.ts's own getDeliverySettings (same numeric
// coercion + camelCase mapping POST /orders and POST /trips already rely
// on for the real charged amount), so this display value and the real
// charge can never read the row differently.
import { Router } from 'express';
import { getDeliverySettings } from '../lib/deliverySettings.js';

export const deliverySettingsRouter = Router();

deliverySettingsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await getDeliverySettings());
  } catch (err) {
    next(err);
  }
});
