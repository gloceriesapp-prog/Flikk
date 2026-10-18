import { resolveStoreAccess } from '../stores/access.js';
import { authBudget } from '../customer-experience/authBudget.js';
// Shared across all 4 apps. Source: specs/00-foundation/auth-and-roles.md
import { Router } from 'express';
import { supabase, supabaseAuth } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { normalizePhone, phoneVariants } from '../lib/phone.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { partnerSuspension } from '../auth/partnerSuspension.js';
import { CODE_TTL_MINUTES, checkLoginOtp, consumeLoginOtp, isPhoneBanned, requestLoginOtp, sessionForVerifiedPhone, testOtps } from '../auth/loginOtp.js';

export const authRouter = Router();

// One phone number, one app. Each app sends `app` on /otp/request + /otp/verify;
// account_type (migration 20261011000000) pins a number to the first app it
// signed in through and this rejects any later sign-in through a different app.
// role is NOT touched here — it still only flips at admin approval; account_type
// is the permanent identity, so a pending rider (role still 'customer') can no
// longer also sign into the customer/partner app. LOGIN_TEST_OTPS numbers skip
// the pin so one number can test every app; admin can change account_type.
type AppKind = 'customer' | 'rider' | 'partner' | 'partner_web';
type AccountType = 'customer' | 'rider' | 'store_owner';
const APP_TO_ACCOUNT_TYPE: Record<AppKind, AccountType> = { customer: 'customer', rider: 'rider', partner: 'store_owner', partner_web: 'store_owner' };
const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { customer: 'Customer', rider: 'Rider', store_owner: 'Partner' };
const wantedAccountType = (app: unknown): AccountType | undefined =>
  typeof app === 'string' && app in APP_TO_ACCOUNT_TYPE ? APP_TO_ACCOUNT_TYPE[app as AppKind] : undefined;
const wrongAppError = (registered: AccountType) =>
  new AppError(403, 'ACCOUNT_WRONG_APP',
    `This number is registered as a Gloceries ${ACCOUNT_TYPE_LABEL[registered]} account. Please use the ${ACCOUNT_TYPE_LABEL[registered]} app, or sign in with a different number.`);

// Reads the pinned account_type of an existing number (null if the number has
// never signed in). Exempts LOGIN_TEST_OTPS numbers from the pin entirely.
async function pinnedAccountType(canonical: string): Promise<AccountType | null> {
  const { data } = await supabase.from('users').select('account_type').in('phone', phoneVariants(canonical)).limit(1).maybeSingle();
  return (data?.account_type as AccountType | undefined) ?? null;
}

// The partner web dashboard (app 'partner_web') is for existing partners only:
// no SMS is sent and no session is minted unless the number already belongs
// to a user whose role is store_owner (set at admin approval). Applying and
// waiting for approval happen in the partner mobile app, not here.
async function isRegisteredPartner(canonical: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .in('phone', phoneVariants(canonical))
    .eq('role', 'store_owner')
    .limit(1)
    .maybeSingle();
  return !!data;
}
const partnerNotRegistered = () =>
  new AppError(404, 'PARTNER_NOT_REGISTERED',
    "This number isn't registered as a Gloceries partner. Use the number your store was approved with, or apply in the Gloceries Partner app.");

// Supabase Auth refuses a banned user (admin customer Block → ban_duration)
// with code 'user_banned'. Say so plainly instead of "invalid code".
const isBanned = (error: unknown) => (error as { code?: string } | null)?.code === 'user_banned';
const accountBlocked = () => new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked. Contact Gloceries support.');

