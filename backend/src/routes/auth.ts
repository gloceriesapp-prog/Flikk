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

// Partner web dashboard's own pre-flight gate, called before POST
// /otp/request — signInWithOtp above auto-creates a brand-new Supabase auth
// user (and sends a real SMS) for ANY phone, registered or not, so the
// dashboard's login can't tell "not a partner" apart from "partner, wrong
// step" by waiting until after an OTP round-trip. This checks the phone
// against public.users directly (no auth — there's no session yet) and
// only lets the caller move on to the real OTP send once it's confirmed to
// belong to an applied-or-approved store owner. "Registered" here means
// the same thing apps/partner's own onboarding treats as real: role
// already flipped to store_owner (approved), or a submitted application
// still pending review — an abandoned, never-submitted draft doesn't
// count, same as it doesn't unlock anything in the mobile app either.
authRouter.post('/otp/partner-check', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) throw new AppError(400, 'INVALID_PHONE', 'phone is required.');

    const NOT_REGISTERED = new AppError(
      404,
      'PARTNER_NOT_REGISTERED',
      "This number isn't registered on the Gloceries Partner app yet. Download the Partner app and apply with your store to get access here.",
    );

    const { data: user } = await supabase.from('users').select('id, role').eq('phone', phone).maybeSingle();
    if (!user) throw NOT_REGISTERED;
    if (user.role === 'store_owner') {
      res.status(200).json({ registered: true });
      return;
    }

    const { data: draft } = await supabase
      .from('store_onboarding_drafts')
      .select('submitted_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!draft?.submitted_at) throw NOT_REGISTERED;

    res.status(200).json({ registered: true });
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
    let { data: userRow } = await supabase.from('users').select('is_approved, role').eq('id', userId).single();
    if (!userRow) {
      const { data: created } = await supabase
        .from('users')
        .insert({ id: userId, phone, role: 'customer' })
        .select('is_approved, role')
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
      // One phone number, one role — real across all 4 apps since they
      // share this one users table (specs/00-foundation/auth-and-roles.md).
      // Every app's own OTP screen uses this to reject a number that's
      // already committed to a DIFFERENT role with a clear, honest message
      // instead of letting it into a broken half-working session — see
      // each app's own isRoleAllowedForThisApp check next to its
      // handleVerify. Never mutated here: role only ever changes via a
      // real admin approval (apps/admin's own approve routes), same as
      // before this field was ever surfaced.
      role: userRow?.role ?? 'customer',
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
      .select('phone, name, birthday, is_rejected, created_at')
      .eq('id', req.user!.id)
      .single();
    if (userError) throw userError;

    const { data: draft } = await supabase
      .from('store_onboarding_drafts')
      .select('submitted_at, rejection_reason')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    // Rider onboarding now follows the exact same real pattern store
    // onboarding does (migrations/042_rider_onboarding.sql's own note) —
    // role only ever flips to 'rider' at admin approval, so
    // has_rider_profile/rider_application_submitted are the same real
    // "applied but not yet a real riders row" signal has_store/
    // application_submitted already are for stores.
    const [{ count: riderCount }, { data: riderDraft }, { data: riderPayout }] = await Promise.all([
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id),
      supabase.from('rider_onboarding_drafts').select('submitted_at, rejection_reason').eq('user_id', req.user!.id).maybeSingle(),
      // Post-approval payout gate — apps/rider's RootNavigator drops a
      // just-approved rider onto BankDetailsScreen (the "You're approved!
      // One last thing" step) until this is set, then straight to Home. A
      // row only exists at all once approved, so a null here for a real
      // rider means "approved but hasn't added bank details yet".
      supabase.from('riders').select('payout_bank_account_number').eq('user_id', req.user!.id).maybeSingle(),
    ]);

    // A user only ever has one real application in flight (store OR
    // rider — the one-phone-one-role rule), so whichever draft actually
    // has a submission is the one whose rejection state is real.
    const activeDraft = draft?.submitted_at ? draft : riderDraft?.submitted_at ? riderDraft : null;

    res.json({
      // Already resolved by requireAuth's own users.role lookup — no extra
      // query. apps/rider's own RootNavigator needs this alongside
      // is_approved: a rider account has no onboarding wizard the way a
      // store owner does, so "is this phone number even registered as a
      // rider yet" is a real, distinct state from "registered but pending
      // approval" that only this field can tell apart.
      role: req.user!.role,
      is_approved: req.user!.isApproved,
      has_store: (count ?? 0) > 0,
      application_submitted: !!draft?.submitted_at,
      has_rider_profile: (riderCount ?? 0) > 0,
      rider_application_submitted: !!riderDraft?.submitted_at,
      rider_payout_configured: !!riderPayout?.payout_bank_account_number,
      // Only a real, current rejection — a fresh resubmission's own PATCH
      // /store-draft (or /rider-draft) doesn't clear is_rejected on the
      // user row by itself, so this also requires a submitted application
      // still be on file; without that a rejected-then-resubmitted
      // applicant would keep seeing the old rejected state even after
      // fixing and resubmitting.
      is_rejected: !!user.is_rejected && !!activeDraft,
      rejection_reason: activeDraft?.rejection_reason ?? null,
      phone: user.phone,
      name: user.name,
      birthday: user.birthday,
      // Real users.created_at — PurchaseScreen's order-time filter builds
      // its year list (2024, 2023, ...) down to whichever year this
      // account actually started in, not a hardcoded lookback window.
      created_at: user.created_at,
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
