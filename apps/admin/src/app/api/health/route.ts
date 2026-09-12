// SystemStatusBadge's real signal — two checks, both genuinely load-bearing
// for this dashboard:
//  - db: can we actually reach Supabase right now (a cheap real query, not
//    a ping) — every other page on this dashboard depends on this.
//  - razorpay: is a RazorpayX current account actually configured and
//    reachable (Balance card's own source, lib/razorpay/balance.ts) —
//    "not configured" counts as degraded, not down: the rest of the
//    dashboard works fine without it, only the Balance card is affected.
// The third signal (live sync) is the browser's own EventSource connection
// state (useAdminRealtime), not something this server route can see — the
// client combines that with this response.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchRazorpayBalance } from '@/lib/razorpay/balance';

export async function GET() {
  let dbOk = true;
  try {
    const { error } = await supabaseAdmin.from('zones').select('id').limit(1);
    if (error) throw error;
  } catch {
    dbOk = false;
  }

  let razorpayOk = true;
  try {
    const balance = await fetchRazorpayBalance();
    razorpayOk = balance.configured;
  } catch {
    razorpayOk = false;
  }

  return NextResponse.json({ dbOk, razorpayOk, checkedAt: new Date().toISOString() });
}
