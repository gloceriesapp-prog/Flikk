// Server-only — key/secret never leave this process. Only
// app/api/balance/route.ts (a Route Handler, always server-side) should
// import this; never a 'use client' file, same rule as lib/supabase/admin.ts.
//
// RazorpayX's real "Fetch Balance" API (GET /v1/balance) — this is the
// current account backend/releasePayout.ts already pays stores out of
// (RAZORPAYX_ACCOUNT_NUMBER), so the number here is the same wallet that
// account actually holds, not a separate estimate.

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayBalance {
  configured: boolean;
  availableRupees: number | null;
}

function authHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not set.');
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

export async function fetchRazorpayBalance(): Promise<RazorpayBalance> {
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) return { configured: false, availableRupees: null };

  const res = await fetch(`${RAZORPAY_BASE}/balance?account_number=${encodeURIComponent(accountNumber)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`RazorpayX balance fetch failed (${res.status}).`);

  const data = (await res.json()) as { balance: number };
  return { configured: true, availableRupees: data.balance / 100 };
}
