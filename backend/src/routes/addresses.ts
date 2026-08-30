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
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      throw new AppError(400, 'MISSING_LOCATION', 'A real map pin (latitude/longitude) is required.');
    }

    // Single zone at launch (CLAUDE.md) — same "no zone-picker exists,
    // fall back to whichever zone is active" resolution as GET /stores.
    const { data: zone, error: zoneError } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
    if (zoneError || !zone) throw new AppError(500, 'NO_ACTIVE_ZONE', 'No active zone configured.');

    // First address for this account becomes the default automatically —
    // nothing to choose between yet. A second/third address never
    // silently steals default from an existing one; that's only ever a
    // deliberate PATCH /:id/default.
    const { count: existingCount } = await supabase
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user!.id);

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: req.user!.id,
        label: body.label?.trim() || 'Home',
        line1: body.line1.trim(),
        landmark: body.landmark?.trim() || null,
        recipient_name: body.recipient_name.trim(),
        recipient_phone: body.recipient_phone?.trim() || null,
        delivery_instructions: body.delivery_instructions?.trim() || null,
        latitude: body.latitude,
        longitude: body.longitude,
        zone_id: zone.id,
        is_default: (existingCount ?? 0) === 0,
      })
      .select()
      .single();
    if (error || !data) throw new AppError(500, 'ADDRESS_CREATE_FAILED', 'Could not save this address.');

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

addressesRouter.patch('/:id/default', async (req: AuthedRequest, res, next) => {
  try {
    const { data: owned } = await supabase.from('addresses').select('id').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (!owned) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

    // Two writes, not a single conditional update — Supabase JS has no
    // multi-row "set every OTHER row false" primitive in one call, and
    // this table is small per user (a handful of addresses at most), so
    // the extra round trip is cheap. Order matters: clear every other
    // default first, then set this one, so a request that fails partway
    // never leaves two rows both marked default.
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', req.user!.id).neq('id', req.params.id);
    const { data, error } = await supabase.from('addresses').update({ is_default: true }).eq('id', req.params.id).select().single();
    if (error || !data) throw new AppError(500, 'ADDRESS_UPDATE_FAILED', 'Could not update this address.');

    res.json(data);
  } catch (err) {
    next(err);
  }
});

addressesRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const { data: target } = await supabase.from('addresses').select('id, is_default').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (!target) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

    const { error } = await supabase.from('addresses').delete().eq('id', req.params.id);
    if (error) {
      // 23503 = foreign_key_violation — orders.address_id references this
      // row with no ON DELETE behavior (migrations/001_init.sql), so any
      // address a real order was ever placed against can't be hard-deleted
      // without corrupting that order's history. A real, expected
      // referential-integrity failure, not a bug — surfaced as a clear 409
      // instead of falling through to errorHandler's generic 500 (raw
      // Postgrest errors aren't AppError instances, so an unwrapped throw
      // here would otherwise read as "Something went wrong" with no way
      // to tell a real server bug apart from this expected case).
      if ((error as { code?: string }).code === '23503') {
        throw new AppError(409, 'ADDRESS_IN_USE', 'This address is linked to a past order and can\'t be deleted.');
      }
      throw error;
    }

    // Deleting the default address shouldn't leave the account with zero
    // default among any addresses it still has — promote whichever one's
    // left, arbitrarily (no real recency signal on this table to prefer
    // one over another).
    if (target.is_default) {
      const { data: remaining } = await supabase.from('addresses').select('id').eq('user_id', req.user!.id).limit(1).single();
      if (remaining) await supabase.from('addresses').update({ is_default: true }).eq('id', remaining.id);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
