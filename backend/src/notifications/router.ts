import { getPromotionalPreferences, savePromotionalPreferences } from './preferences.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { uuid } from '../support/contracts.js';
import { notificationCursor } from './contracts.js';
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth, requireRole('customer'));
notificationsRouter.get('/preferences', getPromotionalPreferences);
notificationsRouter.patch('/preferences', savePromotionalPreferences);
notificationsRouter.get('/installation-id', (_req, res) => res.json({ id: randomUUID() }));
notificationsRouter.post('/devices', async (req: AuthedRequest, res, next) => {
    try {
        const { installation_id, token, revision } = req.body;
        if (typeof token !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token) || !Number.isSafeInteger(revision) || revision <= 0)
            throw new AppError(400, 'INVALID_DEVICE', 'Invalid notification registration.');
        const { error } = await supabase.rpc('register_customer_push_device', { p_customer_id: req.user!.id, p_installation_id: uuid(installation_id), p_token: token, p_revision: revision });
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
notificationsRouter.delete('/devices/:id', async (req: AuthedRequest, res, next) => {
    try {
        // Retain revision tombstone: a delayed old registration cannot reclaim a logged-out device.
        const revision = Number(req.query.revision);
        if (!Number.isSafeInteger(revision) || revision <= 0)
            throw new AppError(400, 'INVALID_REVISION', 'Invalid device revision.');
        const { error } = await supabase.from('customer_push_devices').update({ token: `disabled:${uuid(req.params.id)}`, revision })
            .eq('installation_id', req.params.id).eq('customer_id', req.user!.id).lt('revision', revision);
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
notificationsRouter.get('/', async (req: AuthedRequest, res, next) => {
    try {
        let query = supabase.from('customer_notifications').select('id,order_id,trip_id,title,body,created_at,read_at').eq('customer_id', req.user!.id);
        const cursor = notificationCursor(req.query.before);
        if (cursor) {
            const { id, created_at: time } = cursor;
            query = query.or(`created_at.lt.${time},and(created_at.eq.${time},id.lt.${id})`);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(26);
        if (error)
            throw error;
        const items = (data ?? []).slice(0, 25);
        const last = items.at(-1);
        res.json({ items, next_cursor: data && data.length > 25 && last ? Buffer.from(JSON.stringify({ id: last.id, created_at: last.created_at })).toString('base64url') : null });
    }
    catch (error) {
        next(error);
    }
});
notificationsRouter.patch('/:id/read', async (req: AuthedRequest, res, next) => {
    try {
        const { data, error } = await supabase.from('customer_notifications').update({ read_at: new Date().toISOString() }).eq('id', uuid(req.params.id)).eq('customer_id', req.user!.id).select('id');
        if (error)
            throw error;
        if (!data?.length)
            throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
