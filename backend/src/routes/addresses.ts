// Real address book — source: this session's own explicit ask ("added
// once, then automatic whenever there's an order"). A customer's first
// order collects a real saved address (name, phone, full text, optional
// landmark/label/instructions, the real map pin they picked); every order
// after that just reuses it, with a real "Add new address" flow for a
// second one. POST /orders (routes/orders.ts) already accepted a real
// address_id from day one — this is what actually creates one instead of
// the customer app always falling back to its inline-address path.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const addressesRouter = Router();
addressesRouter.use(requireAuth, requireRole('customer'));

addressesRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', req.user!.id)
      .is('deleted_at', null)
      .order('is_default', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

interface CreateAddressBody {
  label?: string;
  line1: string;
  landmark?: string;
  recipient_name: string;
  recipient_phone?: string;
  delivery_instructions?: string;
  latitude: number;
  longitude: number;
}

addressesRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as Partial<CreateAddressBody>;
    if (!body.line1?.trim()) throw new AppError(400, 'MISSING_LINE1', 'line1 is required.');
    if (!body.recipient_name?.trim()) throw new AppError(400, 'MISSING_RECIPIENT_NAME', 'recipient_name is required.');
    if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) || Math.abs(body.latitude!) > 90 || Math.abs(body.longitude!) > 180) {
      throw new AppError(400, 'MISSING_LOCATION', 'A real map pin (latitude/longitude) is required.');
    }

    // Single zone at launch (CLAUDE.md) — same "no zone-picker exists,
    // fall back to whichever zone is active" resolution as GET /stores.
    const { data: zone, error: zoneError } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
    if (zoneError || !zone) throw new AppError(500, 'NO_ACTIVE_ZONE', 'No active zone configured.');

    const { data, error } = await supabase.rpc('manage_customer_address', {
      p_customer: req.user!.id, p_action: 'create', p_data: { ...body, zone_id: zone.id },
    });
    if (error || !data) throw new AppError(500, 'ADDRESS_CREATE_FAILED', 'Could not save this address.');

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

addressesRouter.patch('/:id/default', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.rpc('manage_customer_address', {
      p_customer: req.user!.id, p_action: 'default', p_id: req.params.id,
    });
    if (error) throw error;
    if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

    res.json(data);
  } catch (err) {
    next(err);
  }
});

addressesRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.rpc('manage_customer_address', {
      p_customer: req.user!.id, p_action: 'delete', p_id: req.params.id,
    });
    if (error) throw error;
    if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
