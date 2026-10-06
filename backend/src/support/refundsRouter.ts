import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { pageOffset, uuid } from './contracts.js';
export const customerRefundsRouter = Router();
customerRefundsRouter.use(requireAuth, requireRole('customer'));
customerRefundsRouter.get('/', async (req: AuthedRequest, res, next) => {
    try {
        const offset = pageOffset(req.query.offset);
        const { data, error } = await supabase.from('customer_refund_history').select('*').eq('customer_id', req.user!.id).order('order_placed_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (error) {
        next(error);
    }
});
customerRefundsRouter.get('/:kind/:id', async (req: AuthedRequest, res, next) => {
    try {
        if (!['order', 'trip'].includes(req.params.kind as string))
            throw new AppError(400, 'INVALID_REFUND', 'Invalid refund.');
        const targetId = uuid(req.params.id);
        const { data: refund, error } = await supabase.from('customer_refund_history').select('*').eq('kind', req.params.kind).eq('target_id', targetId).eq('customer_id', req.user!.id).maybeSingle();
        if (error)
            throw error;
        if (!refund)
            throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found.');
        const offset = pageOffset(req.query.offset);
        const { data: updates, error: updatesError } = await supabase.from('customer_refund_updates').select('id,status,amount,reason,destination,created_at').eq('kind', req.params.kind).eq('target_id', targetId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (updatesError)
            throw updatesError;
        res.json({ refund, updates: updates ?? [] });
    }
    catch (error) {
        next(error);
    }
});
