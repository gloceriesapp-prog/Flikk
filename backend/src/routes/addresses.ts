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
import { normalizePhone } from '../lib/phone.js';
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
  // Create only: make this the default in the same transaction, so a retry
  // never leaves a duplicate behind a failed follow-up "set default" call.
  make_default?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const optionalText = (value: unknown, max: number, field: string): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length > max) throw new AppError(400, 'INVALID_ADDRESS', `${field} must be text up to ${max} characters.`);
  return value;
};

// Same validation for create and edit — the edit form sends the full address.
export function validateAddressBody(raw: unknown) {
  const body = (raw ?? {}) as Partial<CreateAddressBody>;
  if (typeof body.line1 !== 'string' || !body.line1.trim() || body.line1.length > 300) throw new AppError(400, 'MISSING_LINE1', 'line1 is required.');
  if (typeof body.recipient_name !== 'string' || !body.recipient_name.trim() || body.recipient_name.length > 100) throw new AppError(400, 'MISSING_RECIPIENT_NAME', 'recipient_name is required.');
  if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) || Math.abs(body.latitude!) > 90 || Math.abs(body.longitude!) > 180) {
    throw new AppError(400, 'MISSING_LOCATION', 'A real map pin (latitude/longitude) is required.');
  }
  const phone = optionalText(body.recipient_phone, 20, 'recipient_phone');
  return {
    label: optionalText(body.label, 40, 'label'),
    line1: body.line1,
    landmark: optionalText(body.landmark, 200, 'landmark'),
    recipient_name: body.recipient_name,
    // Indian mobile only — the rider calls this number at the door.
    recipient_phone: phone?.trim() ? normalizePhone(phone) : undefined,
    delivery_instructions: optionalText(body.delivery_instructions, 300, 'delivery_instructions'),
    latitude: body.latitude!,
    longitude: body.longitude!,
  };
}

// Single zone at launch (CLAUDE.md) and no pin->zone lookup exists yet, so
// this is the same "whichever zone is active" resolution as GET /stores.
// ponytail: first active zone; switch to a geofence lookup when zone #2 ships.
async function activeZoneId(): Promise<string> {
  const { data: zone, error } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
  if (error || !zone) throw new AppError(500, 'NO_ACTIVE_ZONE', 'No active zone configured.');
  return zone.id as string;
}

addressesRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const address = validateAddressBody(req.body);
    const { data, error } = await supabase.rpc('manage_customer_address', {
      p_customer: req.user!.id, p_action: 'create',
      p_data: { ...address, zone_id: await activeZoneId(), make_default: (req.body as CreateAddressBody).make_default === true },
    });
    if (error || !data) throw new AppError(500, 'ADDRESS_CREATE_FAILED', 'Could not save this address.');

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /addresses/:id — edit a saved address the caller owns.
addressesRouter.patch('/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!UUID.test(String(req.params.id))) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');
    const address = validateAddressBody(req.body);
    const { data, error } = await supabase.rpc('manage_customer_address', {
      p_customer: req.user!.id, p_action: 'update', p_id: req.params.id, p_data: { ...address, zone_id: await activeZoneId() },
    });
    if (error) throw new AppError(500, 'ADDRESS_UPDATE_FAILED', 'Could not update this address.');
    if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

    res.json(data);
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
