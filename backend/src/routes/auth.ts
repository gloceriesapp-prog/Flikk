// Shared across all 4 apps. Source: specs/00-foundation/auth-and-roles.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/otp/request', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) throw new AppError(400, 'INVALID_PHONE', 'phone is required.');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw new AppError(400, 'OTP_SEND_FAILED', error.message);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, code } = req.body as { phone?: string; code?: string };
    if (!phone || !code) throw new AppError(400, 'INVALID_OTP', 'phone and code are required.');
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error || !data.session) throw new AppError(401, 'OTP_INVALID', 'Invalid or expired code.');

    const userId = data.session.user.id;
    // Same lazy-provisioning as requireAuth (see that file's own note) —
    // verify is the very first authenticated call for a brand-new phone
    // number, so no public.users row exists yet either.
    let { data: userRow } = await supabase.from('users').select('is_approved').eq('id', userId).single();
    if (!userRow) {
      const { data: created } = await supabase
        .from('users')
        .insert({ id: userId, phone, role: 'customer' })
        .select('is_approved')
        .single();
      userRow = created;
    }
    const { count } = await supabase.from('stores').select('id', { count: 'exact', head: true }).eq('owner_user_id', userId);

    res.status(200).json({
      access_token: data.session.access_token,
      is_approved: userRow?.is_approved ?? false,
      has_store: (count ?? 0) > 0,
    });
  } catch (err) {
    next(err);
  }
});

// Polled by WaitingApprovalScreen and re-checked once after RootNavigator
// hydrates a persisted session (see that app's own notes) — has_store /
// is_approved aren't in the JWT, only derivable by asking the DB directly.
// phone/name ride along too — the customer app's own ProfileScreen needs
// them and they're already real columns on users, not fetched separately.
authRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { count, error } = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', req.user!.id);
    if (error) throw error;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('phone, name')
      .eq('id', req.user!.id)
      .single();
    if (userError) throw userError;

    res.json({
      is_approved: req.user!.isApproved,
      has_store: (count ?? 0) > 0,
      phone: user.phone,
      name: user.name,
    });
  } catch (err) {
    next(err);
  }
});

// Registers this session's Expo push token — called once after login (and
// again whenever Expo rotates the token) by every app, not just partner.
// requireAuth only, deliberately not requireApproved: a store owner still
// pending approval needs their token saved now so admin's approve action
// (apps/admin/src/app/api/approvals/*) can actually reach their phone the
// moment they're approved, not only after.
authRouter.post('/push-token', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) throw new AppError(400, 'MISSING_TOKEN', 'token is required.');

    const { error } = await supabase.from('users').update({ expo_push_token: token }).eq('id', req.user!.id);
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
