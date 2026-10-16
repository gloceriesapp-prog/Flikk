// Rider account deletion requests: GET/POST /rider/account/deletion-request.
//
// Mounted ahead of riderRouter because that router requires an APPROVED and
// ACTIVE rider, while Play requires deletion to be available to every rider
// account: pending review and suspended riders included. Applicants who were
// never approved are still role 'customer' and use the customer flow
// (/privacy/deletion-request); the rider app picks the endpoint by role.
//
// See lib/staffAccountDeletion.ts for why a request is a support ticket.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { deletionBlocker, deletionMessage, deletionReason, sumCash } from '../lib/riderAccountDeletion.js';
import { uuid } from '../support/contracts.js';
import { createDeletionTicket, latestDeletionTicket } from '../support/staffDeletionTickets.js';

export const riderAccountRouter = Router();
riderAccountRouter.use(requireAuth, requireRole('rider'));

const ACTIVE_ORDER_STATUSES = ['placed', 'packed', 'out_for_delivery'];

riderAccountRouter.get('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store').json(await latestDeletionTicket(req.user!.id, 'rider'));
  } catch (error) {
    next(error);
  }
});

riderAccountRouter.post('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = uuid(req.body?.request_id);
    const reason = deletionReason(req.body?.reason);

    // An open request already exists: return it instead of a second ticket.
    const existing = await latestDeletionTicket(userId, 'rider');
    if (existing && existing.status !== 'resolved') return res.status(200).json(existing);

    const [orders, cash] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('rider_id', userId).in('status', ACTIVE_ORDER_STATUSES),
      supabase.from('rider_cash_collections').select('amount').eq('rider_id', userId).is('settled_at', null),
    ]);
    if (orders.error) throw orders.error;
    if (cash.error) throw cash.error;
    const blocker = deletionBlocker({ activeOrders: orders.count ?? 0, outstandingCash: sumCash(cash.data ?? []) });
    if (blocker) throw blocker;

    const ticketId = await createDeletionTicket(userId, requestId, deletionMessage(reason));

    // Stop dispatch right away; a rider who asked to leave must not keep
    // receiving offers while admin processes the request. Best effort: the
    // ticket is the record that matters.
    const { error: offlineError } = await supabase.from('riders').update({ status: 'offline' }).eq('user_id', userId);
    if (offlineError) console.warn('[riderAccount] could not set rider offline after deletion request', offlineError.code);

    res.status(202).json({ id: ticketId, status: 'open' });
  } catch (error) {
    next(error);
  }
});
