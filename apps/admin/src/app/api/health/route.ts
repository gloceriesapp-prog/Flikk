// SystemStatusBadge's server-side signal: can we actually reach Supabase
// right now (a cheap real query, not a ping) — every page on this
// dashboard depends on it. Live sync is the browser's own EventSource
// state (useAdminRealtime), combined client-side.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  let dbOk = true;
  try {
    const { error } = await supabaseAdmin.from('zones').select('id').limit(1);
    if (error) throw error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json({ dbOk, checkedAt: new Date().toISOString() });
}
