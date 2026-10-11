// The admin dashboard session — the SOLE proof of login, set only after the
// emailed OTP (lib/adminOtp.ts) is verified. middleware.ts refuses every page
// and API call without a valid one.
//
// Cookie value = `admin.${iat}.${exp}.${hmac}` (payload = {admin:true, iat,
// exp}, flattened):
//  - HMAC-SHA256 over `admin.${iat}.${exp}` with ADMIN_2FA_SECRET
//    (server-only), so it can't be forged or tampered with;
//  - expiring (ADMIN_SESSION_TTL_SECONDS), so a stolen cookie dies and the
//    OTP is asked for again.
// There is no Supabase session to bind to anymore — the signature + expiry
// ARE the session. Web Crypto only (no node:crypto) — this runs in middleware
// (Edge runtime) too.

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

// Marks the payload as an admin session (the {admin:true} flag, flattened
// into the signed string). Only this exact prefix is accepted.
const ADMIN_PREFIX = 'admin';

const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.ADMIN_2FA_SECRET;
  // Fail closed: without a strong secret nobody passes sign-in.
  if (!value || value.length < 32) throw new Error('ADMIN_2FA_SECRET must be set (32+ characters).');
  return value;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminSessionCookie(now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const exp = iat + ADMIN_SESSION_TTL_SECONDS;
  const payload = `${ADMIN_PREFIX}.${iat}.${exp}`;
  return `${payload}.${await sign(payload)}`;
}

export async function isValidAdminSessionCookie(value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  const [prefix, iat, exp, signature] = parts;
  if (prefix !== ADMIN_PREFIX) return false;
  if (!/^\d+$/.test(iat) || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 <= now) return false;
  try {
    return sameString(signature, await sign(`${prefix}.${iat}.${exp}`));
  } catch {
    return false;
  }
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ADMIN_SESSION_TTL_SECONDS,
};
