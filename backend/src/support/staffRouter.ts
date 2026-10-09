// Rider and store-partner support tickets (migration 118). Same ticket and
// message tables as customer support (router.ts), tagged with the
// requester's role; the admin Support inbox answers all three. The role comes
// from users.role server-side (requireRole), and every read is scoped to the
// caller's own tickets raised in that role. Not gated on approval: a pending
// applicant must be able to ask for help too.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { staffTicketInput, uuid, message, pageOffset, supportError } from './contracts.js';

export const staffSupportRouter = Router();
staffSupportRouter.use(requireAuth, requireRole('rider', 'store_owner'));

staffSupportRouter.get('/request-id', (_req, res) => res.json({ id: randomUUID() }));

// Recent orders the caller can link a ticket to: a rider's own deliveries,
// or the orders of the owner's store.
staffSupportRouter.get('/orders', async (req: AuthedRequest, res, next) => {
  try {
    const offset = pageOffset(req.query.offset);
    let storeId: string | null = null;
    if (req.user!.role === 'store_owner') {
      const { data: store, error } = await supabase.from('stores').select('id').eq('owner_user_id', req.user!.id).maybeSingle();
      if (error) throw error;
      if (!store) return res.json([]);
      storeId = store.id as string;
    }
    let query = supabase.from('orders').select('id,order_number,status,placed_at,stores(name)');
    query = storeId ? query.eq('store_id', storeId) : query.eq('rider_id', req.user!.id);
    const { data, error } = await query.order('placed_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

staffSupportRouter.get('/tickets', async (req: AuthedRequest, res, next) => {
  try {
    const offset = pageOffset(req.query.offset);
    const { data, error } = await supabase.from('support_tickets').select('*')
      .eq('customer_id', req.user!.id).eq('requester_role', req.user!.role)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

staffSupportRouter.post('/tickets', async (req: AuthedRequest, res, next) => {
  try {
    const input = staffTicketInput(req.body ?? {});
    const { data, error } = await supabase.rpc('create_staff_support_ticket', { ...input, p_user_id: req.user!.id });
    if (error) throw supportError(error);
    res.status(201).json({ id: data });
  } catch (error) {
    next(error);
  }
});

staffSupportRouter.get('/tickets/:id', async (req: AuthedRequest, res, next) => {
  try {
    const { data: ticket, error } = await supabase.from('support_tickets').select('*')
      .eq('id', uuid(req.params.id)).eq('customer_id', req.user!.id).eq('requester_role', req.user!.role).maybeSingle();
    if (error) throw error;
    if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
    const offset = pageOffset(req.query.offset);
    const { data: messages, error: threadError } = await supabase.from('support_messages').select('id,actor_role,body,status_after,created_at')
      .eq('ticket_id', ticket.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
    if (threadError) throw threadError;
    res.json({ ticket, messages: messages ?? [] });
  } catch (error) {
    next(error);
  }
});

staffSupportRouter.post('/tickets/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.rpc('reply_support_ticket', {
      p_ticket_id: uuid(req.params.id), p_actor_id: req.user!.id, p_request_id: uuid(req.body?.request_id), p_body: message(req.body?.message),
    });
    if (error) throw supportError(error);
    res.status(201).json({ id: data });
  } catch (error) {
    next(error);
  }
});
