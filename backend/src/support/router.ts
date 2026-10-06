import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { ticketInput, uuid, message, pageOffset, supportError } from './contracts.js';
export const supportRouter = Router();
supportRouter.use(requireAuth, requireRole('customer'));
supportRouter.get('/request-id', (_req, res) => res.json({ id: randomUUID() }));
supportRouter.get('/orders', async (req: AuthedRequest, res, next) => {
    try {
        const offset = pageOffset(req.query.offset);
        const { data, error } = await supabase.from('orders').select('id,trip_id,order_number,status,placed_at,stores(name)').eq('customer_id', req.user!.id).order('placed_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (error) {
        next(error);
    }
});
supportRouter.get('/tickets', async (req: AuthedRequest, res, next) => {
    try {
        const offset = pageOffset(req.query.offset);
        const { data, error } = await supabase.from('support_tickets').select('*').eq('customer_id', req.user!.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (error) {
        next(error);
    }
});
supportRouter.post('/tickets', async (req: AuthedRequest, res, next) => {
    try {
        const input = ticketInput(req.body);
        const { data, error } = await supabase.rpc('create_customer_ticket', { ...input, p_customer_id: req.user!.id });
        if (error)
            throw supportError(error);
        res.status(201).json({ id: data });
    }
    catch (error) {
        next(error);
    }
});
supportRouter.get('/tickets/:id', async (req: AuthedRequest, res, next) => {
    try {
        const { data: ticket, error } = await supabase.from('support_tickets').select('*').eq('id', uuid(req.params.id)).eq('customer_id', req.user!.id).maybeSingle();
        if (error)
            throw error;
        if (!ticket)
            throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
        const offset = pageOffset(req.query.offset);
        const { data: messages, error: threadError } = await supabase.from('support_messages').select('id,actor_role,body,status_after,created_at').eq('ticket_id', ticket.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (threadError)
            throw threadError;
        res.json({ ticket, messages: messages ?? [] });
    }
    catch (error) {
        next(error);
    }
});
supportRouter.post('/tickets/:id/messages', async (req: AuthedRequest, res, next) => {
    try {
        const { data, error } = await supabase.rpc('reply_support_ticket', { p_ticket_id: uuid(req.params.id), p_actor_id: req.user!.id, p_request_id: uuid(req.body.request_id), p_body: message(req.body.message) });
        if (error)
            throw supportError(error);
        res.status(201).json({ id: data });
    }
    catch (error) {
        next(error);
    }
});
