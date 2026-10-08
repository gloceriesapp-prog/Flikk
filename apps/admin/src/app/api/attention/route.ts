// TopNav bell: what needs a human right now, as counts, each mapped to the
// page that resolves it. One SQL aggregate (admin_attention_counts,
// migration 118) instead of fetching every row to count it.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { ATTENTION_THRESHOLD_MINUTES } from '@/lib/mock-data';

export interface AttentionItem {
  key: string;
  label: string;
  count: number;
  href: string;
}

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'pendingStoreApplications', label: 'Store applications to review', href: '/approvals' },
  { key: 'pendingRiderApplications', label: 'Rider applications to review', href: '/approvals' },
  { key: 'pendingProducts', label: 'Products / photos awaiting approval', href: '/approvals' },
  { key: 'refundsNeedingAction', label: 'Refunds failed or needing manual action', href: '/refunds' },
  { key: 'openSupportTickets', label: 'Support requests waiting for a reply', href: '/support' },
  { key: 'stuckOrders', label: `Orders with no rider for ${ATTENTION_THRESHOLD_MINUTES}+ min`, href: '/orders' },
];

export async function GET() {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { data, error } = await supabaseAdmin.rpc('admin_attention_counts', { p_stuck_minutes: ATTENTION_THRESHOLD_MINUTES });
    if (error) throw error;
    const counts = (data ?? {}) as Record<string, number>;
    const items: AttentionItem[] = ITEMS.map((item) => ({ ...item, count: Number(counts[item.key] ?? 0) }));
    return NextResponse.json({ items, total: items.reduce((sum, item) => sum + item.count, 0) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load alerts.' }, { status: 500 });
  }
}
