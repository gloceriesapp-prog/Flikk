// Login OTP for the customer, partner and rider apps, owned by the backend.
//
// The backend generates the code, sends it through MSG91 (lib/msg91.ts, the
// same call `pnpm sms:test` uses) and checks it. Supabase is only asked for
// the session at the end. Earlier, Supabase generated and sent the code
// through its Send SMS hook, which only worked when the hook was enabled in
// the right project, could reach this backend (impossible for a hosted
// project and a laptop) and shared its secret; any of those failing showed
// up as "We couldn't send a code" with nothing in this backend's logs.
//
// Pending codes live in Postgres (public.login_otps: hashed, 10 minutes, 5
// wrong tries, migration 20261030100000), so any API replica can check a code
// another one sent, and deploys don't wipe codes people are typing in.
// Delivery OTPs at the doorstep are separate (lib/deliveryOtp.ts).
import { createHmac, randomBytes, randomInt } from 'node:crypto';
import { supabase, supabaseAuth } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { msg91Config, sendOtpSms, SmsDeliveryError } from '../lib/msg91.js';
import { phoneVariants } from '../lib/phone.js';

export const CODE_TTL_MINUTES = 10;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60_000;
const MAX_ATTEMPTS = 5;

// Every replica must hash the same code the same way, so the pepper comes from
// a server-only secret they all share (never stored next to the hashes).
// LOGIN_OTP_PEPPER overrides it; tests/local without either get a random one.
let pepper: Buffer | undefined;
function otpPepper(): Buffer {
  const secret = process.env.LOGIN_OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY;
  pepper ??= secret ? createHmac('sha256', secret).update('gloceries-login-otp-v1').digest() : randomBytes(32);
  return pepper;
}
const hashCode = (phone: string, code: string) => createHmac('sha256', otpPepper()).update(`${phone}:${code}`).digest('hex');
const isProduction = () => process.env.NODE_ENV === 'production';
const maskPhone = (phone: string) => `${phone.slice(0, 5)}*****${phone.slice(-2)}`;

// "919100000001=123456,919100000002=123456". Local development gets the same
// test numbers as supabase/config.toml; production only has the ones set in
// LOGIN_TEST_OTPS (e.g. the Google Play reviewer's login). They never get SMS.
export function testOtps(raw = process.env.LOGIN_TEST_OTPS): Map<string, string> {
  const source = raw ?? (isProduction() ? '' : '919100000001=123456,919100000002=123456,919100000003=123456');
  const map = new Map<string, string>();
  for (const entry of source.split(',')) {
    const [number, code] = entry.split('=').map((part) => part?.trim());
    const digits = number?.replace(/\D/g, '') ?? '';
    const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (local.length === 10 && code && /^\d{6}$/.test(code)) map.set(`+91${local}`, code);
  }
  return map;
}

