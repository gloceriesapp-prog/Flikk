// Shared across all 4 apps. Source: specs/00-foundation/auth-and-roles.md
import { Router } from 'express';
import { supabase, supabaseAuth } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/otp/request', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) throw new AppError(400, 'INVALID_PHONE', 'phone is required.');
    const { error } = await supabaseAuth.auth.signInWithOtp({ phone });
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
    const { data, error } = await supabaseAuth.auth.verifyOtp({ phone, token: code, type: 'sms' });
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
    // A real `stores` row only ever exists post-approval now (see
    // storeOnboarding.ts's own note) — a returning applicant with no store
    // yet still needs to know "you already submitted, don't restart the
    // wizard" vs. "you never finished it," which has_store alone can't
    // tell apart anymore.
    const { data: draft } = await supabase
      .from('store_onboarding_drafts')
      .select('submitted_at')
      .eq('user_id', userId)
      .maybeSingle();

    res.status(200).json({
      access_token: data.session.access_token,
      // Supabase's own access tokens are short-lived (1hr default) — see
      // POST /refresh below. Without shipping this too, every session
      // would silently die the moment its access token expired: the next
      // authenticated call 401s, and every app's own RootNavigator (its
      // "a real 401 means log out" effect) reads that as a genuinely
      // invalid session and clears it, even though the person never asked
      // to log out. That's the exact "logs out on its own" bug this fixes.
      refresh_token: data.session.refresh_token,
      is_approved: userRow?.is_approved ?? false,
      has_store: (count ?? 0) > 0,
      application_submitted: !!draft?.submitted_at,
    });
  } catch (err) {
    next(err);
  }
});

// Exchanges a still-valid refresh token for a new access/refresh pair —
// called by an app's own api client the moment any authenticated request
// comes back 401 (see @flikk/shared's createApiClient own `refresh`
// option), transparently, before ever treating that 401 as a real
// logged-out session. No requireAuth — the refresh token itself is the
// credential here, there's no access token left to check by the time this
// is needed.
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) throw new AppError(400, 'MISSING_REFRESH_TOKEN', 'refresh_token is required.');

    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });
    if (error || !data.session) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session could not be refreshed.');

    res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
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
      .select('phone, name, birthday')
      .eq('id', req.user!.id)
      .single();
    if (userError) throw userError;

    const { data: draft } = await supabase
      .from('store_onboarding_drafts')
      .select('submitted_at')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    res.json({
      is_approved: req.user!.isApproved,
      has_store: (count ?? 0) > 0,
      application_submitted: !!draft?.submitted_at,
      phone: user.phone,
      name: user.name,
      birthday: user.birthday,
    });
  } catch (err) {
    next(err);
  }
});

// Customer-self-update — name and/or birthday (Profile screen's own
// account-details card: Name row, Date of birth row — phone is never
// editable here, it's the verified OTP identity, not a free-text field).
// Same partial-patch style as partner.ts's own PATCH /store: only fields
// present in the body get touched, everything else on the row is left
// alone.
authRouter.patch('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { name, birthday } = req.body as { name?: string; birthday?: string };
    if (birthday !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      throw new AppError(400, 'INVALID_BIRTHDAY', 'birthday must be YYYY-MM-DD.');
    }
    if (name !== undefined && !name.trim()) {
      throw new AppError(400, 'INVALID_NAME', 'name cannot be empty.');
    }

    const patch: Record<string, unknown> = {};
    if (birthday !== undefined) patch.birthday = birthday;
    if (name !== undefined) patch.name = name.trim();

    const { data, error } = await supabase.from('users').update(patch).eq('id', req.user!.id).select('name, birthday').single();
    if (error) throw error;

    res.json({ name: data.name, birthday: data.birthday });
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
