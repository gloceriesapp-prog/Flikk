// Rider account deletion requests: GET/POST /rider/account/deletion-request.
//
// Mounted ahead of riderRouter because that router requires an APPROVED and
// ACTIVE rider, while Play requires deletion to be available to every rider
// account: pending review and suspended riders included. Applicants who were
// never approved are still role 'customer' and use the customer flow
// (/privacy/deletion-request); the rider app picks the endpoint by role.
//
// See lib/riderAccountDeletion.ts for why a request is a support ticket.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { deletionBlocker, deletionMessage, deletionReason, isDeletionTicket, sumCash, DELETION_MARKER } from '../lib/riderAccountDeletion.js';
import { supportError, uuid } from '../support/contracts.js';

export const riderAccountRouter = Router();
riderAccountRouter.use(requireAuth, requireRole('rider'));

const ACTIVE_ORDER_STATUSES = ['placed', 'packed', 'out_for_delivery'];

async function latestDeletionTicket(userId: string) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, status, created_at, updated_at, initial_message')
    .eq('customer_id', userId)
    .eq('requester_role', 'rider')
    .eq('category', 'account')
    .like('initial_message', `${DELETION_MARKER}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isDeletionTicket(data.initial_message)) return null;
  return { id: data.id as string, status: data.status as string, created_at: data.created_at as string, updated_at: data.updated_at as string };
}

riderAccountRouter.get('/deletion-request', async (req: AuthedRequest, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store').json(await latestDeletionTicket(req.user!.id));
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
    const existing = await latestDeletionTicket(userId);
    if (existing && existing.status !== 'resolved') return res.status(200).json(existing);

    const [orders, cash] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('rider_id', userId).in('status', ACTIVE_ORDER_STATUSES),
      supabase.from('rider_cash_collections').select('amount').eq('rider_id', userId).is('settled_at', null),
    ]);
    if (orders.error) throw orders.error;
    if (cash.error) throw cash.error;
    const blocker = deletionBlocker({ activeOrders: orders.count ?? 0, outstandingCash: sumCash(cash.data ?? []) });
    if (blocker) throw blocker;

    const { data: ticketId, error } = await supabase.rpc('create_staff_support_ticket', {
      p_user_id: userId, p_request_id: requestId, p_order_id: null, p_category: 'account', p_message: deletionMessage(reason),
    });
    // support_active_issue allows one open ticket per category: an unrelated
    // open "My account" ticket blocks a second one. Say so plainly.
    if (error?.code === '23505') {
      throw new AppError(409, 'ACCOUNT_TICKET_OPEN', 'You already have an open "My account" support request. Ask for deletion there, or wait until it is resolved.');
    }
    if (error) throw supportError(error);

    // Stop dispatch right away; a rider who asked to leave must not keep
    // receiving offers while admin processes the request. Best effort: the
    // ticket is the record that matters.
    const { error: offlineError } = await supabase.from('riders').update({ status: 'offline' }).eq('user_id', userId);
    if (offlineError) console.warn('[riderAccount] could not set rider offline after deletion request', offlineError.code);

    res.status(202).json({ id: ticketId as string, status: 'open' });
  } catch (error) {
    next(error);
  }
});