const storeUnavailable = (step: string, error: { message?: string } | null) => {
  logger.error({ step, reason: error?.message?.slice(0, 200) }, 'Login OTP store unavailable');
  return new AppError(503, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please try again in a moment.');
};

/** Sends a fresh login code to `phone` (canonical +91XXXXXXXXXX). */
export async function requestLoginOtp(phone: string, now = Date.now()): Promise<void> {
  if (testOtps().has(phone)) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const config = msg91Config();
  if (!config.authKey || !config.templateId) {
    if (isProduction()) {
      logger.error('Login OTP cannot be sent: MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID (or MSG91_SMS_TEMPLATE_ID) are not set');
      throw new AppError(503, 'OTP_SEND_FAILED', 'We couldn’t send a code. Please try again shortly.');
    }
    // Local development without MSG91 keys: the code is printed here instead.
    logger.warn(`DEV ONLY (no MSG91 keys): login code for ${maskPhone(phone)} is ${code}`);
  } else {
    try {
      const requestId = await sendOtpSms(phone, code, config);
      logger.info({ requestId, to: maskPhone(phone) }, 'Login OTP SMS accepted by MSG91');
    } catch (error) {
      logger.warn({
        to: maskPhone(phone),
        status: error instanceof SmsDeliveryError ? error.status : undefined,
        reason: error instanceof SmsDeliveryError ? error.message : 'Unexpected error',
      }, 'Login OTP SMS failed');
      throw new AppError(502, 'OTP_SEND_FAILED', 'We couldn’t send a code. Please try again shortly.');
    }
  }
  // Replaces any earlier code for this phone: only the latest one works.
  const { error } = await supabase.from('login_otps').upsert({
    phone, code_hash: hashCode(phone, code), expires_at: new Date(now + CODE_TTL_MS).toISOString(), attempts: 0,
  });
  if (error) throw storeUnavailable('save code', error);
  // Housekeeping: expired codes are useless; best effort, never blocks login.
  void supabase.from('login_otps').delete().lt('expires_at', new Date(now).toISOString())
    .then(({ error: pruneError }) => { if (pruneError) logger.warn({ reason: pruneError.message }, 'Login OTP prune failed'); });
}

/**
 * Checks `code` against the live code for `phone`. A wrong code counts as a
 * try (5 tries, then a new code is needed); a right one is NOT used up here,
 * only by consumeLoginOtp() once the session exists, so a sign-in failure
 * after a correct code can be retried with the same code.
 */
export async function checkLoginOtp(phone: string, code: string, now = Date.now()): Promise<boolean> {
  const testCode = testOtps().get(phone);
  if (testCode !== undefined) return code === testCode;
  // One atomic row-locked check in the database (attempt counting included).
  const { data, error } = await supabase.rpc('check_login_otp', {
    p_phone: phone, p_code_hash: hashCode(phone, code), p_now: new Date(now).toISOString(), p_max_attempts: MAX_ATTEMPTS,
  });
  if (error) throw storeUnavailable('check code', error);
  return data === true;
}

/** Called after a successful sign-in: the code cannot be used again. */
export async function consumeLoginOtp(phone: string): Promise<void> {
  const { error } = await supabase.from('login_otps').delete().eq('phone', phone);
  // The session already exists; a leftover row just expires in 10 minutes.
  if (error) logger.warn({ reason: error.message }, 'Login OTP consume failed');
}

const authDigits = (phone: string) => phone.replace(/\D/g, '');

// A Supabase/GoTrue call that fails because the service is UNREACHABLE (local
// stack down, network blip, bad gateway) must surface as a retryable 503 —
// not a generic "we couldn't sign you in", which hides a dead dependency
// behind what looks like an auth-logic failure.
type SupabaseErr = { code?: string; status?: number; message?: string } | null | undefined;
function isDependencyUnreachable(error: SupabaseErr): boolean {
  if (!error) return false;
  if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) return true;
  if ((error.code || '').toLowerCase() === 'unexpected_failure') return true;
  return /fetch failed|econnrefused|enotfound|network|socket hang ?up|etimedout|timeout/i.test(error.message || '');
}
const unavailable = () => new AppError(503, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please try again in a moment.');

// Existing account first (public.users has every signed-in phone), then
// create, then, for a phone that exists only in auth (an older unfinished
// sign-in), search auth users.
async function findOrCreateAuthUser(phone: string): Promise<string> {
  const { data: row, error: readError } = await supabase.from('users').select('id').in('phone', phoneVariants(phone)).limit(1).maybeSingle();
  if (row?.id) return row.id as string;
  if (isDependencyUnreachable(readError)) {
    logger.error({ reason: readError?.message?.slice(0, 200) }, 'Login: users lookup failed (Supabase unreachable)');
    throw unavailable();
  }
  const created = await supabase.auth.admin.createUser({ phone, phone_confirm: true });
  if (created.data.user) return created.data.user.id;
  const existing = await findAuthUserByPhone(phone);
  if (existing) return existing;
  if (isDependencyUnreachable(created.error)) {
    logger.error({ code: created.error?.code, reason: created.error?.message?.slice(0, 200) }, 'Login: auth createUser failed (Supabase unreachable)');
    throw unavailable();
  }
  logger.error({ code: created.error?.code, reason: created.error?.message?.slice(0, 200) }, 'Could not create or find the auth user for a verified phone');
  throw new AppError(500, 'SIGN_IN_FAILED', 'We couldn’t sign you in. Please try again.');
}

/** True when this phone's account is blocked (admin Block → ban_duration). */
export async function isPhoneBanned(phone: string): Promise<boolean> {
  const { data: row } = await supabase.from('users').select('id').in('phone', phoneVariants(phone)).limit(1).maybeSingle();
  if (!row?.id) return false;
  const { data } = await supabase.auth.admin.getUserById(row.id as string);
  const until = (data?.user as { banned_until?: string | null } | null)?.banned_until;
  return !!until && new Date(until).getTime() > Date.now();
}

async function findAuthUserByPhone(phone: string): Promise<string | undefined> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return undefined;
    const match = data.users.find((user) => user.phone && authDigits(user.phone) === authDigits(phone));
    if (match) return match.id;
    if (data.users.length < 1000) return undefined;
  }
  return undefined;
}

