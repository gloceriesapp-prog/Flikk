// Real, admin-editable platform config — currently just the commission
// rate (platform_settings singleton, migrations/039). Separate from
// lib/pricing.ts (deliberately DB-free "money math") and from
// delivery_settings (that table has a public read RLS policy every app
// needs at checkout — commission rate never should, see the migration's
// own note).

import { supabase } from '../db/supabase.js';
import { DEFAULT_COMMISSION_RATE } from './pricing.js';

// Read fresh on every checkout rather than cached in memory — a rate
// change from admin should apply to the very next order, not wait for a
// process restart or a cache-invalidation mechanism that doesn't exist yet.
// One extra indexed-by-PK row read per checkout is negligible next to the
// rest of the order-creation work already happening in the same request.
export async function getCommissionRate(): Promise<number> {
  const { data, error } = await supabase.from('platform_settings').select('commission_rate').limit(1).maybeSingle();
  if (error || !data) return DEFAULT_COMMISSION_RATE;
  return Number(data.commission_rate);
}
