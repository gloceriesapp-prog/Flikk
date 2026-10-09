// Supabase Auth "Send SMS" hook. signInWithOtp() (routes/auth.ts) makes
// Supabase generate the login code; with this hook enabled Supabase POSTs it
// here instead of using its built-in SMS provider, and we deliver it through
// MSG91. Verification, sessions and Supabase's own rate limits are unchanged.
//
// Dashboard: Authentication -> Hooks -> Send SMS hook -> HTTPS,
//   URL    https://<api host>/auth/hooks/send-sms
//   secret generated there; set the same value as SEND_SMS_HOOK_SECRET.
//
// Requests are signed per Standard Webhooks (webhook-id / webhook-timestamp /
// webhook-signature, HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`).
import crypto from 'node:crypto';
import express, { type RequestHandler } from 'express';
import { logger } from '../lib/logger.js';
import { sendOtpSms, SmsDeliveryError } from '../lib/msg91.js';

const TOLERANCE_SECONDS = 5 * 60;

// SEND_SMS_HOOK_SECRET may hold several `v1,whsec_<base64>` secrets joined by
// '|' so the dashboard secret can be rotated without downtime.
export function hookSecrets(raw = process.env.SEND_SMS_HOOK_SECRET): Buffer[] {
  return (raw ?? '').split('|').map((s) => s.trim().replace(/^v1,/, '').replace(/^whsec_/, ''))
    .filter(Boolean).map((s) => Buffer.from(s, 'base64')).filter((key) => key.length >= 16);
}

export function verifyHookSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secrets: Buffer[],
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const header = (name: string) => { const v = headers[name]; return Array.isArray(v) ? v[0] : v; };
  const id = header('webhook-id');
  const timestamp = header('webhook-timestamp');
  const signatures = header('webhook-signature');
  if (!secrets.length || !id || !timestamp || !signatures || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const provided = signatures.split(' ').filter((part) => part.startsWith('v1,'))
    .map((part) => Buffer.from(part.slice(3), 'base64')).filter((sig) => sig.length === 32);
  return secrets.some((key) => {
    const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();
    return provided.some((sig) => crypto.timingSafeEqual(sig, expected));
  });
}

const hookError = (status: number, message: string) => ({ status, body: { error: { http_code: status, message } } });

export async function handleSendSms(rawBody: string, headers: Record<string, string | string[] | undefined>, secrets = hookSecrets()) {
  if (!secrets.length) return hookError(503, 'Send SMS hook secret is not configured.');
  if (!verifyHookSignature(rawBody, headers, secrets)) return hookError(401, 'Invalid hook signature.');
  let payload: { user?: { id?: unknown; phone?: unknown }; sms?: { otp?: unknown } };
  try { payload = JSON.parse(rawBody); } catch { return hookError(400, 'Invalid hook payload.'); }
  const otp = payload.sms?.otp;
  if (typeof otp !== 'string') return hookError(400, 'Hook payload has no OTP.');
  try {
    const requestId = await sendOtpSms(payload.user?.phone, otp);
    // Never log the phone number or the code.
    logger.info({ userId: typeof payload.user?.id === 'string' ? payload.user.id : undefined, requestId }, 'Login OTP SMS accepted by MSG91');
    return { status: 200, body: {} };
  } catch (error) {
    const status = error instanceof SmsDeliveryError ? error.status : 502;
    const message = error instanceof SmsDeliveryError ? error.message : 'SMS delivery failed.';
    logger.warn({ userId: typeof payload.user?.id === 'string' ? payload.user.id : undefined, status, reason: message }, 'Login OTP SMS failed');
    return hookError(status, message);
  }
}

// Raw text body: the signature covers the exact bytes Supabase sent.
export const sendSmsHookRoute: RequestHandler[] = [
  express.text({ type: '*/*', limit: '64kb' }),
  async (req, res, next) => {
    try {
      if (req.method !== 'POST') { res.status(405).json({ error: { http_code: 405, message: 'Use POST.' } }); return; }
      const result = await handleSendSms(typeof req.body === 'string' ? req.body : '', req.headers);
      res.status(result.status).json(result.body);
    } catch (error) { next(error); }
  },
];
