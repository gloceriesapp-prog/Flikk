// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const riderRouter = Router();
riderRouter.use(requireAuth, requireRole('rider'), requireApproved);

// Same join shape as partner.ts's own GET /orders (store's side of this
// same order) — order_items -> products for real item names, users via the
// customer_id FK (orders also has a rider_id FK to the same users table,
// hence the explicit !customer_id hint — PostgREST can't otherwise tell
// which FK to embed through) for the customer's name/phone, addresses for
// the drop location including its real lat/lng (used for the live-GPS
// final-leg map, CLAUDE.md's rider-app exception), and stores for the
// pickup name + its own lat/lng (migration 005).
riderRouter.get('/assignments', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        // stores has no street-address column at all (migration 005 only
        // ever added lat/lng) — zones(name) is the most specific real
        // location text available for a pickup point today.
        '*, order_items(*, products(name, unit)), stores(name, lat, lng, zones(name)), users!customer_id(name, phone), addresses(line1, landmark, latitude, longitude)',
      )
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