authRouter.post('/otp/request', authBudget('send'), async (req, res, next) => {
  try {
    const { phone, app } = req.body as { phone?: string; app?: string };
    const canonical = normalizePhone(phone); // +91… — throws on a bad number
    if (await isPhoneBanned(canonical)) throw accountBlocked();
    if (app === 'partner_web' && !(await isRegisteredPartner(canonical))) throw partnerNotRegistered();
    // Reject a cross-app number before spending an SMS. A brand-new number has
    // no pin yet and claims it at verify. Test numbers skip the pin.
    const want = wantedAccountType(app);
    if (want && !testOtps().has(canonical)) {
      const pinned = await pinnedAccountType(canonical);
      if (pinned && pinned !== want) throw wrongAppError(pinned);
    }
    // The backend sends and checks the code itself (auth/loginOtp.ts); a
    // failed send is logged there with MSG91's reason.
    await requestLoginOtp(canonical);
    res.status(200).json({ ok: true, expires_in_minutes: CODE_TTL_MINUTES });
  } catch (err) {
    next(err);
  }
});

// Same partner-only rule as /otp/request with app 'partner_web', without
// sending anything. This does tell a caller whether a number is a partner;
// authBudget('partner-check') rate-limits it.
authRouter.post('/otp/partner-check', authBudget('partner-check'), async (req, res, next) => {
  try {
    const canonical = normalizePhone((req.body as { phone?: string }).phone);
    if (!(await isRegisteredPartner(canonical))) throw partnerNotRegistered();
    res.json({ registered: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', authBudget('verify'), async (req, res, next) => {
  try {
    const { phone, code, app } = req.body as { phone?: string; code?: string; app?: string };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new AppError(400, 'INVALID_OTP', 'phone and code are required.');
    const canonical = normalizePhone(phone);
    if (!checkLoginOtp(canonical, code)) throw new AppError(401, 'OTP_INVALID', 'Invalid or expired code.');
    // Re-checked here so a session is never minted for a non-partner on the
    // dashboard, even if the role changed after the code was sent.
    if (app === 'partner_web' && !(await isRegisteredPartner(canonical))) throw partnerNotRegistered();

    // One phone, one app: reject a number pinned to a DIFFERENT app before we
    // mint a session for it. A brand-new number has no pin and claims it on
    // creation below. Test numbers are exempt (testOtps only consulted when an
    // app pin is actually requested).
    const want = wantedAccountType(app);
    if (want && !testOtps().has(canonical)) {
      const pinned = await pinnedAccountType(canonical);
      if (pinned && pinned !== want) throw wrongAppError(pinned);
    }

    const { data, error } = await sessionForVerifiedPhone(canonical);
    if (isBanned(error)) throw accountBlocked();
    if (error || !data.session) throw new AppError(500, 'SIGN_IN_FAILED', 'We couldn’t sign you in. Please try again.');
    // Only now is the code used up: a failed sign-in above leaves it valid.
    consumeLoginOtp(canonical);

    const userId = data.session.user.id;
    // Same lazy-provisioning as requireAuth (see that file's own note) —
    // verify is the very first authenticated call for a brand-new phone
    // number, so no public.users row exists yet either. A new row claims its
    // account_type pin from the app it signed in through (default customer).
    let { data: userRow } = await supabase.from('users').select('is_approved, role, account_type').eq('id', userId).single();
    if (!userRow) {
      const { data: created } = await supabase
        .from('users')
        .insert({ id: userId, phone: canonical, role: 'customer', account_type: want ?? 'customer' })
        .select('is_approved, role, account_type')
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
      has_store: (count ?? 0) > 0 || (userRow?.role === 'store_owner' && !!(await resolveStoreAccess(userId))),
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
      // The permanent one-app pin (migration 20261011000000). Each app also
      // checks this for a clean message, but the server reject above is
      // authoritative.
      account_type: userRow?.account_type ?? 'customer',
    });
  } catch (err) {
    next(err);
  }
});

// Exchanges a still-valid refresh token for a new access/refresh pair —
// called by an app's own api client the moment any authenticated request
// comes back 401 (see @gloceries/shared's createApiClient own `refresh`
// option), transparently, before ever treating that 401 as a real
// logged-out session. No requireAuth — the refresh token itself is the
// credential here, there's no access token left to check by the time this
// is needed.
authRouter.post('/refresh', authBudget('refresh'), async (req, res, next) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) throw new AppError(400, 'MISSING_REFRESH_TOKEN', 'refresh_token is required.');

    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });
    if (isBanned(error)) throw accountBlocked();
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
      // One last thing" step) until this is set, then straight to Home.
      // payout_method is set for EITHER destination (bank_account or upi),
      // so a null means "approved but hasn't added any payout method yet".
      supabase.from('riders').select('payout_method, is_active, suspended_reason').eq('user_id', req.user!.id).maybeSingle(),
    ]);

    // A user only ever has one real application in flight (store OR
    // rider — the one-phone-one-role rule), so whichever draft actually
    // has a submission is the one whose rejection state is real.
    const activeDraft = draft?.submitted_at ? draft : riderDraft?.submitted_at ? riderDraft : null;
    // Admin partner-account suspension (migration 114). The partner app and
    // dashboard show a blocking "account suspended" screen on this; every
    // partner API route refuses with 403 PARTNER_SUSPENDED meanwhile.
    const partner = req.user!.role === 'store_owner' ? await partnerSuspension(req.user!.id) : null;

    res.json({
      // Already resolved by requireAuth's own users.role lookup — no extra
      // query. apps/rider's own RootNavigator needs this alongside
      // is_approved: a rider account has no onboarding wizard the way a
      // store owner does, so "is this phone number even registered as a
      // rider yet" is a real, distinct state from "registered but pending
      // approval" that only this field can tell apart.
      role: req.user!.role,
      is_approved: req.user!.isApproved,
      has_store: (count ?? 0) > 0 || (req.user!.role === 'store_owner' && !!(await resolveStoreAccess(req.user!.id))),
      application_submitted: !!draft?.submitted_at,
      has_rider_profile: (riderCount ?? 0) > 0,
      rider_application_submitted: !!riderDraft?.submitted_at,
      rider_payout_configured: !!riderPayout?.payout_method,
      // Admin suspension (riders.is_active=false, admin Riders page). The
      // rider app shows a blocking "account suspended" screen on this.
      rider_suspended: riderPayout ? riderPayout.is_active === false : false,
      rider_suspended_reason: riderPayout?.is_active === false ? (riderPayout.suspended_reason ?? null) : null,
      partner_suspended: partner?.suspended === true,
      partner_suspended_reason: partner?.suspended ? partner.reason : null,
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
    if (req.user!.role === 'customer') throw new AppError(400, 'USE_DEVICE_REGISTRATION', 'Use account-owned notification device registration.');
    const { token } = req.body as { token?: string };
    if (!token) throw new AppError(400, 'MISSING_TOKEN', 'token is required.');

    // One device token belongs to one account. A shared phone (riders
    // swapping shifts, a family store phone) would otherwise keep pushing the
    // previous account's offers to whoever signs in next, even when that
    // account's logout never reached us (offline, app killed).
    const { error: releaseError } = await supabase.from('users').update({ expo_push_token: null })
      .eq('expo_push_token', token).neq('id', req.user!.id);
    if (releaseError) throw releaseError;
    const { error } = await supabase.from('users').update({ expo_push_token: token }).eq('id', req.user!.id);
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Sign-out: stop pushes to this device for this account. Idempotent.
authRouter.delete('/push-token', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.user!.role === 'customer') throw new AppError(400, 'USE_DEVICE_REGISTRATION', 'Use account-owned notification device registration.');
    const token = (req.body as { token?: unknown } | undefined)?.token;
    if (token !== undefined && (typeof token !== 'string' || !token || token.length > 512)) {
      throw new AppError(400, 'INVALID_TOKEN', 'Invalid notification token.');
    }
    // Older clients omit token. New clients only remove their own device,
    // preserving a replacement registered from another phone meanwhile.
    let removal = supabase.from('users').update({ expo_push_token: null }).eq('id', req.user!.id);
    if (typeof token === 'string') removal = removal.eq('expo_push_token', token);
    const { error } = await removal;
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
