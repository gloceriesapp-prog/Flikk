// Emails a fresh 6-digit sign-in code to ADMIN_OTP_EMAIL. This is the entry
// point of the SOLE admin login — no prior session is required (and none
// exists yet). middleware.ts keeps /api/auth/otp/* public for exactly this.
// Throttled: 3 sends per minute for the one admin (claim_auth_budget,
// migration 082).

import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminUserId } from '@/lib/adminIdentity';
import { issueOtp, maskEmail, otpRecipient, OTP_TTL_MINUTES } from '@/lib/adminOtp';

const SENDS_PER_MINUTE = 3;

export async function POST() {
  let userId: string;
  let recipient: string;
  try {
    userId = adminUserId();
    recipient = otpRecipient();
  } catch {
    return NextResponse.json({ error: 'Admin sign-in is not configured.' }, { status: 503 });
  }

  const key = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').update(`admin-otp-send:${userId}`).digest('hex');
  const { data: wait, error: budgetError } = await supabaseAdmin.rpc('claim_auth_budget', {
    p_buckets: [{ key, limit: SENDS_PER_MINUTE }],
  });
  if (budgetError || typeof wait !== 'number') return NextResponse.json({ error: 'Please try again shortly.' }, { status: 503 });
  if (wait > 0) {
    return NextResponse.json({ error: `Too many codes requested. Wait ${wait}s.` }, { status: 429, headers: { 'Retry-After': String(wait) } });
  }

  try {
    await issueOtp(userId, recipient);
  } catch (err) {
    console.error('Admin OTP send failed', { message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Could not send the code. Check the Gmail SMTP settings.' }, { status: 502 });
  }
  return NextResponse.json({ sentTo: maskEmail(recipient), expiresInMinutes: OTP_TTL_MINUTES });
}
