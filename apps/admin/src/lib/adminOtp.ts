// Emailed 6-digit code — the SOLE admin sign-in factor (no Google/password
// step). Server-only (route handlers under app/api/auth/otp). Storage:
// admin_otp_challenges (backend/migrations/20261010110000_admin_otp_challenges.sql),
// service role only, holding just an HMAC of the code. Delivery: Gmail SMTP
// with an App Password (GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD).
// Recipient: ADMIN_OTP_EMAIL. The challenge is keyed by the one admin user
// id (lib/adminIdentity.ts), passed in as `userId` below.

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminEmail } from '@/lib/adminIdentity';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

function hashCode(userId: string, code: string): string {
  const secret = process.env.ADMIN_2FA_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_2FA_SECRET must be set (32+ characters).');
  return createHmac('sha256', secret).update(`admin-otp:${userId}:${code}`).digest('hex');
}

function mailer() {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  if (!user || !pass) throw new Error('Gmail SMTP is not configured.');
  return {
    from: user,
    transport: nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } }),
  };
}

// Always ADMIN_OTP_EMAIL — the one inbox the sign-in code goes to.
export function otpRecipient(): string {
  return adminEmail();
}

// Masked for the UI ("ni•••••09@gmail.com") — enough to know where to look.
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '•••';
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(3, name.length - 4))}${name.slice(-2)}@${domain}`;
}

// Replaces any earlier open code for this user, then emails the new one.
export async function issueOtp(userId: string, recipient: string): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const { error } = await supabaseAdmin.from('admin_otp_challenges').upsert({
    user_id: userId, code_hash: hashCode(userId, code), expires_at: expiresAt.toISOString(), attempts: 0, created_at: new Date().toISOString(),
  });
  if (error) throw new Error('Could not create a sign-in code.');

  const { from, transport } = mailer();
  await transport.sendMail({
    from: `Gloceries Admin <${from}>`,
    to: recipient,
    subject: `${code} is your Gloceries Admin sign-in code`,
    text: `Your Gloceries Admin sign-in code is ${code}.\n\nIt expires in ${OTP_TTL_MINUTES} minutes. If you didn't just try to sign in, someone is trying to reach the admin dashboard: rotate the admin credentials now.`,
  });
}

export type OtpResult = 'ok' | 'invalid' | 'expired' | 'locked' | 'missing';

export async function checkOtp(userId: string, code: string): Promise<OtpResult> {
  if (!/^\d{6}$/.test(code)) return 'invalid';
  const { data, error } = await supabaseAdmin.rpc('claim_admin_otp_attempt', { p_user: userId, p_max: OTP_MAX_ATTEMPTS });
  if (error) throw new Error('Could not check the code.');
  const challenge = (data as { code_hash: string; expires_at: string }[] | null)?.[0];
  if (!challenge) {
    // No attempt left to spend: either no code was sent, or it's used up.
    const { data: row } = await supabaseAdmin.from('admin_otp_challenges').select('user_id').eq('user_id', userId).maybeSingle();
    return row ? 'locked' : 'missing';
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) return 'expired';

  const expected = Buffer.from(challenge.code_hash, 'hex');
  const given = Buffer.from(hashCode(userId, code), 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid';
  // Single use: a correct code can never be replayed.
  await supabaseAdmin.from('admin_otp_challenges').delete().eq('user_id', userId);
  return 'ok';
}
