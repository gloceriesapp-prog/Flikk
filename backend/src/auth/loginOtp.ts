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
// Pending codes live in this process (hashed, 10 minutes, 5 wrong tries). The API
// runs as one replica; a restart or deploy just means "send the code again".
// Delivery OTPs at the doorstep are separate (lib/deliveryOtp.ts).
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { supabase, supabaseAuth } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { msg91Config, sendOtpSms, SmsDeliveryError } from '../lib/msg91.js';
import { phoneVariants } from '../lib/phone.js';

export const CODE_TTL_MINUTES = 10;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_PENDING = 10_000;
const pepper = randomBytes(32);

interface Pending { hash: Buffer; expiresAt: number; attempts: number }
const pending = new Map<string, Pending>();

const hashCode = (phone: string, code: string) => createHmac('sha256', pepper).update(`${phone}:${code}`).digest();
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

function prune(now: number) {
  for (const [phone, entry] of pending) if (entry.expiresAt <= now) pending.delete(phone);
  while (pending.size >= MAX_PENDING) pending.delete(pending.keys().next().value as string);
}

/** Sends a fresh login code to `phone` (canonical +91XXXXXXXXXX). */
export async function requestLoginOtp(phone: string, now = Date.now()): Promise<void> {
  if (testOtps().has(phone)) return;
  prune(now);
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
  pending.set(phone, { hash: hashCode(phone, code), expiresAt: now + CODE_TTL_MS, attempts: 0 });
}

/**
 * Checks `code` against the live code for `phone`. A wrong code counts as a
 * try (5 tries, then a new code is needed); a right one is NOT used up here,
 * only by consumeLoginOtp() once the session exists, so a sign-in failure
 * after a correct code can be retried with the same code.
 */
export function checkLoginOtp(phone: string, code: string, now = Date.now()): boolean {
  const testCode = testOtps().get(phone);
  if (testCode !== undefined) return code === testCode;
  const entry = pending.get(phone);
  if (!entry || entry.expiresAt <= now) { pending.delete(phone); return false; }
  if (timingSafeEqual(entry.hash, hashCode(phone, code))) return true;
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) pending.delete(phone);
  return false;
}

/** Called after a successful sign-in: the code cannot be used again. */
export function consumeLoginOtp(phone: string) { pending.delete(phone); }

const authDigits = (phone: string) => phone.replace(/\D/g, '');

// Existing account first (public.users has every signed-in phone), then
// create, then, for a phone that exists only in auth (an older unfinished
// sign-in), search auth users.
async function findOrCreateAuthUser(phone: string): Promise<string> {
  const { data: row } = await supabase.from('users').select('id').in('phone', phoneVariants(phone)).limit(1).maybeSingle();
  if (row?.id) return row.id as string;
  const created = await supabase.auth.admin.createUser({ phone, phone_confirm: true });
  if (created.data.user) return created.data.user.id;
  const existing = await findAuthUserByPhone(phone);
  if (existing) return existing;
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
  return new AppError(500, 'SIGN_IN_FAILED', 'We couldn’t sign you in. Please try again.');
};

// Gives the auth user this phone (confirmed) and a fresh random password.
async function preparePassword(userId: string, phone: string, password: string) {
  let updated = await supabase.auth.admin.updateUserById(userId, { phone, password, phone_confirm: true });
  // A public.users row whose auth user is gone (e.g. local seed data or a
  // reset auth schema): recreate the auth user under the same id.
  if (updated.error?.status === 404) {
    const created = await supabase.auth.admin.createUser({ id: userId, phone, phone_confirm: true, password });
    updated = { data: { user: created.data.user }, error: created.error } as typeof updated;
  }
  return updated.error;
}

/**
 * Issues a normal Supabase session for a phone whose OTP was just verified:
 * a confirmed auth user plus a single-use random password, exchanged at once
 * for a session. Banned users get Supabase's user_banned error back.
 *
 * Supabase finds a password sign-in by the auth user's phone, so the user
 * that gets the password must be the one holding this phone in auth. When
 * public.users points elsewhere (an old or duplicate row), the auth user
 * found by phone wins.
 */
export async function sessionForVerifiedPhone(phone: string) {
  // Upper, lower, digit and symbol, whatever password policy the project has.
  const password = `${randomBytes(32).toString('base64url')}Aa1!`;
  let userId = await findOrCreateAuthUser(phone);
  let error = await preparePassword(userId, phone, password);
  if (error) {
    // Usually another auth user already holds this phone (Supabase answers
    // phone_exists or a plain 500 "Error updating user"): sign in as that one.
    const owner = await findAuthUserByPhone(phone);
    if (owner && owner !== userId) {
      userId = owner;
      error = await preparePassword(userId, phone, password);
    }
  }
  if (error) throw failure('set one-time password', error);
  const result = await supabaseAuth.auth.signInWithPassword({ phone, password });
  if (result.error && result.error.code !== 'user_banned') throw failure('password sign-in', result.error);
  return result;
}

export function resetLoginOtpsForTests() { pending.clear(); }
