import { Router, type RequestHandler } from 'express';
import { requireAuth, requireRole, requireApproved, requireActivePartner, type AuthedRequest } from '../middleware/auth.js';
import { requireStoreAccess } from '../stores/access.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { validateStoreFields } from '../stores/validation.js';
import { readPage, encodeCursor } from '../lib/cursorPagination.js';

export const DOCUMENT_REPLACEMENT_FIELDS = [
  'pan_number', 'gst_number', 'fssai_number', 'shop_establishment_number',
] as const;

export function documentReplacement(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new AppError(400, 'INVALID_DOCUMENT', 'Choose a document to replace.');
  const fields = Object.entries(body);
  if (fields.length !== 1) {
    throw new AppError(400, 'INVALID_DOCUMENT', 'Send one non-empty document number.');
  }
  const field = fields[0]!;
  if (!DOCUMENT_REPLACEMENT_FIELDS.includes(field[0] as typeof DOCUMENT_REPLACEMENT_FIELDS[number])
    || typeof field[1] !== 'string' || !field[1].trim()) {
    throw new AppError(400, 'INVALID_DOCUMENT', 'Send one non-empty document number.');
  }
  const [key, value] = fields[0]!;
  const changes: Record<string, string> = { [key]: (value as string).trim().toUpperCase() };
  try {
    validateStoreFields(changes);
  } catch (err) {
    throw new AppError(400, 'INVALID_DOCUMENT', err instanceof Error ? err.message : 'Invalid document.');
  }
  if (changes.gst_number && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(changes.gst_number))
    throw new AppError(400, 'INVALID_DOCUMENT', 'Enter a valid GST number.');
  if (changes.shop_establishment_number && changes.shop_establishment_number.length > 100) {
    throw new AppError(400, 'INVALID_DOCUMENT', 'Document number must be 100 characters or fewer.');
  }
  return changes;
}
const uuid = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
export const partnerManagementRouter = Router();
partnerManagementRouter.use(requireAuth, requireRole('store_owner'), requireApproved, requireActivePartner);
export const requireStoreOwner: RequestHandler = async (req: AuthedRequest, _res, next) => {
  try {
    if ((await requireStoreAccess(req.user!.id)).role !== 'owner') {
      throw new AppError(403, 'OWNER_REQUIRED', 'Only the owner can manage staff or legal documents.');
    }
    next();
  } catch (error) {
    next(error);
  }
};
partnerManagementRouter.use(requireStoreOwner);
partnerManagementRouter.get('/team', async (req: AuthedRequest, res, next) => {
  try {
    const { storeId } = await requireStoreAccess(req.user!.id);
    const page = readPage(req, `partner-team:${storeId}`, 'uuid');
    let query = supabase.from('store_memberships')
      .select('user_id,role,users!user_id(name)')
      .eq('store_id', storeId)
      .eq('is_active', true);
    if (page.cursor)
      query = query.lt('user_id', page.cursor.id);
    const { data, error } = await query.order('user_id', { ascending: false }).limit(page.limit + 1);
    if (error)
      throw error;
    const rows = data ?? [];
    const items = rows.slice(0, page.limit);
    const last = items.at(-1);
    const nextCursor = rows.length > page.limit && last
      ? encodeCursor(page, { at: last.user_id, id: last.user_id }) : null;
    res.json({ items, nextCursor });
  } catch (error) {
    next(error);
  }
});
partnerManagementRouter.delete('/team/:id', async (req: AuthedRequest, res, next) => {
  try {
    if (!uuid.test(String(req.params.id)))
      throw new AppError(400, 'INVALID_MEMBER', 'Invalid team member.');
    const { storeId } = await requireStoreAccess(req.user!.id);
    const { error } = await supabase.rpc('partner_remove_store_member', {
      p_store: storeId, p_owner: req.user!.id, p_member: req.params.id,
    });
    if (error) {
      if (error.code === 'P0403')
        throw new AppError(403, 'OWNER_REQUIRED', 'Only the owner can remove staff.');
      if (error.code === 'P0400')
        throw new AppError(400, 'INVALID_MEMBER', error.message);
      throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
partnerManagementRouter.post('/document-replacements', async (req: AuthedRequest, res, next) => {
  try {
    const changes = documentReplacement(req.body);
    const { storeId } = await requireStoreAccess(req.user!.id);
    const { data, error } = await supabase.rpc('partner_request_store_profile_change', {
      p_store: storeId, p_user: req.user!.id, p_changes: changes,
    });
    if (error) {
      const status = ({ P0403: 403, P0404: 404, P0409: 409, P0400: 400 } as Record<string, number>)[error.code] ?? 500;
      if (status !== 500)
        throw new AppError(status, 'DOCUMENT_REVIEW_FAILED', error.message);
      throw error;
    }
    res.status(202).json({ request: data, pendingReview: !!data });
  } catch (err) {
    next(err);
  }
});
