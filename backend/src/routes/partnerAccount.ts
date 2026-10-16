// Store-partner account deletion requests: GET/POST /partner/account/deletion-request.
//
// Mounted ahead of storeOnboardingRouter and partnerRouter because the
// latter requires an APPROVED and ACTIVE store owner, while Play requires
// deletion to be available to every partner account: pending review and
// suspended stores included. Applicants who were never approved are still
// role 'customer' and use the customer flow (/privacy/deletion-request); the
// partner app picks the endpoint by role.
//
// See lib/staffAccountDeletion.ts for why a request is a support ticket.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { deletionBlocker, deletionMessage, deletionReason } from '../lib/partnerAccountDeletion.js';
import { uuid } from '../support/contracts.js';
import { createDeletionTicket, latestDeletionTicket } from '../support/staffDeletionTickets.js';

export const partnerAccountRouter = Router();
partnerAccountRouter.use(requireAuth, requireRole('store_owner'));

const ACTIVE_ORDER_STATUSES = ['placed', 'packed', 'out_for_delivery'];

partnerAccountRouter.get('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store').json(await latestDeletionTicket(req.user!.id, 'store_owner'));
  } catch (error) {
    next(error);
  }
});

partnerAccountRouter.post('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = uuid(req.body?.request_id);
    const reason = deletionReason(req.body?.reason);

    // An open request already exists: return it instead of a second ticket.
    const existing = await latestDeletionTicket(userId, 'store_owner');
    if (existing && existing.status !== 'resolved') return res.status(200).json(existing);

    // Only the store this user OWNS blocks or closes. A manager (store
    // membership) leaving must not close somebody else's shop; admin removes
    // their membership when processing the request.
    const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('owner_user_id', userId).maybeSingle();
    if (storeError) throw storeError;
    if (store) {
      const orders = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id).in('status', ACTIVE_ORDER_STATUSES);
      if (orders.error) throw orders.error;
      const blocker = deletionBlocker({ activeOrders: orders.count ?? 0 });
      if (blocker) throw blocker;
    }

    const ticketId = await createDeletionTicket(userId, requestId, deletionMessage(reason));

    // Stop new orders right away: an owner who asked to leave must not keep
    // receiving customers' orders while admin processes the request. This is
    // the partner's own open/closed switch (stores.is_active), not an admin
    // suspension, and closing is always allowed. Best effort: the ticket is
    // the record that matters.
    if (store) {
      const { error: closeError } = await supabase.from('stores').update({ is_active: false }).eq('id', store.id);
      if (closeError) console.warn('[partnerAccount] could not close store after deletion request', closeError.code);
    }

    res.status(202).json({ id: ticketId, status: 'open' });
  } catch (error) {
    next(error);
  }
});