const failure = (where: string, error: { code?: string; status?: number; message?: string } | null | undefined) => {
  logger.error({ step: where, code: error?.code, status: error?.status, reason: error?.message?.slice(0, 200) }, 'Login: could not issue a session after a correct code');
  return isDependencyUnreachable(error) ? unavailable() : new AppError(500, 'SIGN_IN_FAILED', 'We couldn’t sign you in. Please try again.');
};

/**
 * The private sign-in address of a phone-login account, e.g.
 * login+919876543210@gloceries.com. Never shown or mailed (it is confirmed
 * by the admin API, so Supabase sends nothing); it only lets the backend use
 * Supabase's email + password sign-in, which works whether or not the
 * project's Phone provider is enabled. Admin accounts have real addresses.
 */
export const loginEmailFor = (phone: string) => `login+${authDigits(phone)}@gloceries.com`;
const isLoginEmail = (email: string | undefined | null) => !!email && /^login\+\d+@gloceries\.com$/i.test(email);

type Prepared = { error: { code?: string; status?: number; message?: string } | null; email?: string };

// Gives the auth user this phone and its login address (both confirmed) and
// a fresh random password. An account with its own email (an admin who signs
// in to the admin panel with email + password) is never touched: resetting
// its password would lock that person out of the admin panel.
async function preparePassword(userId: string, phone: string, password: string): Promise<Prepared> {
  const existing = await supabase.auth.admin.getUserById(userId);
  const user = existing.data?.user;
  if (user?.email && !isLoginEmail(user.email)) {
    return { error: { code: 'email_account', message: 'This number belongs to an account that signs in with email and password (admin). Use another number in the apps.' } };
  }
  const email = loginEmailFor(phone);
  const attributes = { phone, phone_confirm: true, email, email_confirm: true, password };
  if (!user) {
    // A public.users row whose auth user is gone (e.g. local seed data or a
    // reset auth schema): recreate the auth user under the same id.
    const created = await supabase.auth.admin.createUser({ id: userId, ...attributes });
    return { error: created.error, email };
  }
  const updated = await supabase.auth.admin.updateUserById(userId, attributes);
  return { error: updated.error, email };
}

/**
 * Issues a normal Supabase session for a phone whose OTP was just verified:
 * a confirmed auth user plus a single-use random password, exchanged at once
 * for a session. Banned users get Supabase's user_banned error back.
 *
 * The password goes to the auth user that holds this phone in Supabase Auth.
 * When public.users points elsewhere (an old or duplicate row), the auth
 * user found by phone wins. Sign-in uses the private login address, falling
 * back to the phone if the project's Email provider is switched off.
 */
export async function sessionForVerifiedPhone(phone: string) {
  // Upper, lower, digit and symbol, whatever password policy the project has.
  const password = `${randomBytes(32).toString('base64url')}Aa1!`;
  let userId = await findOrCreateAuthUser(phone);
  let prepared = await preparePassword(userId, phone, password);
  if (prepared.error && prepared.error.code !== 'email_account') {
    // Usually another auth user already holds this phone (Supabase answers
    // phone_exists or a plain 500 "Error updating user"): sign in as that one.
    const owner = await findAuthUserByPhone(phone);
    if (owner && owner !== userId) {
      userId = owner;
      prepared = await preparePassword(userId, phone, password);
    }
  }
  if (prepared.error?.code === 'email_account') {
    throw new AppError(409, 'ADMIN_ACCOUNT_NUMBER', 'This number belongs to an admin account. Use a different number to sign in to the app.');
  }
  if (prepared.error) throw failure('prepare one-time password', prepared.error);
  let result = await supabaseAuth.auth.signInWithPassword({ email: prepared.email!, password });
  if (result.error?.code === 'email_provider_disabled') {
    result = await supabaseAuth.auth.signInWithPassword({ phone, password });
  }
  if (result.error && result.error.code !== 'user_banned') throw failure('password sign-in', result.error);
  return result;
}

export function resetLoginOtpsForTests() { pepper = undefined; }
